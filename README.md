# AWS Smart E-Commerce Infrastructure — Cloud Architecture Simulation

A learning-focused AWS cloud infrastructure project designed to demonstrate how a scalable e-commerce application can be planned, deployed, monitored, and optimized using core AWS services.

This project focuses on cloud architecture, auto-scaling concepts, load balancing, monitoring workflows, deployment planning, and backend infrastructure design.

---

## 📌 Project Overview

This project represents a simulated e-commerce infrastructure built around AWS cloud services.  
The goal is to understand how modern cloud-based applications handle traffic, store data, manage security, monitor performance, and scale infrastructure based on demand.

The frontend can be deployed separately using platforms like Vercel for public access, while the AWS architecture demonstrates how the backend and infrastructure can be hosted and managed using cloud services.

---

## 🏗 Architecture Overview

```txt
User
  ↓
Frontend / Web Application
  ↓
Application Load Balancer
  ↓
EC2 Instances inside Auto Scaling Group
  ↓
Backend API / Application Layer
  ↓
RDS Database + S3 Storage
  ↓
CloudWatch Monitoring

☁️ AWS Services Used / Studied
EC2 — Virtual server hosting for backend/application layer
Auto Scaling Group — Dynamic scaling based on traffic/load
Elastic Load Balancer — Distributes traffic across EC2 instances
S3 — Object storage for static assets, files, and backups
RDS — Managed relational database service
IAM — User permissions, roles, and access control
VPC — Network isolation and cloud infrastructure setup
CloudWatch — Monitoring, logs, metrics, and alerts
CloudFront — CDN concept for faster content delivery
Route 53 — DNS routing concept

🧰 Tech Stack
Cloud & DevOps
AWS EC2
AWS S3
AWS RDS
AWS IAM
AWS VPC
Auto Scaling
Elastic Load Balancer
CloudWatch
CloudFront
Docker
Linux
Application
React.js
Node.js
Express.js
REST APIs
Tools
Git
GitHub
VS Code
Postman

📁 Project Structure

AWS-Smart-Ecommerce/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── package.json
│
├── docs/
│   ├── architecture-overview.md
│   ├── aws-services-used.md
│   └── deployment-notes.md
│
├── diagrams/
│   └── aws-architecture.png
│
├── README.md
└── .gitignore

🚀 Key Features
Designed scalable e-commerce cloud architecture using AWS services
Planned EC2-based backend hosting with Auto Scaling and Load Balancing
Used S3 storage concepts for static files and application assets
Used RDS concepts for structured database management
Applied IAM-based access control and cloud security best practices
Used CloudWatch concepts for infrastructure monitoring and logs
Documented cloud deployment workflow and architecture design
Built frontend and backend structure for an e-commerce application

🔄 Auto Scaling Workflow

Traffic increases
  ↓
CloudWatch monitors CPU / request metrics
  ↓
Auto Scaling Group triggers scaling policy
  ↓
New EC2 instances are launched
  ↓
Load Balancer distributes traffic
  ↓
Application remains available during higher load

📊 Monitoring Workflow

Application / EC2 Resources
  ↓
CloudWatch Metrics
  ↓
Logs and Performance Monitoring
  ↓
Alerts / Scaling Decisions
  ↓
Infrastructure Optimization

🔐 Security Concepts
IAM roles and permissions
VPC-based network isolation
Security groups for traffic control
Restricted access to cloud resources
Environment variable based configuration
Basic cloud security best practices
📚 What I Learned

Through this project, I learned:

How AWS EC2 can be used for application hosting
How Auto Scaling Groups support dynamic traffic handling
How Elastic Load Balancer improves availability
How S3 and RDS are used in cloud-based applications
How IAM roles and VPC improve security and access control
How CloudWatch helps in monitoring infrastructure
How cloud deployment workflows are planned and documented
How scalable backend systems are structured for real-world applications
🧪 Project Status

This project is a learning-focused cloud architecture simulation created as part of my AWS Cloud Computing training.

It demonstrates AWS infrastructure planning, service usage, deployment concepts, and scalability workflows.
It is not presented as a live production system.

📌 Resume Summary

Built an AWS-based e-commerce infrastructure project to understand EC2 hosting, Auto Scaling, Load Balancing, CloudWatch monitoring, and scalable cloud deployment workflows.

👨‍💻 Author

Saksham Sharma
Cloud Computing | DevOps | Backend Systems | AI Integration
