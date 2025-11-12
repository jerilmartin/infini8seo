# 🚀 Get Started NOW - Content Factory

## ✅ What's Already Done

- ✅ Backend dependencies installed (203 packages)
- ✅ Frontend dependencies installed (506 packages)
- ✅ `.env` file created with placeholders
- ✅ `client/.env.local` file created
- ✅ All code is ready to run

## 🔴 What YOU Need to Do (Takes 5 minutes)

### Step 1: Get MongoDB Connection String (2 minutes)

**Option A: MongoDB Atlas (Cloud - Recommended for testing)**

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up for FREE account
3. Create a FREE M0 cluster (no credit card needed)
4. Click "Connect" → "Connect your application"
5. Copy the connection string, it looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/content-factory
   ```
6. **IMPORTANT**: Replace `<password>` with your actual password!

**Option B: Local MongoDB (Using Docker)**

```powershell
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```
Then use: `mongodb://localhost:27017/content-factory`

### Step 2: Get Google Gemini API Key (1 minute)

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (looks like: `AIzaSy...`)

### Step 3: Update Your `.env` File (1 minute)

Open `.env` file in the root folder and replace these two lines:

```env
# Change this line:
MONGODB_URI=mongodb://localhost:27017/content-factory
# To your actual MongoDB connection string

# Change this line:
GEMINI_API_KEY=your_gemini_api_key_here
# To your actual API key
```

## 🚀 Run the Application (3 Ways)

### Option 1: Docker Compose (EASIEST - Recommended)

**Prerequisites**: Docker Desktop must be installed and running

```powershell
# Start all services at once
docker-compose up -d

# View logs
docker-compose logs -f

# Open browser
Start http://localhost:3000
```

**Services started:**
- ✅ MongoDB (if using local)
- ✅ Redis queue
- ✅ API Server (port 3001)
- ✅ Worker Process
- ✅ Frontend (port 3000)

**To stop:**
```powershell
docker-compose down
```

---

### Option 2: Manual (Without Docker)

You'll need to start 4 separate PowerShell windows:

**Window 1 - Start Redis (required)**
```powershell
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Window 2 - Start API Server**
```powershell
npm run dev:server
```

**Window 3 - Start Worker**
```powershell
npm run dev:worker
```

**Window 4 - Start Frontend**
```powershell
cd client
npm run dev
```

Then open: http://localhost:3000

---

### Option 3: Quick Test (API Only)

If you just want to test the API without the full stack:

```powershell
# Make sure Redis is running
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Start API server
npm run dev:server

# In another window, test the health endpoint
curl http://localhost:3001/health
```

## 🎯 First Test Run

Once everything is running:

1. Open http://localhost:3000 in your browser
2. You should see a beautiful form with:
   - Business Niche input
   - Value Propositions inputs
   - Tone selector

3. Fill it out (example):
   ```
   Business Niche: Fitness Coaching
   Value Proposition 1: Personalized workout plans
   Value Proposition 2: Nutrition guidance included
   Tone: friendly
   ```

4. Click "🚀 Generate 50 Blog Posts"

5. You'll be redirected to the progress page showing:
   - Real-time progress bar
   - Phase A: Research status
   - Phase B: Content generation status
   - Estimated time remaining

6. After 12-17 minutes, you'll see all 50 generated blog posts!

## 🐛 Troubleshooting

### MongoDB Connection Error

**Error**: `MongoServerError: Authentication failed`

**Fix**:
1. Check your MongoDB Atlas connection string
2. Make sure you replaced `<password>` with actual password
3. Verify your IP is whitelisted in MongoDB Atlas:
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (allows all - for testing only)

### Gemini API Error

**Error**: `API key not valid`

**Fix**:
1. Get new API key from https://aistudio.google.com/app/apikey
2. Make sure there are no spaces or quotes around the key in `.env`
3. Restart your server after changing `.env`

### Port Already in Use

**Error**: `Port 3001 is already in use`

**Fix**:
```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change the port in .env
PORT=3002
```

### Redis Connection Error

**Error**: `Redis connection failed`

**Fix**:
```powershell
# Make sure Redis is running
docker ps | Select-String redis

# If not running, start it
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### Worker Not Processing Jobs

**Fix**:
1. Check worker logs: `docker-compose logs worker`
2. Verify Gemini API key is correct
3. Restart worker: `docker-compose restart worker`

## 📊 What to Expect

### Phase A: Deep Research
- **Duration**: 1-2 minutes
- **What happens**: AI analyzes your niche with Google Search
- **Output**: 50 unique persona/scenario data points

### Phase B: Content Generation
- **Duration**: 10-15 minutes
- **What happens**: AI generates 50 blog posts concurrently
- **Output**: 50 complete, SEO-optimized 1000-word blog posts

### Total Time
- **12-17 minutes** for complete job
- **Real-time progress updates** every 3 seconds

## 📁 Project Structure Quick Reference

```
agenticai/
├── .env                          ← YOU NEED TO EDIT THIS
├── client/.env.local             ← Already configured
├── server/index.js               ← API Server
├── worker/index.js               ← Worker Process
├── package.json                  ← Backend deps ✅ installed
└── client/package.json           ← Frontend deps ✅ installed
```

## 🎬 Visual Demo Flow

1. **Home Page** → Fill form with your business info
2. **Submit** → Creates job, returns immediately
3. **Progress Page** → Watch real-time progress
4. **Results Page** → View/download all 50 blog posts

## 💡 Pro Tips

1. **First run**: Use simple inputs to test (1-2 value propositions)
2. **Monitor logs**: Keep `docker-compose logs -f` running in a window
3. **API testing**: Test health endpoint first: `curl http://localhost:3001/health`
4. **Database**: Use MongoDB Compass to view data: https://www.mongodb.com/products/compass
5. **Redis GUI**: Use RedisInsight to view queues: https://redis.com/redis-enterprise/redis-insight/

## 🎯 Success Checklist

Before you start your first job, verify:

- [ ] MongoDB connection string is in `.env`
- [ ] Gemini API key is in `.env`
- [ ] Redis is running (Docker or local)
- [ ] API server responds to http://localhost:3001/health
- [ ] Frontend loads at http://localhost:3000
- [ ] Worker logs show "Worker started successfully"

## 🚨 Important Notes

1. **API Quotas**: Gemini API has rate limits. If you hit them, reduce `MAX_CONCURRENT_CONTENT_GENERATION` in `.env`

2. **Costs**: Gemini API has a free tier, but generating 50 blog posts will use tokens. Monitor your usage at https://aistudio.google.com/

3. **First Job**: Your first job might take longer as models warm up

4. **MongoDB Atlas**: Free tier is sufficient for testing (512MB storage)

## 🎉 You're Ready!

Once you've:
1. ✅ Added MongoDB connection string to `.env`
2. ✅ Added Gemini API key to `.env`
3. ✅ Run `docker-compose up -d` or manual setup

You can start generating content! 🚀

## 📚 Need More Help?

- **Setup Issues**: See `SETUP_GUIDE.md`
- **API Documentation**: See `README.md`
- **Deployment**: See `DEPLOYMENT.md`
- **Architecture**: See `PROJECT_STRUCTURE.md`

---

**Let's generate some amazing content! 🎊**

