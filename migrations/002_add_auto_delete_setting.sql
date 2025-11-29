-- Add auto_delete_days setting to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS auto_delete_days INTEGER DEFAULT 30;

-- Add is_deleted columns for soft delete
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE vaults 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_is_deleted ON items(is_deleted, deleted_at);
CREATE INDEX IF NOT EXISTS idx_vaults_is_deleted ON vaults(is_deleted, deleted_at);

-- Comments
COMMENT ON COLUMN user_settings.auto_delete_days IS 'Number of days before auto-deleting items from trash. 0 = never auto-delete';
COMMENT ON COLUMN items.is_deleted IS 'Soft delete flag for trash functionality';
COMMENT ON COLUMN vaults.is_deleted IS 'Soft delete flag for trash functionality';
