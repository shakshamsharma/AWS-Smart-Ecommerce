# AI Demand Predictor

Time-series traffic forecasting using Facebook Prophet — pre-scales EC2 instances **before** the spike hits.

## How it works

1. Fetches 30 days of ALB request-count data from CloudWatch (or loads a CSV)
2. Trains a Prophet model with daily, weekly, and yearly seasonality + Indian festival holidays
3. Forecasts the next 24 hours at 5-minute resolution
4. Computes required EC2 count based on predicted peak
5. Sets ASG `DesiredCapacity` 15 minutes before the expected peak

## Quick start

```bash
pip install -r requirements.txt

# Generate synthetic training data (optional)
python generate_sample_data.py --days 365 --output data/historical_traffic.csv

# Train and forecast using CSV
python predict.py --data data/historical_traffic.csv --horizon-hours 24 --dry-run

# Use live CloudWatch data
python predict.py --horizon-hours 24

# Output is saved to forecast_output.json
```

## Scheduling (cron)

Run every 15 minutes via cron or EventBridge:

```
*/15 * * * * /usr/bin/python3 /opt/ai-predictor/predict.py >> /var/log/ai-predictor.log 2>&1
```

Or as an EventBridge Scheduler → Lambda:

```json
{
  "ScheduleExpression": "rate(15 minutes)",
  "Target": { "Arn": "arn:aws:lambda:...:function:ai-predictor" }
}
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `AWS_REGION` | ap-south-1 | AWS region |
| `ASG_NAME` | smart-ecommerce-asg-prod | Auto Scaling Group name |
| `ALB_ARN_SUFFIX` | — | ALB ARN suffix for CW metrics |
| `SNS_TOPIC_ARN` | — | SNS topic for scale notifications |

## Key constants (predict.py)

```python
REQUESTS_PER_INSTANCE = 600   # req/min each EC2 handles comfortably
PRE_SCALE_MINUTES     = 15    # how early to pre-warm
MIN_INSTANCES         = 2
MAX_INSTANCES         = 20
```
