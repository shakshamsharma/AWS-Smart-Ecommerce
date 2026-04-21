# Deployment Guide

Step-by-step instructions to deploy the full AWS Smart Auto-Scaling E-Commerce Infrastructure from scratch.

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| AWS CLI | 2.x | `brew install awscli` / [docs](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| Terraform | 1.5+ | `brew install terraform` |
| Node.js | 18+ | `brew install node` |
| Python | 3.10+ | `brew install python` |
| Docker | 24+ | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Git | any | pre-installed |

## Step 1 — AWS Account Setup

### 1.1 Configure AWS CLI
```bash
aws configure
# AWS Access Key ID:     <your key>
# AWS Secret Access Key: <your secret>
# Default region:        ap-south-1
# Default output format: json
```

### 1.2 Create S3 bucket for Terraform state
```bash
aws s3 mb s3://my-ecommerce-tfstate --region ap-south-1
aws s3api put-bucket-versioning \
  --bucket my-ecommerce-tfstate \
  --versioning-configuration Status=Enabled
```

### 1.3 Create ECR repository for Docker images
```bash
aws ecr create-repository \
  --repository-name smart-ecommerce-backend \
  --region ap-south-1
```

### 1.4 Request ACM Certificate (HTTPS)
```bash
# Must be in us-east-1 for CloudFront
aws acm request-certificate \
  --domain-name shop.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```
Validate via DNS (add the CNAME record your registrar). Copy the ARN once issued.

---

## Step 2 — Infrastructure Deployment (Terraform)

### 2.1 Fill in variables
```bash
cd terraform
cp prod.tfvars prod.tfvars.local
# Edit prod.tfvars.local with your real values:
# - ami_id (find Amazon Linux 2023 AMI for your region)
# - db_password (strong password)
# - domain_name
# - acm_certificate_arn (from Step 1.4)
```

### 2.2 Deploy
```bash
terraform init
terraform plan  -var-file="prod.tfvars.local"
terraform apply -var-file="prod.tfvars.local"
```

Terraform will create (in order):
1. VPC, subnets, route tables, NAT gateways
2. Security groups
3. RDS MySQL Multi-AZ instance
4. ElastiCache Redis cluster
5. S3 buckets (assets + logs)
6. IAM roles and policies
7. EC2 Launch Template + Auto Scaling Group
8. Application Load Balancer + target group
9. CloudFront distribution + WAF
10. CloudWatch alarms + dashboard
11. SNS topic for alerts

Typical deploy time: **15–25 minutes** (RDS takes longest).

### 2.3 Note the outputs
```bash
terraform output
# alb_dns_name        = "smart-ecommerce-alb-prod-xxxx.ap-south-1.elb.amazonaws.com"
# cloudfront_domain   = "dxxxxxxxxxx.cloudfront.net"
# rds_endpoint        = "smart-ecommerce-rds-prod.xxxx.ap-south-1.rds.amazonaws.com"
# redis_endpoint      = "smart-ecommerce-redis-prod.xxxx.cfg.apsouth1.cache.amazonaws.com"
# s3_assets_bucket    = "smart-ecommerce-assets-prod-123456789012"
# asg_name            = "smart-ecommerce-asg-prod"
```

---

## Step 3 — Database Initialisation

SSH into an EC2 instance via AWS Systems Manager (no SSH key needed):
```bash
aws ssm start-session --target <instance-id> --region ap-south-1
```

Or run migrations from your local machine with an SSH tunnel:
```bash
# Set env vars from terraform output
export DB_HOST=<rds_endpoint>
export DB_USER=admin
export DB_PASS=<your_password>
export DB_NAME=ecommerce

cd backend
npm install
npm run migrate   # Creates all tables
npm run seed      # Inserts categories, products, admin user
```

---

## Step 4 — Backend Deployment

### 4.1 Build and push Docker image
```bash
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/smart-ecommerce-backend"

aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin "$AWS_ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com"

docker build -t smart-ecommerce-backend backend/
docker tag  smart-ecommerce-backend:latest "$ECR_URI:latest"
docker push "$ECR_URI:latest"
```

### 4.2 Trigger instance refresh (rolling deploy)
```bash
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name smart-ecommerce-asg-prod \
  --preferences '{"MinHealthyPercentage": 50, "InstanceWarmup": 90}'
```

---

## Step 5 — Frontend Deployment

```bash
cd frontend
npm install

# Set your CloudFront domain or custom domain
REACT_APP_API_URL=https://shop.yourdomain.com/api npm run build

# Upload to S3
aws s3 sync build/ s3://<s3_assets_bucket> \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html"

aws s3 cp build/index.html s3://<s3_assets_bucket>/index.html \
  --cache-control "no-cache"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution_id> \
  --paths "/*"
```

---

## Step 6 — AI Predictor Setup

```bash
cd ai-demand-predictor
pip install -r requirements.txt

# Generate sample training data
python generate_sample_data.py --days 365 --output data/historical_traffic.csv

# Test forecast (dry run — no actual scaling)
python predict.py \
  --data data/historical_traffic.csv \
  --horizon-hours 24 \
  --dry-run

# Set up cron job to run every 15 minutes
crontab -e
# Add: */15 * * * * /usr/bin/python3 /opt/ai-predictor/predict.py >> /var/log/ai-predictor.log 2>&1
```

---

## Step 7 — Apply Scaling Policies

```bash
cd autoscaling-policy

# Get ALB ARN suffix from terraform output or console
ALB_SUFFIX="app/smart-ecommerce-alb-prod/xxxx/targetgroup/smart-ecommerce-tg-prod/xxxx"

python apply_scaling_policies.py \
  --asg-name smart-ecommerce-asg-prod \
  --alb-arn-suffix "$ALB_SUFFIX"
```

---

## Step 8 — CI/CD Setup (GitHub Actions)

Add these secrets to your GitHub repository (Settings → Secrets):

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `S3_ASSETS_BUCKET` | Bucket name from terraform output |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID |
| `REACT_APP_API_URL` | `https://shop.yourdomain.com/api` |

Every push to `main` will:
1. Run tests
2. Build Docker image → push to ECR
3. Deploy frontend → S3 + CloudFront invalidation
4. Trigger ASG rolling instance refresh

---

## Step 9 — DNS Setup

Point your domain to CloudFront:
```
shop.yourdomain.com  →  CNAME  →  dxxxxxxxxxx.cloudfront.net
```

---

## Verification Checklist

```bash
# Health check
curl https://shop.yourdomain.com/health

# Expected response:
# {"status":"healthy","uptime":42,"timestamp":"...","instance":"i-xxxx"}

# Test auto-scaling alarm
aws cloudwatch set-alarm-state \
  --alarm-name smart-ecommerce-high-cpu \
  --state-value ALARM \
  --state-reason "Manual test"

# Watch ASG respond
watch -n 5 'aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names smart-ecommerce-asg-prod \
  --query "AutoScalingGroups[0].{Desired:DesiredCapacity,Min:MinSize,Max:MaxSize,Instances:length(Instances)}"'
```

---

## Cost Estimate (ap-south-1, minimal setup)

| Service | Spec | Monthly Cost (USD) |
|---------|------|-------------------|
| EC2 (2× t3.medium) | On-demand | ~$60 |
| RDS MySQL (db.t3.medium Multi-AZ) | — | ~$80 |
| ElastiCache (cache.t3.micro) | — | ~$15 |
| ALB | ~1M requests | ~$20 |
| CloudFront | ~10 GB transfer | ~$5 |
| S3 | ~50 GB | ~$2 |
| NAT Gateway | 2 AZs | ~$65 |
| **Total** | | **~$247/month** |

> Scale-in during off-peak hours reduces EC2 costs by 40–60%.
> Use Spot Instances for non-critical workers to save another 60–70%.

---

## Teardown

```bash
cd terraform
terraform destroy -var-file="prod.tfvars.local"
```

> Note: RDS final snapshot and S3 buckets with `prevent_destroy` require manual deletion.
