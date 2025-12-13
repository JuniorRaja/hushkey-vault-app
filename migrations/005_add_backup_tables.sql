-- Create backup_history table
CREATE TABLE IF NOT EXISTS backup_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('csv', 'zip', 'hkb')),
  created_at TIMESTAMP DEFAULT NOW(),
  item_count INTEGER,
  file_size_bytes BIGINT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_backup_history_user ON backup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at DESC);

-- Add backup columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS last_backup_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS backup_reminder_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS backup_frequency_days INTEGER DEFAULT 30;

-- Enable RLS
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own backup history"
  ON backup_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup history"
  ON backup_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE backup_history IS 'Tracks user backup history and metadata';
COMMENT ON COLUMN user_settings.last_backup_at IS 'Timestamp of last successful backup';
COMMENT ON COLUMN user_settings.backup_reminder_enabled IS 'Whether to show backup reminders';
COMMENT ON COLUMN user_settings.backup_frequency_days IS 'Recommended backup frequency in days';
