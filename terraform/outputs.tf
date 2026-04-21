output "alb_dns_name"        { value = aws_lb.main.dns_name }
output "cloudfront_domain"   { value = aws_cloudfront_distribution.main.domain_name }
output "rds_endpoint"        { value = aws_db_instance.main.address }
output "redis_endpoint"      { value = aws_elasticache_cluster.main.cache_nodes[0].address }
output "s3_assets_bucket"    { value = aws_s3_bucket.assets.id }
output "asg_name"            { value = aws_autoscaling_group.app.name }
output "vpc_id"              { value = aws_vpc.main.id }
