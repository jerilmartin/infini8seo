-- Complete Schema Fix for infini8seo
-- Run this entire script in Supabase SQL Editor to fix all schema issues
-- This fixes 3 separate issues that are causing job failures

-- ============================================
-- Issue 1: Fix jobs table - Add missing columns
-- ============================================

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS credits_cost INTEGER DEFAULT 0;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS failed_content_count INTEGER DEFAULT 0;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS credits_refunded INTEGER DEFAULT 0;

-- ============================================
-- Issue 2: Fix contents table - Add missing columns
-- ============================================

ALTER TABLE contents 
ADD COLUMN IF NOT EXISTS blog_type VARCHAR(50) 
CHECK (blog_type IN ('functional', 'transactional', 'commercial', 'informational') OR blog_type IS NULL);

ALTER TABLE contents 
ADD COLUMN IF NOT EXISTS source_scenario_id INTEGER;

-- ============================================
-- Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_contents_blog_type ON contents(blog_type);

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON COLUMN jobs.user_id IS 'User who created this job';
COMMENT ON COLUMN jobs.credits_cost IS 'Total credits charged for this job';
COMMENT ON COLUMN jobs.failed_content_count IS 'Number of blog posts that failed to generate';
COMMENT ON COLUMN jobs.credits_refunded IS 'Credits refunded for failed blog posts';
COMMENT ON COLUMN contents.blog_type IS 'Content type: functional, transactional, commercial, or informational';
COMMENT ON COLUMN contents.source_scenario_id IS 'Phase A scenario ID used to generate this content';

-- ============================================
-- Verification queries
-- ============================================

-- Check jobs table columns
SELECT 
    'jobs table - Missing columns check' as verification,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('user_id', 'credits_cost', 'failed_content_count', 'credits_refunded')
ORDER BY column_name;

-- Check contents table columns
SELECT 
    'contents table - Missing columns check' as verification,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contents' 
AND column_name IN ('blog_type', 'source_scenario_id')
ORDER BY column_name;

-- Summary
SELECT 
    'Migration complete! All 6 missing columns should be listed above.' as status,
    'Note: The worker code has also been fixed to use correct credit transaction types.' as additional_info;
