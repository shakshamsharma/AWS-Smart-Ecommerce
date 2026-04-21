#!/usr/bin/env python3
"""
apply_scaling_policies.py
Applies all scaling policies defined in scaling_policies.json to the ASG.
Usage: python apply_scaling_policies.py --asg-name smart-ecommerce-asg-prod
"""

import argparse
import json
import boto3

def main(asg_name: str, alb_arn_suffix: str, region: str):
    asg = boto3.client("autoscaling", region_name=region)

    with open("scaling_policies.json") as f:
        config = json.load(f)

    for policy in config["policies"]:
        if policy["type"] == "TargetTrackingScaling":
            metric_spec = {
                "PredefinedMetricSpecification": {
                    "PredefinedMetricType": policy["metric"],
                }
            }
            if policy["metric"] == "ALBRequestCountPerTarget":
                metric_spec["PredefinedMetricSpecification"]["ResourceLabel"] = alb_arn_suffix

            resp = asg.put_scaling_policy(
                AutoScalingGroupName=asg_name,
                PolicyName=policy["name"],
                PolicyType="TargetTrackingScaling",
                TargetTrackingConfiguration={
                    **metric_spec,
                    "TargetValue": policy["target_value"],
                    "DisableScaleIn": False,
                },
            )
            print(f"✓ {policy['name']} → {resp['PolicyARN']}")

        elif policy["type"] == "ScheduledScaling":
            asg.put_scheduled_update_group_action(
                AutoScalingGroupName=asg_name,
                ScheduledActionName=policy["name"],
                Recurrence=policy["schedule"],
                MinSize=policy["min_size"],
                MaxSize=policy["max_size"],
                DesiredCapacity=policy["desired_capacity"],
            )
            print(f"✓ Scheduled action: {policy['name']} ({policy['schedule']})")

    # Apply warmup settings
    warmup = config["warmup"]
    asg.update_auto_scaling_group(
        AutoScalingGroupName=asg_name,
        DefaultInstanceWarmup=warmup["default_instance_warmup"],
        HealthCheckGracePeriod=warmup["health_check_grace_period"],
    )
    print(f"✓ Instance warmup set to {warmup['default_instance_warmup']}s")
    print("All policies applied successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--asg-name",       required=True)
    parser.add_argument("--alb-arn-suffix",  default="")
    parser.add_argument("--region",          default="ap-south-1")
    args = parser.parse_args()
    main(args.asg_name, args.alb_arn_suffix, args.region)
