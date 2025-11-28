-- HushKey Vault - Complete Database Schema for Supabase
-- Combines encryption-first architecture with full feature set
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER TABLES
-- ============================================================================

-- User profiles (encryption keys and metadata)
-- Uses Supabase auth.users as base, extends with encryption data
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Encryption keys (for zero-knowledge architecture)
    salt TEXT NOT NULL,
    public_key TEXT,
    private_key_encrypted TEXT,
    
    -- User metadata (encrypted)
    name_encrypted TEXT,
    avatar VARCHAR(10),
    recovery_email_encrypted TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Security settings
    auto_lock_minutes INTEGER DEFAULT 5,
    clipboard_clear_seconds INTEGER DEFAULT 30,
    unlock_method VARCHAR(20) DEFAULT 'pin',
    allow_screenshots BOOLEAN DEFAULT FALSE,
    
    -- UI settings
    theme VARCHAR(20) DEFAULT 'dark',
    accent_color VARCHAR(20) DEFAULT 'violet',
    group_items_by_category BOOLEAN DEFAULT FALSE,
    
    -- Notification preferences
    notify_new_device_login BOOLEAN DEFAULT TRUE,
    notify_failed_login_attempts BOOLEAN DEFAULT TRUE,
    notify_weak_password_alerts BOOLEAN DEFAULT TRUE,
    notify_expiry_reminders BOOLEAN DEFAULT TRUE,
    notify_backup_health BOOLEAN DEFAULT TRUE,
    notify_monthly_report BOOLEAN DEFAULT TRUE,
    notify_session_alerts BOOLEAN DEFAULT FALSE,
    notify_shared_vault_updates BOOLEAN DEFAULT TRUE,
    notify_push_notifications BOOLEAN DEFAULT FALSE,
    notify_email_notifications BOOLEAN DEFAULT TRUE,
    
    -- Sync
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

-- Categories (encrypted names)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    color VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    --UNIQUE(user_id, name)
);

-- ============================================================================
-- VAULTS
-- ============================================================================

-- Vaults (encrypted names and metadata)
CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Encrypted data
    name_encrypted TEXT NOT NULL,
    description_encrypted TEXT,
    notes_encrypted TEXT,
    
    -- Metadata
    icon VARCHAR(50) NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- ITEMS
-- ============================================================================

-- Items (all sensitive data encrypted as JSON blob)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Item type (LOGIN, CARD, NOTE, etc.)
    type VARCHAR(20) NOT NULL,
    
    -- All sensitive data encrypted as JSON
    data_encrypted TEXT NOT NULL,
    
    -- Metadata (not sensitive)
    is_favorite BOOLEAN DEFAULT FALSE,
    folder VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- File attachments table (encrypted file data)
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- File metadata (encrypted)
    name_encrypted TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Encrypted file data
    file_data_encrypted TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SESSIONS & DEVICES
-- ============================================================================

-- Devices (session tracking)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT,
    
    -- Session info
    location VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- ACTIVITY & NOTIFICATIONS
-- ============================================================================

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Vaults indexes
CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_vaults_deleted_at ON vaults(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vaults_is_shared ON vaults(is_shared);
CREATE INDEX IF NOT EXISTS idx_vaults_created_at ON vaults(created_at DESC);

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_vault_id ON items(vault_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_devices_expires_at ON devices(expires_at);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- File attachments indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_item_id ON file_attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_mime_type ON file_attachments(mime_type);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

CREATE POLICY "user_profiles_insert_policy" 
ON user_profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_select_policy" 
ON user_profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_policy" 
ON user_profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete_policy" 
ON user_profiles
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- User settings policies
DROP POLICY IF EXISTS "Users manage own settings" ON user_settings;
CREATE POLICY "Users manage own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Vaults policies
DROP POLICY IF EXISTS "Users view own vaults" ON vaults;
CREATE POLICY "Users view own vaults" ON vaults
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own vaults" ON vaults;
CREATE POLICY "Users create own vaults" ON vaults
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own vaults" ON vaults;
CREATE POLICY "Users update own vaults" ON vaults
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own vaults" ON vaults;
CREATE POLICY "Users delete own vaults" ON vaults
    FOR DELETE USING (auth.uid() = user_id);

-- Items policies (access through owned vaults)
DROP POLICY IF EXISTS "Users view items in own vaults" ON items;
CREATE POLICY "Users view items in own vaults" ON items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM vaults WHERE vaults.id = items.vault_id AND vaults.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users create items in own vaults" ON items;
CREATE POLICY "Users create items in own vaults" ON items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM vaults WHERE vaults.id = items.vault_id AND vaults.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users update items in own vaults" ON items;
CREATE POLICY "Users update items in own vaults" ON items
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM vaults WHERE vaults.id = items.vault_id AND vaults.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users delete items in own vaults" ON items;
CREATE POLICY "Users delete items in own vaults" ON items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM vaults WHERE vaults.id = items.vault_id AND vaults.user_id = auth.uid())
    );

-- File attachments policies (access through owned items)
DROP POLICY IF EXISTS "Users view attachments in own items" ON file_attachments;
CREATE POLICY "Users view attachments in own items" ON file_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM items 
            JOIN vaults ON vaults.id = items.vault_id 
            WHERE items.id = file_attachments.item_id 
            AND vaults.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users create attachments in own items" ON file_attachments;
CREATE POLICY "Users create attachments in own items" ON file_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM items 
            JOIN vaults ON vaults.id = items.vault_id 
            WHERE items.id = file_attachments.item_id 
            AND vaults.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users delete attachments in own items" ON file_attachments;
CREATE POLICY "Users delete attachments in own items" ON file_attachments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM items 
            JOIN vaults ON vaults.id = items.vault_id 
            WHERE items.id = file_attachments.item_id 
            AND vaults.user_id = auth.uid()
        )
    );

-- Categories policies
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories" ON categories
    FOR ALL USING (auth.uid() = user_id);

-- Devices policies
DROP POLICY IF EXISTS "Users manage own devices" ON devices;
CREATE POLICY "Users manage own devices" ON devices
    FOR ALL USING (auth.uid() = user_id);

-- Activity logs policies
DROP POLICY IF EXISTS "Users view own logs" ON activity_logs;
CREATE POLICY "Users view own logs" ON activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own logs" ON activity_logs;
CREATE POLICY "Users create own logs" ON activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users manage own notifications" ON notifications;
CREATE POLICY "Users manage own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vaults_updated_at ON vaults;
CREATE TRIGGER update_vaults_updated_at BEFORE UPDATE ON vaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM devices WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Function to get vault item count
CREATE OR REPLACE FUNCTION get_vault_item_count(vault_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM items WHERE vault_id = vault_uuid AND deleted_at IS NULL);
END;
$$ language 'plpgsql';

-- ============================================================================
-- VIEWS FOR CONVENIENCE
-- ============================================================================

-- View: Active vaults with item counts
CREATE OR REPLACE VIEW active_vaults WITH (security_invoker = on) AS
SELECT 
    v.*,
    COUNT(i.id) FILTER (WHERE i.deleted_at IS NULL) as item_count
FROM vaults v
LEFT JOIN items i ON i.vault_id = v.id
WHERE v.deleted_at IS NULL
GROUP BY v.id;

-- View: Active items with vault info
CREATE OR REPLACE VIEW active_items WITH (security_invoker = on) AS
SELECT 
    i.*,
    v.name_encrypted as vault_name_encrypted,
    v.icon as vault_icon
FROM items i
JOIN vaults v ON v.id = i.vault_id
WHERE i.deleted_at IS NULL AND v.deleted_at IS NULL;

-- View: User activity summary
CREATE OR REPLACE VIEW user_activity_summary WITH (security_invoker = on) AS
SELECT 
    user_id,
    COUNT(*) as total_actions,
    MAX(created_at) as last_activity,
    COUNT(*) FILTER (WHERE action = 'LOGIN') as login_count,
    COUNT(*) FILTER (WHERE action = 'CREATE') as create_count,
    COUNT(*) FILTER (WHERE action = 'UPDATE') as update_count,
    COUNT(*) FILTER (WHERE action = 'DELETE') as delete_count
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id;

COMMIT;

-- ============================================================================
-- POST-INSTALLATION NOTES
-- ============================================================================

-- After running this schema:
-- 1. Verify all tables were created: \dt
-- 2. Verify all indexes were created: \di
-- 3. Verify RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 4. Test RLS policies with a test user
-- 5. Configure Supabase Auth providers (Email, Google, GitHub)
-- 6. Set up Supabase Storage for file attachments (if needed)
-- 7. Configure email templates in Supabase Dashboard
-- 8. Set up database backups in Supabase Dashboard

-- Security Checklist:
-- ✅ RLS enabled on all tables
-- ✅ All sensitive data encrypted (client-side)
-- ✅ User can only access own data
-- ✅ Cascading deletes configured
-- ✅ Indexes for performance
-- ✅ Timestamps for audit trail
-- ✅ Session management with expiry

-- Data encrypted client-side:
-- • user_profiles.name_encrypted
-- • user_profiles.recovery_email_encrypted
-- • vaults.name_encrypted
-- • vaults.description_encrypted
-- • vaults.notes_encrypted
-- • items.data_encrypted (entire item as JSON)
-- • categories.name_encrypted
-- • file_attachments.name_encrypted
-- • file_attachments.file_data_encrypted
