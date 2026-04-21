# prod.tfvars — fill in your values before running terraform apply

aws_region          = "ap-south-1"
project             = "smart-ecommerce"
environment         = "prod"

# VPC
vpc_cidr            = "10.0.0.0/16"

# EC2 / ASG
ami_id              = "ami-0f58b397bc5c1f2e8"   # Amazon Linux 2023 ap-south-1
instance_type       = "t3.medium"
asg_min             = 2
asg_max             = 20
asg_desired         = 2

# RDS
db_instance_class   = "db.t3.medium"
db_name             = "ecommerce"
db_username         = "admin"
db_password         = "CHANGE_ME_STRONG_PASSWORD"   # ← replace

# Redis
redis_node_type     = "cache.t3.micro"

# Domain / SSL
domain_name         = "shop.yourdomain.com"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxx"   # ← replace
