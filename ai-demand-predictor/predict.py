"""
AI Demand Predictor — Smart Pre-Scaling Engine
Uses Facebook Prophet for time-series traffic forecasting.
Integrates with AWS Auto Scaling to pre-warm instances before traffic spikes.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timedelta

import boto3
import pandas as pd
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── AWS clients ───────────────────────────────────────────────────────────────
REGION      = os.getenv("AWS_REGION", "ap-south-1")
ASG_NAME    = os.getenv("ASG_NAME", "smart-ecommerce-asg-prod")
CW_NS       = "EcommerceApp"
SNS_TOPIC   = os.getenv("SNS_TOPIC_ARN", "")

asg_client = boto3.client("autoscaling", region_name=REGION)
cw_client  = boto3.client("cloudwatch",  region_name=REGION)
sns_client = boto3.client("sns",         region_name=REGION) if SNS_TOPIC else None


# ── Data loading ──────────────────────────────────────────────────────────────

def load_historical_traffic(csv_path: str) -> pd.DataFrame:
    """
    Load historical request-count data.
    CSV must have columns: timestamp (ISO-8601), requests (integer).
    """
    df = pd.read_csv(csv_path, parse_dates=["timestamp"])
    df = df.rename(columns={"timestamp": "ds", "requests": "y"})
    df = df.dropna().sort_values("ds").reset_index(drop=True)
    log.info(f"Loaded {len(df)} rows from {csv_path}")
    return df


def fetch_cloudwatch_traffic(hours: int = 24 * 30) -> pd.DataFrame:
    """Fetch real ALB request counts from CloudWatch (last N hours)."""
    end   = datetime.utcnow()
    start = end - timedelta(hours=hours)

    resp = cw_client.get_metric_statistics(
        Namespace="AWS/ApplicationELB",
        MetricName="RequestCount",
        Dimensions=[{"Name": "LoadBalancer", "Value": os.getenv("ALB_ARN_SUFFIX", "")}],
        StartTime=start,
        EndTime=end,
        Period=300,          # 5-minute resolution
        Statistics=["Sum"],
    )

    points = sorted(resp["Datapoints"], key=lambda x: x["Timestamp"])
    df = pd.DataFrame([{"ds": p["Timestamp"], "y": p["Sum"]} for p in points])
    log.info(f"Fetched {len(df)} CloudWatch datapoints")
    return df


# ── Model training ────────────────────────────────────────────────────────────

def train_model(df: pd.DataFrame) -> Prophet:
    """
    Train a Prophet model with e-commerce-specific seasonalities.
    - Daily: morning browse spike, evening purchase spike
    - Weekly: weekend vs weekday patterns
    - Yearly: festival seasons (Diwali, Christmas, etc.)
    """
    model = Prophet(
        changepoint_prior_scale=0.15,   # flex for sudden trend changes (flash sales)
        seasonality_prior_scale=10,
        holidays_prior_scale=10,
        seasonality_mode="multiplicative",  # traffic multiplies, not adds
        interval_width=0.95,
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=True,
    )

    # Add Indian festival holidays as special events
    festivals = pd.DataFrame({
        "holiday": [
            "diwali_sale", "big_billion_day", "republic_day_sale",
            "holi_sale", "eid_sale", "christmas_sale", "new_year_sale",
        ],
        "ds": pd.to_datetime([
            "2024-11-01", "2024-10-08", "2025-01-24",
            "2025-03-13", "2025-03-30", "2024-12-25", "2025-01-01",
        ]),
        "lower_window": [-1, -2, -1, -1, -1, -2, -2],
        "upper_window": [3,   3,   1,   1,   1,   2,   2],
    })
    model.add_country_holidays(country_name="IN")
    model.add_seasonality(name="monthly", period=30.5, fourier_order=5)

    model.fit(df)
    log.info("Model training complete")
    return model


# ── Prediction ────────────────────────────────────────────────────────────────

def predict(model: Prophet, horizon_hours: int = 24) -> pd.DataFrame:
    """Generate a forecast for the next N hours at 5-minute resolution."""
    periods = horizon_hours * 12  # 12 × 5-min slots per hour
    future  = model.make_future_dataframe(periods=periods, freq="5min")
    forecast = model.predict(future)
    result   = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(periods)
    result   = result.rename(columns={"yhat": "predicted_requests"})
    return result


# ── Auto Scaling decisions ────────────────────────────────────────────────────

# Empirical: instances needed per 1000 req/min
REQUESTS_PER_INSTANCE = 600
MIN_INSTANCES = 2
MAX_INSTANCES = 20
PRE_SCALE_MINUTES = 15   # scale this many minutes before predicted spike


def compute_desired_capacity(predicted_requests_per_5min: float) -> int:
    """Convert predicted request volume to required EC2 count."""
    per_minute = predicted_requests_per_5min / 5
    needed = max(MIN_INSTANCES, int(per_minute / REQUESTS_PER_INSTANCE) + 1)
    return min(needed, MAX_INSTANCES)


def get_current_capacity() -> dict:
    resp = asg_client.describe_auto_scaling_groups(AutoScalingGroupNames=[ASG_NAME])
    asg  = resp["AutoScalingGroups"][0]
    return {
        "desired": asg["DesiredCapacity"],
        "min":     asg["MinSize"],
        "max":     asg["MaxSize"],
    }


def apply_scaling_decision(desired: int, reason: str, dry_run: bool = False):
    current = get_current_capacity()
    if desired == current["desired"]:
        log.info(f"No change needed — current desired = {desired}")
        return

    direction = "OUT ↑" if desired > current["desired"] else "IN ↓"
    log.info(f"Scale {direction}: {current['desired']} → {desired}  ({reason})")

    if not dry_run:
        asg_client.set_desired_capacity(
            AutoScalingGroupName=ASG_NAME,
            DesiredCapacity=desired,
            HonorCooldown=False,   # Override cooldown for AI-predicted events
        )
        _publish_metric("AIScaleEvent", desired, unit="Count")
        _notify(f"[AI Pre-Scaler] Scale {direction}: {current['desired']} → {desired}\nReason: {reason}")
    else:
        log.info("DRY RUN — no actual scale action taken")


def _publish_metric(name: str, value: float, unit: str = "None"):
    cw_client.put_metric_data(
        Namespace=CW_NS,
        MetricData=[{
            "MetricName": name,
            "Value":       value,
            "Unit":        unit,
            "Timestamp":   datetime.utcnow(),
        }],
    )


def _notify(message: str):
    if sns_client and SNS_TOPIC:
        sns_client.publish(
            TopicArn=SNS_TOPIC,
            Subject="[Smart E-Commerce] AI Pre-Scaler",
            Message=message,
        )


# ── Main workflow ─────────────────────────────────────────────────────────────

def run(args):
    # 1. Load data
    if args.data:
        df = load_historical_traffic(args.data)
    else:
        df = fetch_cloudwatch_traffic(hours=args.history_hours)

    if len(df) < 100:
        log.warning("Too little data for reliable forecasting (<100 points)")

    # 2. Train
    model = train_model(df)

    # 3. Predict next N hours
    forecast = predict(model, horizon_hours=args.horizon_hours)

    # 4. Find peak in next PRE_SCALE_MINUTES to 2h window
    now       = pd.Timestamp.utcnow()
    lookahead = now + timedelta(minutes=PRE_SCALE_MINUTES + 120)
    window    = forecast[(forecast["ds"] >= now) & (forecast["ds"] <= lookahead)]

    if window.empty:
        log.warning("Forecast window is empty — no action")
        return

    peak_row     = window.loc[window["predicted_requests"].idxmax()]
    peak_time    = peak_row["ds"]
    peak_req     = peak_row["predicted_requests"]
    desired      = compute_desired_capacity(peak_req)

    log.info(f"Peak predicted: {peak_req:.0f} req/5min at {peak_time} → need {desired} instances")

    # 5. Save forecast to JSON (for dashboard)
    out_path = args.output or "forecast_output.json"
    forecast_json = forecast.copy()
    forecast_json["ds"] = forecast_json["ds"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(out_path, "w") as f:
        json.dump({
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "peak_time":    str(peak_time),
            "peak_requests": round(peak_req, 1),
            "recommended_instances": desired,
            "forecast": forecast_json.to_dict(orient="records"),
        }, f, indent=2)
    log.info(f"Forecast saved to {out_path}")

    # 6. Apply scaling decision
    apply_scaling_decision(
        desired=desired,
        reason=f"AI forecast: {peak_req:.0f} req/5min peak at {peak_time}",
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Traffic Predictor & Pre-Scaler")
    parser.add_argument("--data",          type=str,  help="Path to historical CSV (ds, y)")
    parser.add_argument("--history-hours", type=int,  default=720,  help="Hours of CW history to fetch")
    parser.add_argument("--horizon-hours", type=int,  default=24,   help="Hours ahead to forecast")
    parser.add_argument("--output",        type=str,  default="forecast_output.json")
    parser.add_argument("--dry-run",       action="store_true", help="Print decision without executing")
    args = parser.parse_args()
    run(args)
