# ── RDS MySQL Multi-AZ ────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.project}/${var.environment}/db-credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    engine   = "mysql"
    host     = aws_db_instance.main.address
    port     = 3306
    dbname   = var.db_name
  })
}

resource "aws_db_instance" "main" {
  identifier              = "${var.project}-rds-${var.environment}"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 100
  max_allocated_storage   = 1000
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  multi_az                = true
  publicly_accessible     = false
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = "${var.project}-final-snapshot"
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  deletion_protection     = var.environment == "prod"
  performance_insights_enabled = true

  parameter_group_name = aws_db_parameter_group.main.name

  tags = { Name = "${var.project}-rds-${var.environment}" }
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.project}-pg-${var.environment}"
  family = "mysql8.0"

  parameter {
    name  = "slow_query_log"
    value = "1"
  }
  parameter {
    name  = "long_query_time"
    value = "2"
  }
  parameter {
    name  = "max_connections"
    value = "500"
  }
}

# Read replica for analytics / reporting
resource "aws_db_instance" "read_replica" {
  count               = var.environment == "prod" ? 1 : 0
  identifier          = "${var.project}-rds-replica-${var.environment}"
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.db_instance_class
  publicly_accessible = false
  skip_final_snapshot = true
  storage_encrypted   = true

  tags = { Name = "${var.project}-rds-replica" }
}

# ── ElastiCache Redis ─────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project}-redis-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  snapshot_retention_limit = 3
  snapshot_window          = "05:00-06:00"

  tags = { Name = "${var.project}-redis-${var.environment}" }
}
