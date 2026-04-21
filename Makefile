.PHONY: dev up down migrate seed test build deploy-tf

# ── Local Development ──────────────────────────────────────────────────────────

dev:
	docker-compose up --build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f backend

migrate:
	docker-compose exec backend node src/utils/migrate.js

seed:
	docker-compose exec backend node src/utils/seed.js

# ── Testing ────────────────────────────────────────────────────────────────────

test:
	cd backend && npm test

test-coverage:
	cd backend && npm test -- --coverage

# ── AI Predictor ───────────────────────────────────────────────────────────────

ai-data:
	cd ai-demand-predictor && python generate_sample_data.py --days 365

ai-predict:
	cd ai-demand-predictor && python predict.py \
		--data data/historical_traffic.csv \
		--dry-run

# ── Terraform ──────────────────────────────────────────────────────────────────

tf-init:
	cd terraform && terraform init

tf-plan:
	cd terraform && terraform plan -var-file="prod.tfvars.local"

tf-apply:
	cd terraform && terraform apply -var-file="prod.tfvars.local"

tf-destroy:
	cd terraform && terraform destroy -var-file="prod.tfvars.local"

# ── Scaling policies ───────────────────────────────────────────────────────────

apply-policies:
	cd autoscaling-policy && python apply_scaling_policies.py \
		--asg-name smart-ecommerce-asg-prod

# ── Build ──────────────────────────────────────────────────────────────────────

build-frontend:
	cd frontend && npm run build

build-docker:
	docker build -t smart-ecommerce-backend backend/

# ── Help ───────────────────────────────────────────────────────────────────────

help:
	@echo "Available targets:"
	@echo "  make dev          — start all services locally"
	@echo "  make migrate      — run DB migrations"
	@echo "  make seed         — seed test data"
	@echo "  make test         — run backend tests"
	@echo "  make ai-predict   — run AI predictor (dry run)"
	@echo "  make tf-plan      — preview infrastructure changes"
	@echo "  make tf-apply     — deploy infrastructure"
	@echo "  make build-docker — build backend Docker image"
