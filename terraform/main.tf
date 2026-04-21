terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "my-ecommerce-tfstate"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "SmartEcommerce"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Application Load Balancer ─────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${var.project}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb-logs"
    enabled = true
  }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project}-tg-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  stickiness {
    type    = "lb_cookie"
    enabled = false
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── Auto Scaling Group ────────────────────────────────────────────────────────

resource "aws_launch_template" "app" {
  name_prefix   = "${var.project}-lt-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2.arn
  }

  vpc_security_group_ids = [aws_security_group.ec2.id]

  user_data = base64encode(templatefile("${path.module}/scripts/user_data.sh", {
    environment   = var.environment
    db_host       = aws_db_instance.main.address
    redis_host    = aws_elasticache_cluster.main.cache_nodes[0].address
    s3_bucket     = aws_s3_bucket.assets.id
    db_secret_arn = aws_secretsmanager_secret.db.arn
  }))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project}-ec2-${var.environment}"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.project}-asg-${var.environment}"
  desired_capacity    = var.asg_desired
  min_size            = var.asg_min
  max_size            = var.asg_max
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 90

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 90
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project}-ec2-${var.environment}"
    propagate_at_launch = true
  }
}

# Scale-out policy (CPU)
resource "aws_autoscaling_policy" "scale_out_cpu" {
  name                   = "${var.project}-scale-out-cpu"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 65.0
  }
}

# Scale-out policy (Request count)
resource "aws_autoscaling_policy" "scale_out_requests" {
  name                   = "${var.project}-scale-out-requests"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value = 1000.0
  }
}
