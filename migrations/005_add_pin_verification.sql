-- Add pin_verification column to user_profiles table
-- This stores an encrypted constant that can be decrypted to verify the PIN
-- without storing the PIN itself

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pin_verification TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN user_profiles.pin_verification IS 'Encrypted verification constant used to validate PIN without storing it';
