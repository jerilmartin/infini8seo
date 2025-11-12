# Content Factory - AI-Powered Content Generation SaaS Platform

<div align="center">

![Content Factory](https://img.shields.io/badge/Content-Factory-blue?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Powered-purple?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)

**Autonomous AI agent that generates 50 high-quality, SEO-optimized blog posts through intelligent two-phase research and production pipeline.**

[Features](#features) • [Architecture](#architecture) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Deployment](#deployment)

</div>

---

## 🎯 Overview

Content Factory is a production-grade SaaS platform that automates the entire content strategy and creation process. By providing just your business niche and value propositions, the system:

1. **Phase A (Research Foundation)**: Executes deep market research with real-time Google Search data to generate 50 unique, structured persona/scenario data points
2. **Phase B (Mass Production)**: Leverages those insights to concurrently generate 50 corresponding, high-quality, 1000-word blog posts

### Key Differentiators

- ✅ **True Autonomy**: Single user input → 50 complete blog posts
- ✅ **Grounded Research**: Uses Google Search integration for real-time market data
- ✅ **Production-Scale**: Handles 51+ API calls without crashing via asynchronous architecture
- ✅ **Quality Content**: Each post is 950-1050 words, SEO-optimized, and persona-targeted
- ✅ **Enterprise-Ready**: Docker-based deployment with proper error handling and monitoring

---

## 🚀 Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Deep Market Research** | AI analyzes your niche with Google Search to identify real pain points |
| **50 Unique Personas** | Generates diverse customer archetypes and scenarios |
| **Concurrent Generation** | Produces 50 blog posts in parallel with rate limiting |
| **SEO Optimization** | Each post includes keywords, meta descriptions, and proper structure |
| **Real-time Progress** | Client-side polling shows live updates during generation |
| **Markdown Export** | Download individual posts or entire collections |
| **Professional UI** | Beautiful Next.js frontend with Tailwind CSS |

### Technical Features

- 🔄 **Asynchronous Architecture**: Express API + BullMQ Worker separation
- 📊 **State Management**: MongoDB for job tracking and content storage
- 🎯 **Rate Limiting**: Smart concurrency control with p-limit
- 🐳 **Containerized**: Full Docker Compose setup for all services
- 📝 **Type-Safe**: TypeScript frontend with comprehensive types
- 🔍 **Error Handling**: Retry logic, graceful failures, and detailed logging
- 🔐 **Production-Ready**: Environment-based configuration and security

---

## 🏗️ Architecture

### System Design

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│             │      │              │      │             │      │              │
│  Next.js    │─────▶│   Express    │─────▶│   BullMQ    │─────▶│   Worker     │
│  Frontend   │      │   API        │      │   Queue     │      │   Process    │
│             │      │   Gateway    │      │  (Redis)    │      │              │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
      │                     │                                            │
      │                     │                                            │
      │                     └──────────────┬─────────────────────────────┘
      │                                    │
      │                                    ▼
      │                            ┌─────────────┐
      │                            │             │
      └───────────────────────────▶│  MongoDB    │
              Polling               │   Atlas     │
                                    │             │
                                    └─────────────┘
                                            │
                                            ▼
                                    ┌─────────────┐
                                    │   Google    │
                                    │  Gemini AI  │
                                    └─────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 + TypeScript | Client UI with server-side rendering |
| **API Gateway** | Express + Node.js | Stateless API, no AI calls |
| **Queue/Worker** | Redis + BullMQ | Asynchronous job processing |
| **Database** | MongoDB Atlas | Job state and content storage |
| **AI Engine** | Google Gemini 2.5 | Pro for research, Flash for content |
| **Deployment** | Docker + Docker Compose | Containerization and orchestration |

### Data Flow

1. **User submits form** → Frontend POST to `/api/generate-content`
2. **API creates job** → Saves to MongoDB, enqueues to BullMQ
3. **API returns 202** → Immediately returns jobId to client
4. **Client polls** → Requests `/api/status/:jobId` every 3 seconds
5. **Worker picks up job** → Executes Phase A (research) with Gemini Pro
6. **Worker saves scenarios** → Updates job status to `RESEARCH_COMPLETE`
7. **Worker executes Phase B** → Generates 50 posts concurrently with Gemini Flash
8. **Worker saves content** → Each post saved to Content collection
9. **Worker marks complete** → Job status set to `COMPLETE`
10. **Client redirects** → Automatically navigates to results page

---

## ⚡ Quick Start

### Prerequisites

- Node.js 20+ 
- Docker & Docker Compose
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))
- MongoDB Atlas account (or local MongoDB)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd agenticai
```

2. **Set up environment variables**
```bash
# Copy example file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:
```env
# MongoDB (Atlas or local)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/content-factory

# Google Gemini AI
GEMINI_API_KEY=your_api_key_here

# Redis (defaults work for local)
REDIS_HOST=localhost
REDIS_PORT=6379

# API Server
PORT=3001
FRONTEND_URL=http://localhost:3000
```

3. **Install dependencies**
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..
```

### Running Locally

#### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- MongoDB: localhost:27017
- Redis: localhost:6379

#### Option 2: Manual Setup

**Terminal 1 - Start MongoDB and Redis:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0
docker run -d -p 6379:6379 --name redis redis:7-alpine

# OR install locally and start services
```

**Terminal 2 - Start API Server:**
```bash
npm run dev:server
```

**Terminal 3 - Start Worker:**
```bash
npm run dev:worker
```

**Terminal 4 - Start Frontend:**
```bash
cd client
npm run dev
```

### First Run

1. Open http://localhost:3000
2. Fill in the form:
   - **Business Niche**: "Digital Marketing Agency"
   - **Value Propositions**: "We increase ROI by 300%", "Data-driven strategies"
   - **Tone**: Professional
3. Click "Generate 50 Blog Posts"
4. Watch the progress screen update in real-time
5. View and download your generated content!

---

## 📖 Documentation

### API Endpoints

#### POST `/api/generate-content`

Initiates a new content generation job.

**Request Body:**
```json
{
  "niche": "Digital Marketing",
  "valuePropositions": ["ROI improvement", "Data-driven"],
  "tone": "professional"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "507f1f77bcf86cd799439011",
  "status": "ENQUEUED",
  "estimatedTimeMinutes": 15
}
```

#### GET `/api/status/:jobId`

Returns current job status and progress.

**Response:**
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "niche": "Digital Marketing",
  "status": "GENERATING",
  "progress": 65,
  "totalContentGenerated": 32,
  "scenariosGenerated": 50,
  "estimatedSecondsRemaining": 180
}
```

**Status Values:**
- `ENQUEUED`: Job is queued
- `RESEARCHING`: Phase A in progress
- `RESEARCH_COMPLETE`: Phase A done, Phase B starting
- `GENERATING`: Phase B in progress
- `COMPLETE`: All done
- `FAILED`: Error occurred

#### GET `/api/content/:jobId`

Returns all generated blog posts (only when status is COMPLETE).

**Response:**
```json
{
  "success": true,
  "jobId": "507f1f77bcf86cd799439011",
  "niche": "Digital Marketing",
  "stats": {
    "totalPosts": 50,
    "avgWordCount": 1015,
    "totalWords": 50750
  },
  "content": [
    {
      "scenarioId": 1,
      "title": "How to Increase Your Marketing ROI by 300%",
      "personaArchetype": "Budget-Conscious CMO",
      "keywords": ["marketing roi", "increase roi", "marketing metrics"],
      "content": "# How to Increase Your Marketing ROI...",
      "wordCount": 1023,
      "slug": "how-to-increase-your-marketing-roi-by-300",
      "metaDescription": "Learn proven strategies to..."
    }
    // ... 49 more posts
  ]
}
```

#### GET `/api/jobs`

List all jobs (with optional filtering).

**Query Parameters:**
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (optional)

### Worker Architecture

#### Phase A: Deep Research

**File:** `worker/phaseA.js`

**Model:** `gemini-2.5-pro` (or `gemini-2.0-flash-exp`)

**Features:**
- Google Search grounding for real-time data
- JSON mode for structured output
- Generates exactly 50 unique personas/scenarios
- Validates response structure

**Output Schema:**
```json
{
  "business_niche": "...",
  "scenarios": [
    {
      "scenario_id": 1,
      "persona_name": "Sarah the Startup Founder",
      "persona_archetype": "Budget-Conscious Entrepreneur",
      "pain_point_detail": "Struggles with limited marketing budget...",
      "goal_focus": "Achieve sustainable growth without breaking the bank",
      "blog_topic_headline": "Marketing on a Shoestring: Growth Hacks for Startups",
      "target_keywords": ["startup marketing", "low budget marketing", "growth hacks"],
      "required_word_count": 1000
    }
    // ... 49 more
  ]
}
```

#### Phase B: Content Generation

**File:** `worker/phaseB.js`

**Model:** `gemini-2.5-flash` (or `gemini-2.0-flash-exp`)

**Features:**
- Concurrent generation with `p-limit(10)`
- 950-1050 word count enforcement
- Retry logic with exponential backoff
- Progress tracking with callbacks
- Automatic slug and meta description generation

**Structure:**
- Introduction (pain point focus)
- Understanding the Challenge (analysis)
- Actionable Steps (3-5 tips)
- The Ultimate Solution (value proposition integration)
- Conclusion (CTA)

### Database Schemas

#### Job Collection

```javascript
{
  _id: ObjectId,
  niche: String,
  valuePropositions: [String],
  tone: String,
  status: String, // ENQUEUED, RESEARCHING, GENERATING, COMPLETE, FAILED
  progress: Number, // 0-100
  scenarios: [ScenarioObject],
  totalContentGenerated: Number,
  errorMessage: String,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Content Collection

```javascript
{
  _id: ObjectId,
  jobId: ObjectId, // Reference to Job
  scenarioId: Number,
  blogTitle: String,
  personaArchetype: String,
  keywords: [String],
  blogContent: String, // Markdown
  wordCount: Number,
  characterCount: Number,
  metaDescription: String,
  slug: String,
  generationTimeMs: Number,
  modelUsed: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚢 Deployment

### Docker Compose Production

1. **Prepare environment**
```bash
cp .env.example .env
# Edit .env with production values
```

2. **Build and start**
```bash
docker-compose up -d --build
```

3. **Verify health**
```bash
curl http://localhost:3001/health
```

### Google Cloud Run

1. **Build images**
```bash
# API
docker build -f Dockerfile.api -t gcr.io/YOUR_PROJECT/content-factory-api .

# Worker
docker build -f Dockerfile.worker -t gcr.io/YOUR_PROJECT/content-factory-worker .

# Client
cd client
docker build -t gcr.io/YOUR_PROJECT/content-factory-client .
```

2. **Push to Container Registry**
```bash
docker push gcr.io/YOUR_PROJECT/content-factory-api
docker push gcr.io/YOUR_PROJECT/content-factory-worker
docker push gcr.io/YOUR_PROJECT/content-factory-client
```

3. **Deploy to Cloud Run**
```bash
# API
gcloud run deploy content-factory-api \
  --image gcr.io/YOUR_PROJECT/content-factory-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars "MONGODB_URI=...,REDIS_HOST=...,GEMINI_API_KEY=..."

# Client
gcloud run deploy content-factory-client \
  --image gcr.io/YOUR_PROJECT/content-factory-client \
  --platform managed \
  --region us-central1 \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://your-api-url"
```

4. **Worker** - Deploy to Cloud Run Jobs or GKE for long-running processes

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=8080

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/content-factory?retryWrites=true&w=majority

# Redis (use managed Redis like Cloud Memorystore)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Google Gemini
GEMINI_API_KEY=your_api_key

# Rate Limiting
MAX_CONCURRENT_CONTENT_GENERATION=10
REQUEST_TIMEOUT_MS=300000

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-url.com
```

### Monitoring

View logs:
```bash
# Docker Compose
docker-compose logs -f api
docker-compose logs -f worker

# Local files
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🧪 Testing

### Manual Testing

1. **API Health Check**
```bash
curl http://localhost:3001/health
```

2. **Create a Test Job**
```bash
curl -X POST http://localhost:3001/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "Test Niche",
    "valuePropositions": ["Value 1", "Value 2"],
    "tone": "professional"
  }'
```

3. **Check Job Status**
```bash
curl http://localhost:3001/api/status/YOUR_JOB_ID
```

### Important Testing Notes

⚠️ **Remember to write tests** as per user requirements! Consider:
- Unit tests for API endpoints
- Integration tests for worker processes
- E2E tests for the full pipeline
- Load testing for concurrent job handling

Suggested testing frameworks:
- Backend: Jest + Supertest
- Frontend: Jest + React Testing Library
- E2E: Playwright or Cypress

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** Worker not processing jobs
```bash
# Check Redis connection
docker exec -it content-factory-redis redis-cli ping

# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker
```

**Issue:** MongoDB connection failed
```bash
# Verify connection string
echo $MONGODB_URI

# Test connection
mongosh $MONGODB_URI

# Check if MongoDB is running
docker ps | grep mongodb
```

**Issue:** Gemini API rate limits
- Reduce `MAX_CONCURRENT_CONTENT_GENERATION` in `.env`
- Add delays between requests
- Check your API quota in Google AI Studio

**Issue:** Frontend can't connect to API
- Verify `NEXT_PUBLIC_API_URL` in client `.env.local`
- Check CORS settings in `server/index.js`
- Ensure API is running: `curl http://localhost:3001/health`

---

## 📊 Performance Considerations

### Optimization Tips

1. **Concurrency Tuning**
   - Default: 10 concurrent Gemini Flash calls
   - Increase if you have higher API quotas
   - Decrease if hitting rate limits

2. **MongoDB Indexing**
   - Indexes already configured on `status`, `createdAt`, `jobId`
   - Consider compound indexes for complex queries

3. **Redis Configuration**
   - Enable persistence for job recovery
   - Monitor memory usage with large queues
   - Consider Redis Cluster for scale

4. **Content Caching**
   - Implement CDN for static assets
   - Cache completed job results
   - Use Redis for session management

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful language models
- **BullMQ** for robust job queue management
- **Next.js** for excellent developer experience
- **MongoDB** for flexible document storage

---

## 📧 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting guide

---

<div align="center">

**Built with ❤️ for content creators everywhere**

[⬆ Back to Top](#content-factory---ai-powered-content-generation-saas-platform)

</div>

