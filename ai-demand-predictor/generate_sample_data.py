"""
generate_sample_data.py
Generate realistic synthetic e-commerce traffic data for model training.
Run: python generate_sample_data.py --days 365 --output data/historical_traffic.csv
"""

import argparse
import math
import random
from datetime import datetime, timedelta

import pandas as pd
import numpy as np

FLASH_SALE_DAYS = [
    # (month, day, multiplier)
    (10,  8,  8.0),   # Big Billion Day
    (11,  1,  7.0),   # Diwali Sale
    (11, 11,  6.0),   # Singles Day
    (12, 25,  4.0),   # Christmas Sale
    (1,   1,  3.5),   # New Year Sale
    (1,  26,  3.0),   # Republic Day Sale
    (3,  13,  3.0),   # Holi Sale
]


def base_traffic(dt: datetime) -> float:
    """Simulate realistic hourly traffic pattern."""
    hour = dt.hour
    dow  = dt.weekday()  # 0=Monday

    # Hourly curve: low at night, peaks at lunch (1 PM) and evening (8 PM)
    hourly = (
        0.1 + 0.9 * (
            0.5 * math.exp(-0.5 * ((hour - 13) / 3) ** 2) +
            0.8 * math.exp(-0.5 * ((hour - 20) / 2) ** 2) +
            0.2 * math.exp(-0.5 * ((hour - 10) / 3) ** 2)
        )
    )

    # Weekends are 30% busier
    weekend_boost = 1.3 if dow >= 5 else 1.0

    # Base requests per 5 min
    return 200 * hourly * weekend_boost


def apply_flash_sale(dt: datetime, value: float) -> float:
    for month, day, mult in FLASH_SALE_DAYS:
        if dt.month == month and dt.day == day:
            # Sale peaks between 8 PM and midnight
            if 18 <= dt.hour <= 23:
                ramp = (dt.hour - 18) / 5
                return value * (1 + (mult - 1) * ramp)
            elif dt.hour < 2:
                return value * mult * 0.8
    return value


def generate(days: int = 365) -> pd.DataFrame:
    start = datetime.utcnow() - timedelta(days=days)
    records = []
    t = start

    while t < datetime.utcnow():
        val = base_traffic(t)
        val = apply_flash_sale(t, val)
        # Add Gaussian noise ±15%
        val = max(0, val * np.random.normal(1.0, 0.15))
        records.append({"timestamp": t.strftime("%Y-%m-%dT%H:%M:%S"), "requests": int(val)})
        t += timedelta(minutes=5)

    return pd.DataFrame(records)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days",   type=int, default=365)
    parser.add_argument("--output", type=str, default="data/historical_traffic.csv")
    args = parser.parse_args()

    import os
    os.makedirs(os.path.dirname(args.output) if os.path.dirname(args.output) else ".", exist_ok=True)

    df = generate(args.days)
    df.to_csv(args.output, index=False)
    print(f"Generated {len(df)} rows → {args.output}")
    print(f"Date range: {df['timestamp'].iloc[0]} → {df['timestamp'].iloc[-1]}")
    print(f"Avg requests/5min: {df['requests'].mean():.0f}")
    print(f"Peak requests/5min: {df['requests'].max()}")
