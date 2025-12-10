-- Add biometric_enabled setting to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE;

-- Comment
COMMENT ON COLUMN user_settings.biometric_enabled IS 'Whether biometric authentication is enabled for the user';
