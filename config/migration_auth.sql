-- Migration: Add user authentication support
-- Run this in Supabase SQL Editor after enabling Google Auth in Authentication settings

-- =============================================================================
-- STEP 1: Add user_id column to existing tables
-- =============================================================================

-- Add user_id to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to seo_scans table
ALTER TABLE seo_scans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_scans_user_id ON seo_scans(user_id);

-- =============================================================================
-- STEP 2: Create user profiles table (optional, for extended user info)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =============================================================================
-- STEP 3: Update Row Level Security Policies
-- =============================================================================

-- Drop existing open policies
DROP POLICY IF EXISTS "Enable all access for service role" ON jobs;
DROP POLICY IF EXISTS "Enable all access for service role" ON contents;
DROP POLICY IF EXISTS "Enable all access for service role" ON seo_scans;

-- Jobs policies - users can only see/manage their own jobs
CREATE POLICY "Users can view their own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can access all jobs (for worker processes)
CREATE POLICY "Service role can access all jobs" ON jobs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Contents policies - users can access content from their own jobs
CREATE POLICY "Users can view content from their jobs" ON contents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = contents.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create content for their jobs" ON contents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = contents.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete content from their jobs" ON contents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = contents.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- Service role can access all contents
CREATE POLICY "Service role can access all contents" ON contents
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- SEO Scans policies - users can only see/manage their own scans
CREATE POLICY "Users can view their own scans" ON seo_scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans" ON seo_scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" ON seo_scans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans" ON seo_scans
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can access all scans
CREATE POLICY "Service role can access all scans" ON seo_scans
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- STEP 4: Create function to automatically create profile on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 5: Comments for documentation
-- =============================================================================

COMMENT ON TABLE profiles IS 'User profile information synced from auth.users';
COMMENT ON COLUMN jobs.user_id IS 'Reference to the user who created this job';
COMMENT ON COLUMN seo_scans.user_id IS 'Reference to the user who created this scan';
