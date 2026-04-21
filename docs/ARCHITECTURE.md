# Architecture Deep Dive

## System Architecture

```
                         ┌─────────────────────────────┐
                         │        Internet Users        │
                         └──────────────┬──────────────┘
                                        │ HTTPS
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │  CloudFront │    │  Route 53   │    │     WAF     │
             │    CDN      │    │  DNS/Routing│    │  DDoS/Bots  │
             └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
                             ┌──────────▼──────────┐
                             │  Application Load   │
                             │  Balancer (ALB)     │
                             │  Multi-AZ           │
                             └──────────┬──────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │   EC2 #1    │    │   EC2 #2    │    │   EC2 #N    │
             │  Node.js    │    │  Node.js    │    │  (scaled)   │
             └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                    └───────────────────┼───────────────────┘
                                        │ Auto Scaling Group
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │  RDS MySQL  │    │ ElastiCache │    │     S3      │
             │  Multi-AZ   │    │   Redis     │    │   Bucket    │
             └─────────────┘    └─────────────┘    └─────────────┘
                    │
             ┌──────▼──────────────────────────────────────┐
             │              CloudWatch                      │
             │  Metrics → Alarms → Auto Scaling Policies   │
             └──────┬──────────────────────────────────────┘
                    │
             ┌──────▼──────────────────────────────────────┐
             │         AI Demand Predictor                  │
             │  Prophet model → forecast → Lambda → ASG    │
             └─────────────────────────────────────────────┘
```

---

## Layer-by-Layer Breakdown

### Layer 1: Edge / DNS

**Route 53**
- Latency-based routing routes users to nearest healthy ALB endpoint
- Health checks: HTTP GET /health every 30s; failover in <60s
- Weighted routing enables blue-green traffic shifting

**CloudFront CDN**
- 400+ edge locations worldwide
- Caches: product images, JS/CSS bundles, static HTML
- Cache hit rate target: 70%+ — absorbs most read traffic before origin
- Two origins: S3 (static assets) + ALB (API + SSR)
- Signed URLs for private invoice downloads

**AWS WAF**
- Managed rule sets: AWSManagedRulesCommonRuleSet (OWASP Top 10)
- Rate limiting: block IPs > 2,000 req/min
- Bot Control: detect and block scraper bots during flash sales
- IP reputation lists: block known bad actors automatically

---

### Layer 2: Load Balancing

**Application Load Balancer**
- Layer 7 (HTTP/HTTPS) load balancing
- SSL termination: ACM certificate, TLS 1.3 enforced
- Round-robin across EC2 target group
- Health check: GET /health, 200 OK required
- Connection draining: 30s deregistration delay (graceful scale-in)
- Access logs → S3 for audit and analytics

**Why ALB over NLB?**
- ALB understands HTTP — enables path-based routing (`/api/*` vs `/assets/*`)
- Sticky sessions for shopping cart (optional, disabled in favour of Redis)
- Native integration with ASG target tracking

---

### Layer 3: Compute / Auto Scaling

**EC2 Instance Profile**
- Amazon Linux 2023, t3.medium (2 vCPU, 4 GB RAM)
- Node.js 20 runtime, PM2 cluster mode (2 workers per instance)
- Stateless: no local state — cart/session in Redis, files in S3

**Auto Scaling Group**
- Min: 2 (always on, multi-AZ)
- Max: 20
- Two target-tracking policies run simultaneously — whichever requires more instances wins:
  1. CPU target: 65% average
  2. Request count target: 1,000 req/min per instance
- Instance warm-up: 90 seconds (time for Node.js to start + DB pool to initialise)
- Health check grace period: 90 seconds
- Termination policy: OldestInstance first (keeps newest code running)

**Scaling math example:**
- Flash sale: 15,000 req/min incoming
- Per instance capacity: 1,000 req/min
- Required instances: ceil(15,000 / 1,000) = 15
- ASG scales to 15 within ~5 minutes (reactive) or pre-scales to 15 with AI (proactive)

---

### Layer 4: Data

**RDS MySQL 8.0 Multi-AZ**
- Primary in AZ-a, standby in AZ-b (synchronous replication)
- Automatic failover: DNS flips to standby in <60 seconds
- Read replica: separate endpoint for analytics queries
- Slow query log: queries > 2s logged to CloudWatch
- Parameter tuning: max_connections = 500, innodb_buffer_pool_size = 3G

**ElastiCache Redis 7.0**
- Used for:
  - Product catalog cache (TTL: 10 min) — avoids cold DB reads
  - User sessions (TTL: 24h) — survives EC2 scale-in
  - Flash sale inventory counters (atomic DECR) — prevents overselling
  - Rate-limit buckets per IP
- `DECR` command is atomic — no race conditions on inventory
- Snapshot every 3h for disaster recovery

**Amazon S3**
- Product images: served via CloudFront (zero egress cost)
- Invoices (PDF): private, signed URL download
- ALB access logs: retained 90 days
- Terraform state: versioned, encrypted

---

### Layer 5: AI Pre-Scaling

**Problem:** Reactive auto-scaling has a 3–5 minute lag:
1. Traffic rises → CPU climbs
2. CloudWatch alarm fires (after 2× 5-min periods = 10 min)
3. ASG launches instances (3–4 min to boot + warm up)
4. Total lag: **13–14 minutes** — during which checkout fails

**Solution: Prophet forecasting model**
- Trained on 12+ months of historical ALB request counts
- Learns patterns: daily peaks, weekly cycles, festival spikes
- Runs every 15 minutes via cron/EventBridge
- Forecasts 24 hours ahead at 5-minute resolution
- If peak > threshold in next 2 hours → pre-scale NOW

**Pre-scaling example:**
```
Friday 19:30 — AI predicts 12,000 req/min at 20:00 (sale starts)
Friday 19:45 — Lambda sets ASG desired = 12
Friday 20:00 — Instances already warm, sale starts smoothly
CPU stays at 42% throughout (vs 78% with reactive scaling)
```

---

### Layer 6: Monitoring / Observability

**CloudWatch Dashboard** (see monitoring-dashboard/)
- Widget 1: EC2 CPU (5-min avg, threshold annotation at 65%)
- Widget 2: ALB request count per 5 min
- Widget 3: ASG desired vs in-service count
- Widget 4: 5xx and 4xx error counts
- Widget 5: ALB response time P95 (SLA annotation at 500ms)
- Widget 6: RDS connections + CPU

**Alarms wired to SNS (email/Slack/PagerDuty):**
- High CPU (>80%, 10 min) → scale-out
- High 5xx errors (>50 in 1 min) → on-call alert
- RDS connections >400 → on-call alert
- Redis evictions > 0 → cache memory alert

---

## Resilience Scenarios

| Event | System Response | Recovery Time |
|-------|----------------|---------------|
| EC2 instance crash | ALB stops routing; ASG replaces instance | < 5 min |
| AZ outage | ASG launches in remaining AZ; RDS fails over to standby | < 2 min |
| RDS primary failure | Multi-AZ automatic failover | < 60 sec |
| Redis failure | App falls back to direct DB reads; degraded performance | Immediate |
| CloudFront outage | Traffic hits ALB directly; users still served | Immediate |
| Flash sale 15× spike | ASG scales out (reactive: 13 min, AI: 0 min lag) | 0 sec (AI) |
| Bad deploy | Instance refresh rolls back; ALB drains old instances | < 5 min |
| DDoS attack | WAF + Shield absorb; CloudFront limits origin exposure | Automatic |

---

## Security Posture

- **No direct SSH access** — SSM Session Manager only (no bastion host)
- **DB in private subnet** — unreachable from internet; EC2-only access
- **Secrets Manager** — DB credentials rotated automatically, never in env files
- **IAM least privilege** — EC2 role can only: read its own S3 bucket, get its own secret, write CloudWatch metrics
- **Encryption at rest** — RDS, S3, EBS all AES-256
- **Encryption in transit** — TLS 1.3 end-to-end; internal traffic via VPC
- **WAF** — OWASP Top 10, rate limiting, bot control
- **S3 Block Public Access** — all public access blocked; CloudFront OAC only

---

## Performance Targets

| Metric | Target | How achieved |
|--------|--------|-------------|
| Homepage TTFB | < 100ms | CloudFront edge cache |
| API response time (P95) | < 300ms | Redis cache + connection pooling |
| Checkout latency (P95) | < 500ms | Redis atomic inventory + DB transaction |
| Uptime | 99.9% | Multi-AZ ALB + RDS + ASG min=2 |
| Scale-out time | < 90s (AI-assisted) | Pre-warm instances before spike |
| Max concurrent users | 50,000+ | Horizontal scaling to 20 instances |
