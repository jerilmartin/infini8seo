-- Migration: Add target_word_count column to jobs table
-- Run this in Supabase SQL Editor

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS target_word_count INTEGER NOT NULL DEFAULT 1200 
CHECK (target_word_count >= 500 AND target_word_count <= 2500);

-- Add comment
COMMENT ON COLUMN jobs.target_word_count IS 'Target word count for each blog post (500-2500 words)';
