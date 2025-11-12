# 🔧 Troubleshooting Guide

## Quick System Test

Before running the full system, always run the test script:

```bash
npm test
```

This will check:
- ✅ Environment variables
- ✅ File structure
- ✅ Supabase connection
- ✅ Redis connection
- ✅ Gemini API
- ✅ JSON mode + Google Search

---

## Common Errors & Solutions

### 1. ❌ "Invalid JSON response from Gemini API"

**Cause**: Gemini returned text instead of pure JSON, or the response format is unexpected.

**Solution**: 
- The system now has **automatic JSON extraction** that handles markdown code blocks
- If it still fails, check the Worker logs for "Response preview" to see what was actually returned
- The issue is now logged with first 2000 characters of the response

**Fixed in**: `worker/phaseA.js` - Added `extractJSON()` function with multiple fallback methods

---

### 2. ❌ "GEMINI_API_KEY not found in environment variables"

**Cause**: Environment variables not loaded before module initialization.

**Solution**: 
- Now uses **lazy initialization** - API key is loaded only when actually needed
- Make sure your `.env` file is in the project root
- Verify the file contains: `GEMINI_API_KEY=your_key_here`

**Fixed in**: `worker/phaseA.js` and `worker/phaseB.js` - Added `initGemini()` function called only when needed

---

### 3. ❌ "SUPABASE_URL and SUPABASE_ANON_KEY are required"

**Cause**: Supabase client initialized before dotenv loaded environment variables.

**Solution**: 
- Now uses **lazy initialization** in repositories
- The Supabase client is created only when first database operation is performed
- Check your `.env` file has both `SUPABASE_URL` and `SUPABASE_ANON_KEY`

**Fixed in**: `models/JobRepository.js` and `models/ContentRepository.js` - Added getter for lazy client initialization

---

### 4. ❌ "Could not find the table 'public.jobs'"

**Cause**: Database tables not created in Supabase.

**Solution**:
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Open `config/schema.sql` from this project
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click **RUN**
7. Restart your API and Worker

**Prevention**: The system now checks for this specific error and provides helpful instructions

---

### 5. ❌ "Redis connection error: ECONNREFUSED"

**Cause**: Redis server is not running.

**Solution**:
```bash
# Option 1: Start Redis with Docker (recommended)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Option 2: Check if Redis container exists but is stopped
docker start redis

# Option 3: Check if Docker Desktop is running
# Open Docker Desktop application
```

**Verify**:
```bash
docker ps
# Should show redis container running
```

---

### 6. ❌ "API key not valid. Please pass a valid API key"

**Cause**: 
- API key was being accessed before environment variables were loaded
- Or the API key is actually invalid

**Solution**:
1. **Now fixed with lazy initialization** - API key loads when actually needed
2. Verify your API key at: https://aistudio.google.com/app/apikey
3. Make sure the key in `.env` matches exactly (no extra spaces)
4. Test your API key: `npm test`

**Fixed in**: `worker/phaseA.js` and `worker/phaseB.js` - Added lazy init for `genAI` client

---

### 7. ❌ "Content blocked: SAFETY"

**Cause**: Gemini's safety filters blocked the content generation.

**Solution**:
- The system now detects this and provides a clear error message
- Try using different, more neutral language in your niche description
- Avoid sensitive topics (medical advice, financial advice, etc.)

**Fixed in**: `worker/phaseA.js` and `worker/phaseB.js` - Added safety check before parsing response

---

### 8. ❌ Frontend: "The `prose` class does not exist"

**Cause**: Tailwind CSS `@apply prose` directive used without `@tailwindcss/typography` plugin.

**Solution**: 
- **Already fixed** - Removed `@apply prose` and added manual CSS styles
- If you still see this, run: `cd client && npm install && npm run build`

**Fixed in**: `client/app/globals.css` - Replaced `@apply` with explicit CSS

---

### 9. ❌ Worker crashes during Phase B

**Cause**: Too many concurrent API calls overwhelming the system.

**Solution**:
- Adjust concurrency in `.env`: `MAX_CONCURRENT_CONTENT_GENERATION=5`
- Lower numbers = more stable but slower
- Higher numbers = faster but may hit rate limits
- Default is 10 which works for most cases

**Location**: Set in `.env`, used in `worker/phaseB.js`

---

### 10. ⚠️ "Only X scenarios generated, expected 50"

**Cause**: Gemini didn't generate all 50 scenarios in one response.

**Solution**:
- The system now **auto-accepts** whatever was generated and proceeds
- It will validate and fill in missing fields
- If less than 50, it will use what's available
- The warning is logged but doesn't stop the process

**Fixed in**: `worker/phaseA.js` - Changed from error to warning, proceeds with available scenarios

---

## System Architecture Quick Reference

```
┌─────────────┐
│   Frontend  │ (Next.js on :3000)
│  (Polling)  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  API Server │ (Express on :3001)
│  (Gateway)  │
└──────┬──────┘
       │
       ↓
┌─────────────┐      ┌──────────────┐
│    Redis    │←────→│    Worker    │
│   (Queue)   │      │ (BullMQ Job) │
└─────────────┘      └───────┬──────┘
                             │
                   ┌─────────┴─────────┐
                   ↓                   ↓
            ┌──────────┐        ┌──────────┐
            │ Gemini   │        │ Supabase │
            │   API    │        │ Database │
            └──────────┘        └──────────┘
```

---

## Startup Checklist

Before starting the system, verify:

- [ ] Docker Desktop is running
- [ ] Redis container is started
- [ ] `.env` file exists with all credentials
- [ ] Supabase tables are created (`config/schema.sql` run)
- [ ] `npm install` completed in root directory
- [ ] `npm install` completed in `client/` directory
- [ ] Run `npm test` to verify all connections

---

## Log Files & Debugging

### Check Worker Logs
Worker logs show detailed Phase A and Phase B execution:
- JSON response previews
- API call timing
- Scenario validation
- Blog post generation progress

### Check API Logs
API logs show:
- Incoming requests
- Job creation
- Queue status
- Database operations

### Enable Verbose Logging
Add to `.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

---

## Performance Tuning

### Speed up content generation:
```env
MAX_CONCURRENT_CONTENT_GENERATION=15  # Increase from 10
```

### Reduce memory usage:
```env
MAX_CONCURRENT_CONTENT_GENERATION=5   # Decrease from 10
```

### Adjust Redis timeout:
```env
REQUEST_TIMEOUT_MS=600000  # 10 minutes
```

---

## Still Having Issues?

1. **Run the test script**: `npm test`
2. **Check all logs** in the Worker and API terminal windows
3. **Review the error messages** - they now include detailed context
4. **Check `logs/` directory** for complete error traces
5. **Verify all environment variables** are set correctly

---

## Contact & Support

- Check `README.md` for setup instructions
- Review `PROJECT_STRUCTURE.md` for code organization
- See `SETUP_GUIDE.md` for detailed environment setup

---

**Last Updated**: Fixed all JSON parsing, environment loading, and connection issues.

