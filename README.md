# Content Factory

AI-powered content generation platform that produces high-quality, SEO-optimized blog posts through a two-phase research and production pipeline.

## Overview

Content Factory automates content strategy and creation. Provide your business niche and value propositions, and the system will:

1. **Phase A (Research)**: Execute deep market research with real-time Google Search data to generate structured persona/scenario data points
2. **Phase B (Production)**: Generate high-quality blog posts based on the research insights and your specified blog type mix

### Key Features

- Single input generates up to 50 complete blog posts
- Google Search integration for real-time market research
- **Full AIO (Answer Engine Optimization)** - content optimized for AI discovery
- Concurrent generation with rate limiting
- SEO-optimized content with keyword highlighting
- Unsplash integration for stock imagery
- Real-time progress tracking
- Markdown export

## AIO (Answer Engine Optimization)

Content Factory generates blogs optimized for AI-powered answer engines like Gemini, Perplexity, ChatGPT, and Claude. Each blog includes:

**Structural AIO Elements:**
- TL;DR / Key Takeaways box (easily extractable summaries)
- Quick Answer section (40-60 words AI can quote directly)
- Definition boxes for key terms
- Comparison tables (AI loves structured comparisons)
- Numbered step-by-step guides
- Question-based H2 headings matching natural language queries

**Content AIO Elements:**
- FAQ sections matching "People Also Ask" queries
- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
- Source attribution and expert references
- Factual density with specific numbers and data
- Clear entity relationships for AI context understanding

**Why This Matters:**
AI assistants increasingly cite and recommend content that is:
1. Directly answerable (clear, extractable answers)
2. Well-structured (tables, lists, hierarchies)
3. Authoritative (E-E-A-T signals, citations)
4. Question-matched (headings match user queries)

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│   Next.js   │─────>│   Express    │─────>│   BullMQ    │─────>│   Worker     │
│   Frontend  │      │   API        │      │   Queue     │      │   Process    │
│             │      │              │      │  (Redis)    │      │              │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
      │                     │                                            │
      │                     │                                            │
      │                     └──────────────┬─────────────────────────────┘
      │                                    │
      │                                    v
      │                            ┌─────────────┐
      │                            │  Supabase   │
      └───────────────────────────>│ (PostgreSQL)│
              Polling               └─────────────┘
                                           │
                                           v
                                   ┌─────────────┐
                                   │   Google    │
                                   │  Gemini AI  │
                                   └─────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| API | Express.js + Node.js |
| Queue | Redis + BullMQ |
| Database | Supabase (PostgreSQL) |
| AI | Google Gemini (Pro for research, Flash for content) |
| Images | Unsplash API |
| Deployment | Docker + Docker Compose |

## Project Structure

```
content-factory/
├── client/                 # Next.js frontend
│   ├── app/
│   │   ├── page.tsx       # Home/form page
│   │   ├── progress/      # Job progress page
│   │   └── results/       # Results display page
│   ├── Dockerfile
│   └── package.json
├── config/
│   ├── redis.js           # Redis/BullMQ configuration
│   ├── supabase.js        # Supabase client setup
│   └── schema.sql         # Database schema
├── models/
│   ├── JobRepository.js   # Job data access layer
│   └── ContentRepository.js # Content data access layer
├── server/
│   └── index.js           # Express API server
├── worker/
│   ├── index.js           # BullMQ worker process
│   ├── phaseA.js          # Research phase (Gemini Pro)
│   ├── phaseB.js          # Content generation (Gemini Flash)
│   └── utils/
│       ├── highlightKeywords.js
│       └── images.js      # Unsplash integration
├── utils/
│   └── logger.js          # Winston logger
├── scripts/
│   ├── check-health.sh
│   ├── cleanup.sh
│   └── quick-start.sh
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.worker
└── package.json
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))
- Supabase account ([Sign up here](https://supabase.com))
- Unsplash API Key (optional, for images)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd content-factory
npm install
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase (PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Set Up Database

1. Go to your Supabase Dashboard > SQL Editor
2. Copy the contents of `config/schema.sql`
3. Paste and run the SQL

### 4. Start Services

**Option A: Docker Compose (Recommended)**

```bash
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001

**Option B: Manual Setup**

Terminal 1 - Start Redis:
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

Terminal 2 - Start API:
```bash
npm run dev:server
```

Terminal 3 - Start Worker:
```bash
npm run dev:worker
```

Terminal 4 - Start Frontend:
```bash
cd client && npm run dev
```

### 5. Verify Setup

```bash
npm test
```

## API Reference

### POST /api/generate-content

Initiate a content generation job.

**Request:**
```json
{
  "niche": "Digital Marketing",
  "valuePropositions": ["ROI improvement", "Data-driven strategies"],
  "tone": "professional",
  "totalBlogs": 10,
  "blogTypeAllocations": {
    "functional": 3,
    "transactional": 2,
    "commercial": 3,
    "informational": 2
  },
  "targetWordCount": 1200
}
```

**Response (202):**
```json
{
  "success": true,
  "jobId": "uuid",
  "status": "ENQUEUED",
  "estimatedTimeMinutes": 15
}
```

### GET /api/status/:jobId

Get job status and progress.

**Response:**
```json
{
  "jobId": "uuid",
  "status": "GENERATING",
  "progress": 65,
  "totalContentGenerated": 6,
  "totalBlogs": 10
}
```

**Status Values:**
- `ENQUEUED` - Job queued
- `RESEARCHING` - Phase A in progress
- `RESEARCH_COMPLETE` - Phase A done
- `GENERATING` - Phase B in progress
- `COMPLETE` - All done
- `FAILED` - Error occurred

### GET /api/content/:jobId

Get generated content (only when status is COMPLETE).

### GET /api/jobs

List all jobs with optional filtering.

### DELETE /api/job/:jobId

Delete a job and its content.

## Auto-Cleanup

The system includes an automatic cleanup script that deletes jobs and content older than 7 days from Supabase.

### Manual Cleanup

```bash
npm run cleanup
```

### Automatic Weekly Cleanup

See [CLEANUP_SETUP.md](CLEANUP_SETUP.md) for detailed instructions on setting up:
- Cron jobs (Linux/Mac)
- Windows Task Scheduler
- GitHub Actions
- Docker-based scheduling

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3001 |
| `NODE_ENV` | Environment | development |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `UNSPLASH_ACCESS_KEY` | Unsplash API key | Optional |
| `MAX_CONCURRENT_CONTENT_GENERATION` | Concurrent API calls | 10 |
| `REQUEST_TIMEOUT_MS` | Request timeout | 300000 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

## Docker Deployment

### Build and Run

```bash
docker-compose up -d --build
```

### View Logs

```bash
docker-compose logs -f
```

### Stop Services

```bash
docker-compose down
```

## Troubleshooting

### Worker not processing jobs

```bash
# Check Redis connection
docker exec content-factory-redis redis-cli ping

# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker
```

### Supabase connection failed

1. Verify credentials in `.env`
2. Check if tables exist (run `config/schema.sql`)
3. Test connection: `npm test`

### Gemini API rate limits

- Reduce `MAX_CONCURRENT_CONTENT_GENERATION` in `.env`
- Check your API quota in Google AI Studio

### Frontend can't connect to API

1. Verify `NEXT_PUBLIC_API_URL` in `client/.env.local`
2. Check CORS settings in `server/index.js`
3. Ensure API is running: `curl http://localhost:3001/health`

## License

MIT License - see LICENSE file for details.
