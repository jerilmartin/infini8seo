-- Subscription & Credit System Migration
-- Run this in Supabase SQL Editor after migration_auth.sql

-- Users Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Role (can only be set via SQL, not through API)
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    
    -- Subscription Info
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro')),
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'past_due')),
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    subscription_cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Credits
    credits_remaining INTEGER DEFAULT 10 CHECK (credits_remaining >= 0),
    credits_total INTEGER DEFAULT 10,
    credits_used INTEGER DEFAULT 0,
    credits_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment Info (for Stripe/Razorpay)
    stripe_customer_id VARCHAR(255),
    razorpay_customer_id VARCHAR(255),
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Credit Transactions Table (audit log)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction Details
    type VARCHAR(50) NOT NULL CHECK (type IN ('debit', 'credit', 'refund', 'bonus', 'subscription_renewal')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    -- Related Entity
    related_entity_type VARCHAR(50) CHECK (related_entity_type IN ('job', 'seo_scan', 'subscription', 'manual')),
    related_entity_id UUID,
    
    -- Description
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions Table (payment history)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Subscription Details
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('starter', 'pro')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'failed')),
    
    -- Pricing
    amount_paid DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    credits_granted INTEGER NOT NULL,
    
    -- Payment Provider
    payment_provider VARCHAR(50) CHECK (payment_provider IN ('stripe', 'razorpay', 'manual')),
    payment_id VARCHAR(255),
    payment_status VARCHAR(50),
    
    -- Period
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS credits_cost INTEGER DEFAULT 0;

-- Add user_id to seo_scans table
ALTER TABLE seo_scans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE seo_scans ADD COLUMN IF NOT EXISTS credits_cost INTEGER DEFAULT 20;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer ON users(razorpay_customer_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_scans_user_id ON seo_scans(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate credit cost for blog generation
CREATE OR REPLACE FUNCTION calculate_blog_credits(blog_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF blog_count <= 10 THEN
        RETURN blog_count * 5;
    ELSIF blog_count <= 30 THEN
        RETURN blog_count * 4;
    ELSE
        RETURN blog_count * 3;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION check_user_credits(p_user_id UUID, p_required_credits INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_credits_remaining INTEGER;
BEGIN
    SELECT credits_remaining INTO v_credits_remaining
    FROM users
    WHERE id = p_user_id;
    
    RETURN v_credits_remaining >= p_required_credits;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Get current balance
    SELECT credits_remaining INTO v_balance_before
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if enough credits
    IF v_balance_before < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct credits
    UPDATE users
    SET credits_remaining = credits_remaining - p_amount,
        credits_used = credits_used + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits_remaining INTO v_balance_after;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        related_entity_type,
        related_entity_id,
        description
    ) VALUES (
        p_user_id,
        'debit',
        p_amount,
        v_balance_before,
        v_balance_after,
        p_entity_type,
        p_entity_id,
        p_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Get current balance
    SELECT credits_remaining INTO v_balance_before
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Add credits
    UPDATE users
    SET credits_remaining = credits_remaining + p_amount,
        credits_total = credits_total + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits_remaining INTO v_balance_after;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        description
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        v_balance_before,
        v_balance_after,
        p_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (true);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to transactions" ON credit_transactions
    FOR ALL USING (true);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to subscriptions" ON subscriptions
    FOR ALL USING (true);

-- RLS Policies for jobs (update existing)
DROP POLICY IF EXISTS "Enable all access for service role" ON jobs;
CREATE POLICY "Users can view own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role has full access to jobs" ON jobs
    FOR ALL USING (true);

-- RLS Policies for seo_scans (update existing)
DROP POLICY IF EXISTS "Enable all access for service role" ON seo_scans;
CREATE POLICY "Users can view own scans" ON seo_scans
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create scans" ON seo_scans
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role has full access to scans" ON seo_scans
    FOR ALL USING (true);

-- Comments
COMMENT ON TABLE users IS 'User profiles with subscription and credit information';
COMMENT ON COLUMN users.role IS 'User role - can only be set to admin via SQL, not through API';
COMMENT ON TABLE credit_transactions IS 'Audit log of all credit transactions';
COMMENT ON TABLE subscriptions IS 'Subscription payment history';
COMMENT ON FUNCTION calculate_blog_credits IS 'Calculate credit cost based on blog count with tiered pricing';
COMMENT ON FUNCTION check_user_credits IS 'Check if user has sufficient credits';
COMMENT ON FUNCTION deduct_credits IS 'Deduct credits from user account with transaction logging';
COMMENT ON FUNCTION add_credits IS 'Add credits to user account with transaction logging';

-- ============================================================================
-- ADMIN SETUP INSTRUCTIONS
-- ============================================================================
-- To make a user an admin, run this SQL in Supabase SQL Editor:
-- 
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE email = 'your-admin-email@example.com';
--
-- SECURITY: The role column cannot be updated through the API, only via SQL
-- ============================================================================
