-- Migration: Add social link fields to users
-- Created: 2026-01-28

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(255),
  ADD COLUMN IF NOT EXISTS twitter_linked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS discord_handle VARCHAR(255),
  ADD COLUMN IF NOT EXISTS discord_linked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS telegram_handle VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Optionally, you may populate `email_verified_at` from any existing verification records if you keep that elsewhere.
