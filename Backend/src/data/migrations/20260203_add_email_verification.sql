-- Add email verification columns to users table
-- Uses Supabase Auth for email verification, this just tracks verification status in user DB
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
