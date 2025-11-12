# Production Deployment Guide

This guide covers deploying Content Factory to production environments.

## Pre-Deployment Checklist

- [ ] Environment variables configured for production
- [ ] MongoDB Atlas cluster set up
- [ ] Managed Redis instance configured
- [ ] Google Gemini API key with sufficient quota
- [ ] Domain name registered (optional)
- [ ] SSL certificates ready (if not using managed service)
- [ ] Docker images tested locally
- [ ] Backup strategy in place

## Deployment Options

### Option 1: Google Cloud Platform (Recommended)

#### Services Used:
- **Cloud Run**: API Gateway and Frontend
- **Cloud Run Jobs**: Worker Process
- **Memorystore (Redis)**: Queue Management
- **MongoDB Atlas**: Database (external)

#### Step-by-Step Deployment

**1. Set Up GCP Project**

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable redis.googleapis.com
```

**2. Create Memorystore Redis Instance**

```bash
gcloud redis instances create content-factory-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

Get Redis host:
```bash
gcloud redis instances describe content-factory-redis --region=us-central1
```

**3. Build and Push Docker Images**

```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build and push API
docker build -f Dockerfile.api -t gcr.io/YOUR_PROJECT_ID/content-factory-api:latest .
docker push gcr.io/YOUR_PROJECT_ID/content-factory-api:latest

# Build and push Worker
docker build -f Dockerfile.worker -t gcr.io/YOUR_PROJECT_ID/content-factory-worker:latest .
docker push gcr.io/YOUR_PROJECT_ID/content-factory-worker:latest

# Build and push Client
cd client
docker build -t gcr.io/YOUR_PROJECT_ID/content-factory-client:latest .
docker push gcr.io/YOUR_PROJECT_ID/content-factory-client:latest
cd ..
```

**4. Deploy API to Cloud Run**

```bash
gcloud run deploy content-factory-api \
  --image gcr.io/YOUR_PROJECT_ID/content-factory-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production,PORT=8080,MONGODB_URI=YOUR_MONGODB_URI,REDIS_HOST=YOUR_REDIS_IP,REDIS_PORT=6379,GEMINI_API_KEY=YOUR_API_KEY,FRONTEND_URL=https://your-client-url.run.app"
```

**5. Deploy Worker as Cloud Run Job**

```bash
gcloud run jobs create content-factory-worker \
  --image gcr.io/YOUR_PROJECT_ID/content-factory-worker:latest \
  --region us-central1 \
  --memory 4Gi \
  --cpu 4 \
  --task-timeout 3600 \
  --max-retries 2 \
  --set-env-vars "NODE_ENV=production,MONGODB_URI=YOUR_MONGODB_URI,REDIS_HOST=YOUR_REDIS_IP,REDIS_PORT=6379,GEMINI_API_KEY=YOUR_API_KEY,MAX_CONCURRENT_CONTENT_GENERATION=10"
```

Start the job:
```bash
gcloud run jobs execute content-factory-worker --region us-central1
```

**Note:** For continuous worker processing, consider deploying to GKE or using Cloud Run service with long-running process.

**6. Deploy Frontend to Cloud Run**

```bash
gcloud run deploy content-factory-client \
  --image gcr.io/YOUR_PROJECT_ID/content-factory-client:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://your-api-url.run.app"
```

**7. Set Up Custom Domain (Optional)**

```bash
gcloud run domain-mappings create \
  --service content-factory-client \
  --domain your-domain.com \
  --region us-central1
```

### Option 2: AWS (ECS + ElastiCache + MongoDB Atlas)

#### Services Used:
- **ECS Fargate**: Container hosting
- **ElastiCache (Redis)**: Queue management
- **Application Load Balancer**: Traffic routing
- **ECR**: Container registry
- **MongoDB Atlas**: Database

#### Deployment Steps

**1. Create ECR Repositories**

```bash
aws ecr create-repository --repository-name content-factory-api
aws ecr create-repository --repository-name content-factory-worker
aws ecr create-repository --repository-name content-factory-client
```

**2. Build and Push Images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -f Dockerfile.api -t YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/content-factory-api:latest .
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/content-factory-api:latest

# Repeat for worker and client
```

**3. Create ECS Cluster**

```bash
aws ecs create-cluster --cluster-name content-factory-cluster
```

**4. Create Task Definitions**

Create `task-definition-api.json`:
```json
{
  "family": "content-factory-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/content-factory-api:latest",
      "portMappings": [{"containerPort": 3001}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3001"},
        {"name": "MONGODB_URI", "value": "YOUR_MONGODB_URI"},
        {"name": "REDIS_HOST", "value": "YOUR_REDIS_ENDPOINT"},
        {"name": "GEMINI_API_KEY", "value": "YOUR_API_KEY"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/content-factory-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition-api.json
```

**5. Create ECS Services**

```bash
aws ecs create-service \
  --cluster content-factory-cluster \
  --service-name content-factory-api \
  --task-definition content-factory-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

**6. Set Up Application Load Balancer**

Use AWS Console or CLI to create ALB and configure target groups for your services.

### Option 3: DigitalOcean (App Platform)

#### Advantages:
- Simplified deployment
- Auto-scaling
- Managed databases available

#### Deployment Steps

**1. Create App**

```bash
doctl apps create --spec app-spec.yaml
```

Create `app-spec.yaml`:
```yaml
name: content-factory
services:
  - name: api
    github:
      repo: your-username/your-repo
      branch: main
    build_command: npm install
    run_command: node server/index.js
    envs:
      - key: NODE_ENV
        value: "production"
      - key: MONGODB_URI
        value: "${MONGODB_URI}"
      - key: REDIS_HOST
        value: "${db.REDIS_HOST}"
      - key: GEMINI_API_KEY
        value: "${GEMINI_API_KEY}"
    http_port: 3001
    instance_count: 2
    instance_size_slug: professional-xs

  - name: worker
    github:
      repo: your-username/your-repo
      branch: main
    build_command: npm install
    run_command: node worker/index.js
    envs:
      - key: NODE_ENV
        value: "production"
      - key: MONGODB_URI
        value: "${MONGODB_URI}"
      - key: REDIS_HOST
        value: "${db.REDIS_HOST}"
      - key: GEMINI_API_KEY
        value: "${GEMINI_API_KEY}"
    instance_count: 1
    instance_size_slug: professional-s

  - name: client
    github:
      repo: your-username/your-repo
      branch: main
    source_dir: /client
    build_command: npm run build
    run_command: npm start
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: "${api.PUBLIC_URL}"
    http_port: 3000
    instance_count: 2
    instance_size_slug: basic-xs

databases:
  - name: redis
    engine: REDIS
    version: "7"
```

### Option 4: Self-Hosted (VPS/Dedicated Server)

#### Requirements:
- Ubuntu 22.04 LTS or similar
- 4GB+ RAM
- Docker and Docker Compose installed

#### Deployment Steps

**1. Set Up Server**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app user
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG docker appuser
```

**2. Clone and Configure**

```bash
# Clone repo
git clone your-repo-url /home/appuser/content-factory
cd /home/appuser/content-factory

# Set up environment
cp .env.example .env
nano .env  # Edit with production values

# Set ownership
sudo chown -R appuser:appuser /home/appuser/content-factory
```

**3. Start with Docker Compose**

```bash
# Production compose file
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

**4. Set Up Nginx Reverse Proxy**

```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/content-factory`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/content-factory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**5. Set Up SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

**6. Set Up Systemd Service (for auto-restart)**

Create `/etc/systemd/system/content-factory.service`:
```ini
[Unit]
Description=Content Factory Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/appuser/content-factory
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=appuser

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable content-factory
sudo systemctl start content-factory
```

## Post-Deployment

### Monitoring

**Set up logging:**
```bash
# CloudWatch (AWS)
# Logs Explorer (GCP)
# Or use self-hosted solutions like ELK stack
```

**Monitor key metrics:**
- API response times
- Worker job processing times
- Queue depth
- Database connections
- Memory/CPU usage
- Error rates

### Backups

**MongoDB Atlas:**
- Enable automatic backups in Atlas console
- Set up point-in-time recovery

**Redis:**
- Enable persistence (RDB + AOF)
- Schedule regular snapshots

**Application Code:**
- Use Git tags for releases
- Keep Docker images versioned

### Security Hardening

1. **Environment Variables:**
   - Use secrets management (AWS Secrets Manager, GCP Secret Manager)
   - Never commit .env files

2. **Network Security:**
   - Use VPC/private networks
   - Implement security groups/firewall rules
   - Enable DDoS protection

3. **API Security:**
   - Add rate limiting (express-rate-limit)
   - Implement authentication
   - Use HTTPS only

4. **Database Security:**
   - Whitelist IPs in MongoDB Atlas
   - Use strong passwords
   - Enable audit logging

### Scaling

**Horizontal Scaling:**
- Increase API service replicas
- Add more worker instances
- Use load balancer

**Vertical Scaling:**
- Increase container memory/CPU
- Upgrade database tier
- Scale Redis instance

**Auto-Scaling:**
- Set up auto-scaling policies based on:
  - CPU usage > 70%
  - Queue depth > 100 jobs
  - Request rate > X req/min

### CI/CD Pipeline

Example GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker build -f Dockerfile.api -t your-registry/content-factory-api:${{ github.sha }} .
          docker push your-registry/content-factory-api:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy content-factory-api \
            --image your-registry/content-factory-api:${{ github.sha }} \
            --region us-central1
```

## Cost Optimization

### Google Cloud:
- Use Cloud Run (pay per use)
- Enable auto-scaling with min instances = 0
- Use preemptible VMs for workers
- Estimated: $50-200/month

### AWS:
- Use Fargate Spot for workers
- Enable auto-scaling policies
- Use ElastiCache reserved instances
- Estimated: $100-300/month

### MongoDB Atlas:
- Start with M10 tier (~$60/month)
- Enable compression
- Implement data retention policies

## Support

For deployment issues:
- Check service logs
- Verify environment variables
- Test API health endpoints
- Review cloud provider status pages

---

**Ready to deploy? Good luck! 🚀**

