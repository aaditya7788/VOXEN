-- Migration: Add content hash support for hash-optimized proposals
-- Date: 2026-02-13
-- Description: Adds content_hash and is_hash_verified columns to proposals table

-- Add content_hash column to store keccak256 hash
ALTER TABLE proposals 
ADD COLUMN content_hash VARCHAR(66) DEFAULT NULL 
COMMENT 'keccak256 hash of title + description + options';

-- Add verification flag
ALTER TABLE proposals 
ADD COLUMN is_hash_verified BOOLEAN DEFAULT FALSE 
COMMENT 'Whether content hash has been verified against blockchain';

-- Add index for faster hash lookups
CREATE INDEX idx_proposals_content_hash ON proposals(content_hash);

-- Add index for verification status
CREATE INDEX idx_proposals_hash_verified ON proposals(is_hash_verified);
