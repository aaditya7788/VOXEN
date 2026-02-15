-- Remove contract_address column from proposals table
-- This migration removes the contract_address field as it's no longer needed
-- Contract addresses will be passed as parameters when needed instead of being stored

ALTER TABLE proposals DROP COLUMN IF EXISTS contract_address;
