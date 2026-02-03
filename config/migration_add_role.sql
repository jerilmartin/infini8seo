-- Add role column to existing users table
-- Run this in Supabase SQL Editor

-- Add role column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Add comment
COMMENT ON COLUMN users.role IS 'User role - can only be set to admin via SQL, not through API';

-- Update existing users to have 'user' role if NULL
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Show current users and their roles
SELECT id, email, role, subscription_tier, credits_remaining 
FROM users 
LIMIT 10;
