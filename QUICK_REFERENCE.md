# Content Factory - Quick Reference

One-page reference for common tasks and commands.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start with Docker
docker-compose up -d

# 4. Access application
# Frontend: http://localhost:3000
# API: http://localhost:3001
```

## 📝 Environment Setup

### Required Variables (.env)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/content-factory
GEMINI_API_KEY=your_api_key_here
```

### Optional Variables
```env
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
MAX_CONCURRENT_CONTENT_GENERATION=10
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View specific service logs
docker-compose logs -f api
docker-compose logs -f worker

# Check service status
docker-compose ps
```

## 🛠️ Development Commands

```bash
# Start API server (development)
npm run dev:server

# Start worker (development)
npm run dev:worker

# Start both API and worker
npm run dev

# Start frontend
cd client && npm run dev

# Build frontend for production
cd client && npm run build
```

## 🔍 Testing Commands

```bash
# Check API health
curl http://localhost:3001/health

# Create test job
curl -X POST http://localhost:3001/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"niche":"Test","valuePropositions":["Value 1"],"tone":"professional"}'

# Check job status
curl http://localhost:3001/api/status/JOB_ID

# Get job content
curl http://localhost:3001/api/content/JOB_ID
```

## 📊 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/generate-content` | Create new job |
| GET | `/api/status/:jobId` | Get job status |
| GET | `/api/content/:jobId` | Get generated content |
| GET | `/api/jobs` | List all jobs |
| DELETE | `/api/job/:jobId` | Delete job |
| GET | `/health` | Health check |

## 🔄 Job Status Flow

```
ENQUEUED → RESEARCHING → RESEARCH_COMPLETE → GENERATING → COMPLETE
                                                          ↓
                                                       FAILED
```

## 🗄️ Database Collections

### Jobs Collection
```javascript
{
  niche: String,
  valuePropositions: [String],
  tone: String,
  status: String,
  progress: Number,
  scenarios: [Object],
  totalContentGenerated: Number
}
```

### Contents Collection
```javascript
{
  jobId: ObjectId,
  scenarioId: Number,
  blogTitle: String,
  blogContent: String,
  keywords: [String],
  wordCount: Number
}
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001

# Kill process or change port in .env
```

### MongoDB Connection Failed
```bash
# Check connection string in .env
# Verify IP is whitelisted in MongoDB Atlas
# Try allowing all IPs: 0.0.0.0/0 (dev only)
```

### Docker Issues
```bash
# Restart Docker Desktop
# Clean up containers
docker system prune -a

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

### Worker Not Processing
```bash
# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker

# Check Redis
docker exec -it content-factory-redis redis-cli ping
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `server/index.js` | API Gateway |
| `worker/index.js` | Worker orchestrator |
| `worker/phaseA.js` | Research phase |
| `worker/phaseB.js` | Content generation |
| `models/Job.js` | Job schema |
| `models/Content.js` | Content schema |
| `client/app/page.tsx` | Home page |
| `client/app/progress/[jobId]/page.tsx` | Progress page |
| `client/app/results/[jobId]/page.tsx` | Results page |

## 🔐 Security Checklist

- [ ] Never commit .env files
- [ ] Use strong MongoDB passwords
- [ ] Whitelist IPs in MongoDB Atlas
- [ ] Keep Gemini API key secure
- [ ] Configure CORS properly
- [ ] Implement rate limiting (production)
- [ ] Use HTTPS in production
- [ ] Enable firewall rules
- [ ] Regular security updates

## 📈 Performance Tips

1. **Increase Concurrency**: Adjust `MAX_CONCURRENT_CONTENT_GENERATION`
2. **Scale Workers**: Run multiple worker instances
3. **Database Indexing**: Already configured in schemas
4. **Redis Persistence**: Enable for job recovery
5. **CDN**: Use for static assets in production

## 🎯 Production Deployment

```bash
# Set NODE_ENV
export NODE_ENV=production

# Use production MongoDB
MONGODB_URI=mongodb+srv://...

# Deploy to cloud
# See DEPLOYMENT.md for detailed instructions
```

## 📚 Documentation Files

- **README.md** - Overview and main docs
- **SETUP_GUIDE.md** - Step-by-step installation
- **DEPLOYMENT.md** - Production deployment
- **CONTRIBUTING.md** - How to contribute
- **PROJECT_STRUCTURE.md** - Architecture details
- **QUICK_REFERENCE.md** - This file

## 🆘 Getting Help

1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Check GitHub issues
4. Create new issue with details

## ⚡ Quick Tips

- Use Docker Compose for easy setup
- Monitor logs for errors
- Test API with curl before frontend
- Keep dependencies updated
- Back up MongoDB regularly
- Monitor API quota usage
- Scale workers based on load

---

**Happy coding! 🚀**

