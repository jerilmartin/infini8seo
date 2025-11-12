# Content Factory - Complete Setup Guide

This guide will walk you through setting up Content Factory from scratch.

## Prerequisites Installation

### 1. Install Node.js 20+

**Windows:**
```bash
# Download from https://nodejs.org/
# Or use winget
winget install OpenJS.NodeJS.LTS
```

**Mac:**
```bash
brew install node@20
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Docker Desktop

**Windows/Mac:**
- Download from https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 3. Get MongoDB Atlas (Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new cluster (M0 Free tier)
4. Add your IP to whitelist (or allow from anywhere: 0.0.0.0/0)
5. Create database user with password
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/content-factory`

### 4. Get Google Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (keep it secure!)

## Step-by-Step Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd agenticai

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Edit with your preferred editor
nano .env
```

Fill in your actual values:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/content-factory?retryWrites=true&w=majority

# Redis (local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Google Gemini AI API
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Rate Limiting
MAX_CONCURRENT_CONTENT_GENERATION=10
REQUEST_TIMEOUT_MS=300000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Create `.env.local` in the `client` folder:

```bash
cd client
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
cd ..
```

### Step 3: Start with Docker Compose (Easiest)

```bash
# Start all services (MongoDB, Redis, API, Worker, Client)
docker-compose up -d

# Check if all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Test the API
curl http://localhost:3001/health

# Open browser
# Frontend: http://localhost:3000
# API: http://localhost:3001
```

That's it! You're ready to generate content.

### Step 4: Manual Setup (Alternative)

If you prefer running services individually:

**Terminal 1 - Start Local MongoDB and Redis:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
docker run -d -p 6379:6379 --name redis redis:7-alpine
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

## Verification Steps

### 1. Check API Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "service": "Content Factory API"
}
```

### 2. Check MongoDB Connection

Look for this in API server logs:
```
✅ MongoDB connected successfully
```

### 3. Check Redis Connection

Look for this in worker logs:
```
✅ Redis connected successfully
```

### 4. Check Frontend

Open browser to http://localhost:3000

You should see the Content Factory homepage with the generation form.

## First Test Run

1. Open http://localhost:3000
2. Fill in the form:
   ```
   Business Niche: "Fitness Coaching"
   Value Proposition 1: "Personalized workout plans"
   Value Proposition 2: "Nutrition guidance"
   Tone: "friendly"
   ```
3. Click "Generate 50 Blog Posts"
4. You'll be redirected to the progress page
5. Watch as the system:
   - Researches your niche (1-2 minutes)
   - Generates 50 blog posts (10-15 minutes)
6. View your results!

## Common Setup Issues

### Issue: Port Already in Use

**Error:** `Port 3001 is already in use`

**Solution:**
```bash
# Find process using the port
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001

# Kill the process or use a different port in .env
```

### Issue: MongoDB Connection Failed

**Error:** `MongoServerError: Authentication failed`

**Solution:**
- Verify username and password in connection string
- Check if IP is whitelisted in MongoDB Atlas
- Try allowing all IPs: 0.0.0.0/0 (for development only)

### Issue: Cannot Find Module

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Gemini API Key Invalid

**Error:** `API key not valid`

**Solution:**
- Get new API key from https://aistudio.google.com/app/apikey
- Ensure no spaces or quotes around key in .env
- Check if API is enabled in Google Cloud Console

### Issue: Docker Compose Fails

**Error:** `docker-compose: command not found`

**Solution:**
```bash
# Install Docker Compose
# Mac (included with Docker Desktop)
brew install docker-compose

# Linux
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Development Tips

### Hot Reloading

Both the API server and frontend support hot reloading:
- Edit files in `server/` or `worker/` → API/Worker restarts automatically
- Edit files in `client/` → Frontend reloads automatically

### Database GUI

Use MongoDB Compass to view your data:
1. Download from https://www.mongodb.com/products/compass
2. Connect using your MongoDB URI
3. Browse `content-factory` database

### Redis GUI

Use RedisInsight to view your queues:
1. Download from https://redis.com/redis-enterprise/redis-insight/
2. Connect to localhost:6379
3. View BullMQ queues

### Logs Directory

Logs are saved to `logs/` directory:
- `combined.log` - All logs
- `error.log` - Errors only
- `exceptions.log` - Unhandled exceptions

### Stop All Services

```bash
# Docker Compose
docker-compose down

# Manual setup
# Press Ctrl+C in each terminal

# Stop and remove Docker containers
docker stop mongodb redis
docker rm mongodb redis
```

## Next Steps

- Read the [API Documentation](README.md#api-endpoints)
- Customize the [prompts](worker/phaseA.js) for your use case
- Deploy to production (see [Deployment Guide](README.md#deployment))
- Add user authentication
- Implement payment processing
- Create admin dashboard

## Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Test API health: `curl http://localhost:3001/health`
4. Check GitHub issues
5. Review troubleshooting section in README.md

Happy content generating! 🚀

