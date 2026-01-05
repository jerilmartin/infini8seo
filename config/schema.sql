-- Content Factory Database Schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor to create tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User Input
    niche VARCHAR(500) NOT NULL,
    value_propositions TEXT[] NOT NULL,
    tone VARCHAR(50) NOT NULL CHECK (tone IN ('professional', 'conversational', 'authoritative', 'friendly', 'technical', 'casual')),
    total_blogs INTEGER NOT NULL DEFAULT 50 CHECK (total_blogs >= 1 AND total_blogs <= 50),
    blog_type_allocations JSONB,
    target_word_count INTEGER NOT NULL DEFAULT 1200 CHECK (target_word_count >= 500 AND target_word_count <= 2500),
    
    -- Job Status & Progress
    status VARCHAR(50) NOT NULL DEFAULT 'ENQUEUED' CHECK (status IN ('ENQUEUED', 'RESEARCHING', 'RESEARCH_COMPLETE', 'GENERATING', 'COMPLETE', 'FAILED')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Phase A Output (Research Foundation)
    scenarios JSONB,
    
    -- Metadata
    total_content_generated INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contents Table
CREATE TABLE IF NOT EXISTS contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference to parent Job
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Scenario Reference
    scenario_id INTEGER NOT NULL,
    
    -- Content Metadata
    blog_title VARCHAR(500) NOT NULL,
    persona_archetype VARCHAR(255) NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    blog_type VARCHAR(50) CHECK (blog_type IN ('functional', 'transactional', 'commercial', 'informational') OR blog_type IS NULL),
    source_scenario_id INTEGER,
    
    -- The Core Content (Large Text Field)
    blog_content TEXT NOT NULL,
    
    -- Content Statistics
    word_count INTEGER NOT NULL,
    character_count INTEGER,
    
    -- SEO & Marketing Data
    meta_description VARCHAR(160),
    slug VARCHAR(500),
    
    -- Generation Metadata
    generation_time_ms INTEGER,
    model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    image_urls JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'COMPLETED' CHECK (status IN ('GENERATING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(job_id, scenario_id)
);

-- SEO Scans Table
CREATE TABLE IF NOT EXISTS seo_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    domain VARCHAR(500) NOT NULL,
    
    -- Status & Progress
    status VARCHAR(50) DEFAULT 'ENQUEUED'
        CHECK (status IN ('ENQUEUED', 'SCANNING', 'COMPLETE', 'FAILED')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step VARCHAR(100),
    
    -- Results (all labeled as Observed/Sampled/AI-Inferred)
    results JSONB,
    -- Example structure:
    -- {
    --   "observed_keywords": [...],
    --   "sampled_positions": [{ "keyword": "...", "position": 6 }],
    --   "serp_competitors": { "direct": [...], "content": [...] },
    --   "domain_age": { "years": 5, "registrar": "...", "created": "..." },
    --   "health_score": 72,
    --   "recommendations": [...]
    -- }
    
    -- Data source for scalability
    data_source VARCHAR(50) DEFAULT 'manual_serp'
        CHECK (data_source IN ('manual_serp', 'dataforseo')),
    
    -- Error handling
    error_message TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_niche ON jobs(niche);
CREATE INDEX IF NOT EXISTS idx_contents_job_id ON contents(job_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_slug ON contents(slug);
CREATE INDEX IF NOT EXISTS idx_seo_scans_status ON seo_scans(status);
CREATE INDEX IF NOT EXISTS idx_seo_scans_domain ON seo_scans(domain);
CREATE INDEX IF NOT EXISTS idx_seo_scans_created_at ON seo_scans(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_scans_updated_at BEFORE UPDATE ON seo_scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, for future multi-tenancy)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_scans ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for service role)
CREATE POLICY "Enable all access for service role" ON jobs
    FOR ALL USING (true);

CREATE POLICY "Enable all access for service role" ON contents
    FOR ALL USING (true);

CREATE POLICY "Enable all access for service role" ON seo_scans
    FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE jobs IS 'Stores content generation job metadata and status';
COMMENT ON TABLE contents IS 'Stores generated blog post content';
COMMENT ON TABLE seo_scans IS 'Stores SEO scan jobs and results';
COMMENT ON COLUMN jobs.scenarios IS 'JSONB array of 50 persona/scenario objects from Phase A';
COMMENT ON COLUMN jobs.value_propositions IS 'Array of business value propositions';
COMMENT ON COLUMN contents.blog_content IS 'Full blog post content in Markdown format';
COMMENT ON COLUMN contents.blog_type IS 'Requested blog intent/type for this post';
COMMENT ON COLUMN contents.source_scenario_id IS 'Scenario identifier from Phase A used to seed this post';
COMMENT ON COLUMN contents.image_urls IS 'Array of Unsplash image metadata attached to the blog post';
COMMENT ON COLUMN seo_scans.results IS 'JSONB containing observed keywords, sampled positions, competitors, domain age, health score';

