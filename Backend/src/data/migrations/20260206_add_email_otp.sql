-- Add OTP fields for email verification (2025-02-06)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS email_otp_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_otp_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_otp_verified BOOLEAN DEFAULT false;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_email_otp ON users(email_otp) WHERE email_otp IS NOT NULL;
