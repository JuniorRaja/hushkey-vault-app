-- Create biometric credentials table
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own biometric credentials"
  ON biometric_credentials
  FOR ALL
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_biometric_credentials_user_id ON biometric_credentials(user_id);
