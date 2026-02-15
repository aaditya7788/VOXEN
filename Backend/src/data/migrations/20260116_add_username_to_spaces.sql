-- Migration: Add username to spaces table (unique)
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Backfill existing rows with slug where username is NULL
UPDATE spaces SET username = slug WHERE username IS NULL;
