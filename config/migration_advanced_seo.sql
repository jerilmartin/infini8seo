-- Advanced SEO Features Migration
-- Adds competitor tracking, historical rankings, and action items

-- Competitor Tracking Table
CREATE TABLE IF NOT EXISTS tracked_competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES seo_scans(id) ON DELETE CASCADE,
    domain VARCHAR(500) NOT NULL,
    competitor_domain VARCHAR(500) NOT NULL,
    
    -- Competitor metrics
    appearances INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    keywords_ranking_for TEXT[],
    serp_features_owned JSONB, -- { "featured_snippets": 3, "paa": 5, etc }
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(scan_id, competitor_domain)
);

-- Historical Rankings Table (for tracking over time)
CREATE TABLE IF NOT EXISTS ranking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(500) NOT NULL,
    keyword VARCHAR(500) NOT NULL,
    position INTEGER,
    
    -- SERP features at this point in time
    has_featured_snippet BOOLEAN DEFAULT FALSE,
    has_paa BOOLEAN DEFAULT FALSE,
    has_local_pack BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    scan_id UUID REFERENCES seo_scans(id) ON DELETE SET NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for fast queries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Action Items Table (prioritized tasks)
CREATE TABLE IF NOT EXISTS seo_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES seo_scans(id) ON DELETE CASCADE,
    
    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10), -- 1 = highest
    impact VARCHAR(20) CHECK (impact IN ('High', 'Medium', 'Low')),
    effort VARCHAR(20) CHECK (effort IN ('High', 'Medium', 'Low')),
    timeline VARCHAR(100), -- e.g., "2 weeks", "1 month"
    
    -- Task type
    category VARCHAR(50), -- 'technical', 'content', 'keywords', 'competitors'
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Recommendations Table (blog topic suggestions)
CREATE TABLE IF NOT EXISTS content_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES seo_scans(id) ON DELETE CASCADE,
    
    -- Recommendation details
    topic VARCHAR(500) NOT NULL,
    keyword VARCHAR(500),
    search_intent VARCHAR(50), -- 'transactional', 'informational', 'navigational'
    
    -- Opportunity metrics
    difficulty VARCHAR(20), -- 'Easy', 'Medium', 'Hard', 'Very Hard'
    opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
    estimated_traffic INTEGER, -- rough estimate based on total_results
    
    -- Gap analysis
    competitors_ranking TEXT[], -- which competitors rank for this
    reason TEXT, -- why this is recommended
    
    -- Status
    status VARCHAR(20) DEFAULT 'suggested' CHECK (status IN ('suggested', 'planned', 'in_progress', 'published', 'rejected')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracked_competitors_scan_id ON tracked_competitors(scan_id);
CREATE INDEX IF NOT EXISTS idx_tracked_competitors_domain ON tracked_competitors(domain);
CREATE INDEX IF NOT EXISTS idx_ranking_history_domain_keyword ON ranking_history(domain, keyword);
CREATE INDEX IF NOT EXISTS idx_ranking_history_checked_at ON ranking_history(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_scan_id ON seo_action_items(scan_id);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_priority ON seo_action_items(priority);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_status ON seo_action_items(status);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_scan_id ON content_recommendations(scan_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_status ON content_recommendations(status);

-- Triggers for updated_at
CREATE TRIGGER update_tracked_competitors_updated_at BEFORE UPDATE ON tracked_competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_action_items_updated_at BEFORE UPDATE ON seo_action_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_recommendations_updated_at BEFORE UPDATE ON content_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tracked_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for service role)
CREATE POLICY "Enable all access for service role" ON tracked_competitors FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON ranking_history FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON seo_action_items FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON content_recommendations FOR ALL USING (true);

-- Comments
COMMENT ON TABLE tracked_competitors IS 'Tracks up to 5 competitors per domain with their SERP performance';
COMMENT ON TABLE ranking_history IS 'Historical keyword rankings for tracking progress over time';
COMMENT ON TABLE seo_action_items IS 'Prioritized action items generated from SEO scans';
COMMENT ON TABLE content_recommendations IS 'Blog topic suggestions based on content gaps and opportunities';
