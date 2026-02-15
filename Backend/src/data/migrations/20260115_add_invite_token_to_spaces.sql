-- Migration: Add invite_token to spaces table
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64) UNIQUE;

-- Backfill: Set invite_token for existing rows
UPDATE spaces SET invite_token = gen_random_uuid() WHERE invite_token IS NULL;
