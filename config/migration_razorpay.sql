-- Add Razorpay columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

-- Optional: Remove Zoho columns if you really want to clean up (Uncomment to use)
-- ALTER TABLE users DROP COLUMN IF EXISTS zoho_customer_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS zoho_subscription_id;
