-- HushKey Vault - Database Schema: Backup
-- Part 6: Backup history tracking
-- Run in order: 001 -> 007

BEGIN;

-- ============================================================================
-- BACKUP HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('csv', 'zip', 'hkb')),
    created_at TIMESTAMP DEFAULT NOW(),
    item_count INTEGER,
    file_size_bytes BIGINT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_backup_history_user ON backup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own backup history" ON backup_history;
CREATE POLICY "Users can view own backup history" ON backup_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own backup history" ON backup_history;
CREATE POLICY "Users can insert own backup history" ON backup_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE backup_history IS 'Tracks user backup history and metadata';

COMMIT;
