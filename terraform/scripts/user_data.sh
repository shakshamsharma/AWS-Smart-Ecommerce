#!/bin/bash
set -e

# ── System setup ──────────────────────────────────────────────────────────────
yum update -y
yum install -y nodejs npm git amazon-cloudwatch-agent

# ── Fetch DB credentials from Secrets Manager ─────────────────────────────────
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "${db_secret_arn}" \
  --region "$(curl -s http://169.254.169.254/latest/meta-data/placement/region)" \
  --query SecretString --output text)

DB_HOST=$(echo $SECRET | python3 -c "import sys,json; print(json.load(sys.stdin)['host'])")
DB_USER=$(echo $SECRET | python3 -c "import sys,json; print(json.load(sys.stdin)['username'])")
DB_PASS=$(echo $SECRET | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")
DB_NAME=$(echo $SECRET | python3 -c "import sys,json; print(json.load(sys.stdin)['dbname'])")

# ── Write environment file ────────────────────────────────────────────────────
cat > /etc/ecommerce.env <<EOF
NODE_ENV=${environment}
PORT=3000
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
REDIS_HOST=${redis_host}
REDIS_PORT=6379
S3_BUCKET=${s3_bucket}
AWS_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
EOF

# ── Clone / deploy app ────────────────────────────────────────────────────────
cd /opt
git clone https://github.com/your-org/aws-smart-ecommerce.git app
cd app/backend
npm ci --production
chown -R ec2-user:ec2-user /opt/app

# ── Systemd service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/ecommerce.service <<UNIT
[Unit]
Description=E-Commerce API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/app/backend
EnvironmentFile=/etc/ecommerce.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable ecommerce
systemctl start ecommerce

# ── CloudWatch Agent ──────────────────────────────────────────────────────────
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<CWJSON
{
  "metrics": {
    "namespace": "EcommerceApp",
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["disk_used_percent"], "resources": ["/"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [{
          "file_path": "/var/log/ecommerce/app.log",
          "log_group_name": "/ecommerce/${environment}/app",
          "log_stream_name": "{instance_id}"
        }]
      }
    }
  }
}
CWJSON

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
