-- Migration: Add encrypted share key column
-- Store share encryption keys encrypted with user's master key

BEGIN;

-- Add column to store encrypted share key
ALTER TABLE shares 
ADD COLUMN IF NOT EXISTS encrypted_share_key TEXT;

COMMIT;
