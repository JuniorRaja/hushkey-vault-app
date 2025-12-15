-- HushKey Vault - Database Schema: Sharing
-- Part 5: Shares and share access logs
-- Run in order: 001 -> 007

BEGIN;

-- ============================================================================
-- SHARES
-- ============================================================================

CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('item', 'vault')),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
    share_method VARCHAR(20) NOT NULL CHECK (share_method IN ('in_app', 'qr', 'url')),
    share_token VARCHAR(255) UNIQUE NOT NULL,
    encrypted_data TEXT NOT NULL,
    encrypted_share_key TEXT,
    encryption_key_hint TEXT,
    
    -- Access controls
    expires_at TIMESTAMPTZ,
    max_views INTEGER DEFAULT NULL,
    view_count INTEGER DEFAULT 0,
    one_time_access BOOLEAN DEFAULT FALSE,
    password_protected BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    
    -- Recipients (for in-app sharing)
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    
    -- Constraints
    CHECK (
        (share_type = 'item' AND item_id IS NOT NULL AND vault_id IS NULL) OR
        (share_type = 'vault' AND vault_id IS NOT NULL AND item_id IS NULL)
    )
);

-- ============================================================================
-- SHARE ACCESS LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS share_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    access_granted BOOLEAN NOT NULL,
    failure_reason VARCHAR(100)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(share_token);
CREATE INDEX IF NOT EXISTS idx_shares_recipient ON shares(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_shares_expiry ON shares(expires_at, revoked);
CREATE INDEX IF NOT EXISTS idx_share_logs_share ON share_access_logs(share_id, accessed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- Shares policies
DROP POLICY IF EXISTS "Users manage own shares" ON shares;
CREATE POLICY "Users manage own shares" ON shares
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view received shares" ON shares;
CREATE POLICY "Users view received shares" ON shares
    FOR SELECT USING (auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Allow public read access to shares" ON shares;
CREATE POLICY "Allow public read access to shares" ON shares
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create shares" ON shares;
CREATE POLICY "Allow authenticated users to create shares" ON shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their own shares" ON shares;
CREATE POLICY "Allow users to update their own shares" ON shares
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow public to update ONLY tracking columns
DROP POLICY IF EXISTS "Allow public to update share tracking" ON shares;
CREATE POLICY "Allow public to update share tracking" ON shares
    FOR UPDATE USING (true)
    WITH CHECK (
        id = (SELECT id FROM shares WHERE id = shares.id) AND
        user_id = (SELECT user_id FROM shares WHERE id = shares.id) AND
        share_type = (SELECT share_type FROM shares WHERE id = shares.id) AND
        item_id IS NOT DISTINCT FROM (SELECT item_id FROM shares WHERE id = shares.id) AND
        vault_id IS NOT DISTINCT FROM (SELECT vault_id FROM shares WHERE id = shares.id) AND
        share_method = (SELECT share_method FROM shares WHERE id = shares.id) AND
        share_token = (SELECT share_token FROM shares WHERE id = shares.id) AND
        encrypted_data = (SELECT encrypted_data FROM shares WHERE id = shares.id) AND
        encrypted_share_key = (SELECT encrypted_share_key FROM shares WHERE id = shares.id) AND
        encryption_key_hint IS NOT DISTINCT FROM (SELECT encryption_key_hint FROM shares WHERE id = shares.id) AND
        expires_at IS NOT DISTINCT FROM (SELECT expires_at FROM shares WHERE id = shares.id) AND
        max_views IS NOT DISTINCT FROM (SELECT max_views FROM shares WHERE id = shares.id) AND
        one_time_access = (SELECT one_time_access FROM shares WHERE id = shares.id) AND
        password_protected = (SELECT password_protected FROM shares WHERE id = shares.id) AND
        password_hash IS NOT DISTINCT FROM (SELECT password_hash FROM shares WHERE id = shares.id) AND
        recipient_user_id IS NOT DISTINCT FROM (SELECT recipient_user_id FROM shares WHERE id = shares.id) AND
        recipient_email IS NOT DISTINCT FROM (SELECT recipient_email FROM shares WHERE id = shares.id) AND
        created_at = (SELECT created_at FROM shares WHERE id = shares.id)
    );

-- Share access logs policies
DROP POLICY IF EXISTS "Users view logs for own shares" ON share_access_logs;
CREATE POLICY "Users view logs for own shares" ON share_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shares 
            WHERE shares.id = share_access_logs.share_id 
            AND shares.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert access logs" ON share_access_logs;
CREATE POLICY "System can insert access logs" ON share_access_logs
    FOR INSERT WITH CHECK (true);

COMMIT;
