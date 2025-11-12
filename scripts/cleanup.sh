#!/bin/bash

# Content Factory - Cleanup Script
# Removes old jobs and content from the database

echo "🧹 Content Factory - Database Cleanup"
echo "======================================"
echo ""

read -p "This will delete jobs older than 30 days. Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI not found in .env"
    exit 1
fi

echo "Connecting to MongoDB..."

# Calculate date 30 days ago
THIRTY_DAYS_AGO=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -v-30d +%Y-%m-%dT%H:%M:%S.000Z)

# MongoDB cleanup commands
mongosh "$MONGODB_URI" --eval "
  const cutoffDate = new Date('$THIRTY_DAYS_AGO');
  
  // Find old jobs
  const oldJobs = db.jobs.find({ createdAt: { \$lt: cutoffDate } }).toArray();
  console.log('Found ' + oldJobs.length + ' old jobs');
  
  if (oldJobs.length > 0) {
    // Delete associated content
    const jobIds = oldJobs.map(j => j._id);
    const contentResult = db.contents.deleteMany({ jobId: { \$in: jobIds } });
    console.log('Deleted ' + contentResult.deletedCount + ' content documents');
    
    // Delete jobs
    const jobResult = db.jobs.deleteMany({ _id: { \$in: jobIds } });
    console.log('Deleted ' + jobResult.deletedCount + ' job documents');
    
    console.log('✅ Cleanup complete!');
  } else {
    console.log('No old jobs to clean up');
  }
"

echo ""
echo "Cleanup finished!"

