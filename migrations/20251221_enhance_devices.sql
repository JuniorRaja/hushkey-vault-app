-- Migration: Enhance devices table for robust session tracking
-- Date: 2025-12-21

-- Add new columns to devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS fingerprint text,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS last_active timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_trusted boolean DEFAULT false;

-- Create index for faster fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(user_id, fingerprint);

-- Update RLS policies if needed (existing usually cover "user matches user_id")
-- Ensure update policy allows users to update their own device 'last_active'
CREATE POLICY "Users can update their own devices" 
ON devices FOR UPDATE 
USING (auth.uid() = user_id);
