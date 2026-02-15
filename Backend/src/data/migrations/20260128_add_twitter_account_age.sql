-- Add Twitter account age tracking columns
-- Run this migration to track Twitter account creation date and age

ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_account_age_days INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_created_at TIMESTAMP WITH TIME ZONE;

-- Add comment to document the columns
COMMENT ON COLUMN users.twitter_account_age_days IS 'Age of Twitter account in days (used for 6+ month verification)';
COMMENT ON COLUMN users.twitter_created_at IS 'Original creation date of Twitter account (from Twitter API)';
