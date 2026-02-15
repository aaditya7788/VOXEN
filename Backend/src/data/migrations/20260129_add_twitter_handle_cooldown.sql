-- Migration: Add twitter_handle_cooldowns table
-- This table tracks cooldowns for disconnected Twitter handles

CREATE TABLE IF NOT EXISTS twitter_handle_cooldowns (
    id SERIAL PRIMARY KEY,
    twitter_handle VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    disconnected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cooldown_until TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT unique_handle_cooldown UNIQUE (twitter_handle)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_twitter_handle_cooldown_handle ON twitter_handle_cooldowns (twitter_handle);
