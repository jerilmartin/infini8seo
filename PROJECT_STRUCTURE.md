# Content Factory - Project Structure

Complete overview of the project architecture and file organization.

## Directory Tree

```
agenticai/
│
├── 📦 package.json                    # Backend dependencies and scripts
├── 🐳 docker-compose.yml              # Docker services orchestration
├── 🐳 Dockerfile.api                  # API server Docker image
├── 🐳 Dockerfile.worker               # Worker process Docker image
├── 🔒 .env.example                    # Environment variables template
├── 📝 .gitignore                      # Git ignore rules
├── 📝 .dockerignore                   # Docker ignore rules
│
├── 📚 Documentation
│   ├── README.md                      # Main documentation
│   ├── SETUP_GUIDE.md                 # Installation guide
│   ├── DEPLOYMENT.md                  # Deployment guide
│   ├── CONTRIBUTING.md                # Contribution guidelines
│   ├── PROJECT_STRUCTURE.md           # This file
│   └── LICENSE                        # MIT License
│
├── 🖥️ server/                         # Express API Gateway
│   └── index.js                       # Main API server
│       ├── POST /api/generate-content    # Initiate job
│       ├── GET  /api/status/:jobId       # Check job status
│       ├── GET  /api/content/:jobId      # Get generated content
│       ├── GET  /api/jobs                # List all jobs
│       └── DELETE /api/job/:jobId        # Delete job
│
├── ⚙️ worker/                         # BullMQ Worker Process
│   ├── index.js                       # Main worker orchestrator
│   ├── phaseA.js                      # Research & scenario generation
│   │   ├── Model: gemini-2.5-pro
│   │   ├── Google Search grounding
│   │   └── Outputs: 50 scenarios
│   └── phaseB.js                      # Blog post generation
│       ├── Model: gemini-2.5-flash
│       ├── Concurrent: 10 at a time
│       └── Outputs: 50 blog posts
│
├── 🗄️ models/                         # MongoDB Schemas (Mongoose)
│   ├── Job.js                         # Job tracking schema
│   │   ├── niche, valuePropositions, tone
│   │   ├── status, progress, scenarios
│   │   └── Methods: updateProgress(), markAsComplete()
│   └── Content.js                     # Generated content schema
│       ├── jobId, scenarioId, blogTitle
│       ├── blogContent, keywords, wordCount
│       └── Methods: generateSlug(), generateMetaDescription()
│
├── ⚙️ config/                         # Configuration Files
│   ├── database.js                    # MongoDB connection setup
│   └── redis.js                       # Redis & BullMQ configuration
│       ├── Queue creation
│       ├── Worker connection
│       └── Graceful shutdown
│
├── 🛠️ utils/                          # Utility Functions
│   └── logger.js                      # Winston logger configuration
│       ├── Console logging
│       ├── File logging (logs/)
│       └── Error handling
│
├── 🌐 client/                         # Next.js Frontend Application
│   ├── 📦 package.json                # Frontend dependencies
│   ├── ⚙️ next.config.js              # Next.js configuration
│   ├── 🎨 tailwind.config.js          # Tailwind CSS configuration
│   ├── 📝 tsconfig.json               # TypeScript configuration
│   ├── 🐳 Dockerfile                  # Frontend Docker image
│   │
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Home page (form)
│   │   ├── globals.css                # Global styles
│   │   │
│   │   ├── progress/[jobId]/          # Progress tracking page
│   │   │   └── page.tsx               # Real-time polling interface
│   │   │       ├── Status display
│   │   │       ├── Progress bar
│   │   │       ├── Phase indicators
│   │   │       └── Auto-redirect on completion
│   │   │
│   │   └── results/[jobId]/           # Results display page
│   │       └── page.tsx               # Generated content viewer
│   │           ├── Statistics cards
│   │           ├── Expandable posts
│   │           ├── Markdown rendering
│   │           └── Download functionality
│   │
│   └── public/                        # Static assets
│
├── 📜 scripts/                        # Helper Scripts
│   ├── quick-start.sh                 # One-command setup
│   ├── check-health.sh                # Health check script
│   └── cleanup.sh                     # Database cleanup
│
└── 📊 logs/                           # Application Logs
    ├── combined.log                   # All logs
    ├── error.log                      # Error logs only
    ├── exceptions.log                 # Unhandled exceptions
    └── rejections.log                 # Unhandled promise rejections
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                          │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                              │
│  ├── Input Form (page.tsx)                                       │
│  ├── Progress Page (progress/[jobId]/page.tsx)                   │
│  └── Results Page (results/[jobId]/page.tsx)                     │
└──────────────────────────────────────────────────────────────────┘
                                  │
                    POST /api/generate-content
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  API GATEWAY (Express - server/index.js)                         │
│  ├── Validate Request                                            │
│  ├── Create Job in MongoDB                                       │
│  ├── Enqueue Job to BullMQ                                       │
│  └── Return 202 Accepted with jobId                              │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  REDIS QUEUE (BullMQ)                                            │
│  ├── Job stored with metadata                                    │
│  ├── Retry configuration                                         │
│  └── Priority handling                                           │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  WORKER PROCESS (worker/index.js)                                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  PHASE A: Deep Research (phaseA.js)                        │ │
│  │  ├── Model: gemini-2.5-pro                                 │ │
│  │  ├── Tool: Google Search                                   │ │
│  │  ├── Output: JSON (50 scenarios)                           │ │
│  │  ├── Duration: ~1-2 minutes                                │ │
│  │  └── Update: Job.status = 'RESEARCH_COMPLETE'             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  PHASE B: Content Generation (phaseB.js)                   │ │
│  │  ├── Model: gemini-2.5-flash                               │ │
│  │  ├── Concurrency: p-limit(10)                              │ │
│  │  ├── Output: 50 Markdown blog posts                        │ │
│  │  ├── Duration: ~10-15 minutes                              │ │
│  │  ├── Progress: Updated after each post                     │ │
│  │  └── Update: Job.status = 'COMPLETE'                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  MONGODB (Database)                                              │
│  ├── Jobs Collection                                             │
│  │   ├── Job metadata                                            │
│  │   ├── Status tracking                                         │
│  │   └── Scenarios array                                         │
│  └── Contents Collection                                         │
│      ├── Blog posts                                              │
│      ├── Keywords & SEO data                                     │
│      └── Reference to parent job                                 │
└──────────────────────────────────────────────────────────────────┘
                                  │
                    GET /api/content/:jobId
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND displays results with download options                 │
└──────────────────────────────────────────────────────────────────┘
```

## Key Components Explained

### 1. API Gateway (`server/index.js`)

**Purpose:** Stateless HTTP API that handles requests without blocking

**Responsibilities:**
- Request validation
- Job creation in MongoDB
- Queue job enqueuing
- Status polling endpoint
- Content retrieval endpoint

**Does NOT:**
- Make Gemini API calls
- Process jobs
- Generate content

### 2. Worker Process (`worker/index.js`, `phaseA.js`, `phaseB.js`)

**Purpose:** Long-running process that executes the two-phase content generation

**Phase A (Research):**
- Uses Gemini 2.5 Pro with Google Search
- Generates 50 unique persona/scenario data points
- Returns structured JSON
- Updates job status and stores scenarios

**Phase B (Content Generation):**
- Uses Gemini 2.5 Flash
- Generates 50 blog posts concurrently
- Rate-limited to 10 concurrent requests
- Updates progress incrementally
- Saves each post to Content collection

### 3. MongoDB Collections

**Jobs Collection:**
```javascript
{
  niche: "Digital Marketing",
  valuePropositions: ["ROI improvement", "Data-driven"],
  tone: "professional",
  status: "GENERATING",
  progress: 65,
  scenarios: [/* 50 scenario objects */],
  totalContentGenerated: 32
}
```

**Contents Collection:**
```javascript
{
  jobId: ObjectId("..."),
  scenarioId: 15,
  blogTitle: "How to Increase Marketing ROI",
  blogContent: "# How to Increase...",
  keywords: ["marketing roi", "roi optimization"],
  wordCount: 1023,
  slug: "how-to-increase-marketing-roi"
}
```

### 4. Frontend Pages

**Home Page (`app/page.tsx`):**
- Form with niche, value propositions, tone
- Client-side validation
- Submits to API
- Redirects to progress page

**Progress Page (`app/progress/[jobId]/page.tsx`):**
- Polls `/api/status/:jobId` every 3 seconds
- Real-time progress bar
- Phase indicators
- Estimated time remaining
- Auto-redirects when complete

**Results Page (`app/results/[jobId]/page.tsx`):**
- Fetches `/api/content/:jobId`
- Displays statistics
- Shows all 50 blog posts
- Expandable/collapsible posts
- Download individual or all posts

## Environment Variables

### Backend (`.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes | - |
| `REDIS_HOST` | Redis server host | No | localhost |
| `REDIS_PORT` | Redis server port | No | 6379 |
| `PORT` | API server port | No | 3001 |
| `NODE_ENV` | Environment | No | development |
| `FRONTEND_URL` | Frontend URL (CORS) | No | http://localhost:3000 |
| `MAX_CONCURRENT_CONTENT_GENERATION` | Concurrent API calls | No | 10 |

### Frontend (`client/.env.local`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ Yes | - |

## Docker Services

### docker-compose.yml defines:

1. **mongodb** - MongoDB 7.0 database
2. **redis** - Redis 7 for queue
3. **api** - Express API Gateway
4. **worker** - BullMQ Worker Process
5. **client** - Next.js Frontend

All services connected via `content-factory-network`.

## Dependencies

### Backend Dependencies

```json
{
  "@google/generative-ai": "AI SDK",
  "bullmq": "Job queue",
  "express": "Web framework",
  "mongoose": "MongoDB ODM",
  "ioredis": "Redis client",
  "p-limit": "Concurrency control",
  "winston": "Logging"
}
```

### Frontend Dependencies

```json
{
  "next": "React framework",
  "react": "UI library",
  "axios": "HTTP client",
  "react-markdown": "Markdown renderer",
  "lucide-react": "Icons",
  "tailwindcss": "CSS framework"
}
```

## Port Mapping

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js development server |
| API | 3001 | Express API Gateway |
| MongoDB | 27017 | Database connection |
| Redis | 6379 | Queue connection |

## Logging

All logs are written to `logs/` directory:

- **combined.log**: All logs (info, warn, error)
- **error.log**: Only errors
- **exceptions.log**: Unhandled exceptions
- **rejections.log**: Unhandled promise rejections

Logs are also output to console with colors in development.

## Testing

**Manual Testing:**
- Use Postman/curl for API endpoints
- Open frontend in browser
- Check logs for errors

**Automated Testing (Future):**
- Jest for unit tests
- Supertest for API tests
- React Testing Library for frontend
- Playwright for E2E tests

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Store in secure secret management
3. **Database**: Use strong passwords, whitelist IPs
4. **CORS**: Configure allowed origins
5. **Rate Limiting**: Implement on API routes
6. **Input Validation**: Sanitize all user inputs

---

**This structure is designed for scalability, maintainability, and production deployment.**

