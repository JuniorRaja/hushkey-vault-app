-- Create app_notifications table
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'SECURITY', 'ALERT', 'INFO', 'SUCCESS'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for faster queries by user and read status
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at ON app_notifications(created_at);

-- RLS Policies
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON app_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON app_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON app_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON app_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
