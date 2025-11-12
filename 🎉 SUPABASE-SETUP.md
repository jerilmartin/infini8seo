# Content Factory - Supabase Setup Guide

## 🎉 **We've Switched to Supabase!**

MongoDB has been replaced with **Supabase (PostgreSQL)**. This is **much easier** to set up!

---

## ✅ **What Changed:**

- ❌ MongoDB → ✅ Supabase (PostgreSQL)
- ❌ Mongoose → ✅ Supabase JS Client
- ✅ Redis/BullMQ (unchanged - still used for queue)
- ✅ Everything else stays the same

---

## 🚀 **Setup Steps (5 Minutes Total!)**

### **Step 1: Create Supabase Account (2 minutes)** - FREE!

1. Go to: **https://supabase.com**
2. Click "Start your project"
3. Sign up with GitHub (easiest) or email
4. Create a new organization (or use existing)

### **Step 2: Create New Project (1 minute)**

1. Click "New Project"
2. Fill in:
   - **Name**: `content-factory` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
3. Click "Create new project"
4. Wait ~2 minutes for database to spin up ☕

### **Step 3: Get Your API Credentials (1 minute)**

1. In your Supabase dashboard, click on your project
2. Go to **Settings** (⚙️ icon) → **API**
3. You'll see two values:
   
   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   
   **Anon/Public Key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Copy both values!**

### **Step 4: Run Database Migration (1 minute)**

1. In Supabase dashboard, click **SQL Editor** (on left sidebar)
2. Click "New Query"
3. Copy the entire contents of `config/schema.sql` file
4. Paste into the SQL editor
5. Click **RUN** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

✅ **Your database tables are now created!**

### **Step 5: Update `.env` File (1 minute)**

Open `.env` file and update these lines:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Google Gemini AI API (still needed)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Replace:**
- `SUPABASE_URL` with your Project URL
- `SUPABASE_ANON_KEY` with your Anon/Public key
- `GEMINI_API_KEY` with your Gemini API key (from https://aistudio.google.com/app/apikey)

---

## 🎯 **That's It! Now Run the App:**

```powershell
# Option 1: Manual start (3 windows)
.\START-MANUALLY.bat

# Option 2: With Docker (if you have Docker)
.\START-WITH-DOCKER.bat
```

---

## 📊 **Verify Setup:**

### **Check Database Tables:**

1. Go to Supabase dashboard
2. Click **Table Editor** (on left sidebar)
3. You should see two tables:
   - ✅ `jobs`
   - ✅ `contents`

### **Test API:**

```powershell
# Test health endpoint
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "uptime": 123.456,
  "service": "Content Factory API"
}
```

---

## 📁 **Database Schema:**

### **Jobs Table** (stores job metadata)
- `id` - UUID (primary key)
- `niche` - Business niche
- `value_propositions` - Array of value props
- `tone` - Content tone
- `status` - Job status
- `progress` - 0-100%
- `scenarios` - JSONB array of 50 scenarios
- `total_content_generated` - Counter
- Timestamps: `created_at`, `updated_at`

### **Contents Table** (stores generated blog posts)
- `id` - UUID (primary key)
- `job_id` - Foreign key to jobs table
- `scenario_id` - Scenario number (1-50)
- `blog_title` - Post title
- `blog_content` - Full markdown content
- `keywords` - Array of SEO keywords
- `word_count` - Word count
- `slug` - URL-friendly slug
- `meta_description` - SEO description
- Timestamps: `created_at`, `updated_at`

---

## 🔐 **Security Notes:**

1. **Never commit** `.env` file to Git ✅ Already in `.gitignore`
2. **Anon Key is safe** to use in frontend (it's public by design)
3. **Service Role Key** (if you see it) should NEVER be exposed
4. **Row Level Security (RLS)** is enabled but set to allow all for service role

---

## 💡 **Advantages of Supabase:**

✅ **Easier Setup** - No MongoDB Atlas configuration  
✅ **Free Tier** - 500MB database, 2GB bandwidth/month  
✅ **Built-in API** - REST and GraphQL endpoints  
✅ **Real-time** - WebSocket support (for future features)  
✅ **Better Dashboard** - Easy to view and manage data  
✅ **PostgreSQL** - More powerful than MongoDB for complex queries  

---

## 🐛 **Troubleshooting:**

### **Error: "SUPABASE_URL and SUPABASE_ANON_KEY are required"**
**Fix:** Make sure you updated `.env` file with your actual Supabase credentials

### **Error: "relation 'jobs' does not exist"**
**Fix:** Run the SQL migration script in Supabase SQL Editor (`config/schema.sql`)

### **Error: "Failed to connect"**
**Fix:** Check your internet connection and verify Supabase URL is correct

### **Want to view/edit data manually?**
1. Go to Supabase dashboard
2. Click **Table Editor**
3. Select `jobs` or `contents` table
4. You can view, edit, or delete records

---

## 📚 **Next Steps:**

1. ✅ Set up Supabase (you just did!)
2. ✅ Get Gemini API key: https://aistudio.google.com/app/apikey
3. ✅ Update `.env` file
4. 🚀 Run the application!

---

## 🎊 **Benefits Over MongoDB:**

| Feature | MongoDB Atlas | Supabase | Winner |
|---------|---------------|----------|--------|
| Setup Time | ~10 min | ~5 min | ✅ Supabase |
| Free Tier | 512MB | 500MB | Tie |
| Dashboard | Good | Excellent | ✅ Supabase |
| SQL Support | No | Yes | ✅ Supabase |
| Real-time | Via Change Streams | Built-in | ✅ Supabase |
| Learning Curve | Medium | Easy | ✅ Supabase |

---

**Ready to generate content? Open http://localhost:3000 after starting the services!** 🚀

