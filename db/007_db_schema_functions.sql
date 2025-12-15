-- HushKey Vault - Database Schema: Functions & Views
-- Part 7: Functions, triggers, and views
-- Run in order: 001 -> 007

BEGIN;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vaults_updated_at ON vaults;
CREATE TRIGGER update_vaults_updated_at 
    BEFORE UPDATE ON vaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
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

-- Run schema files in order:
-- 1. 001_db_schema_users.sql
-- 2. 002_db_schema_vaults_items.sql
-- 3. 003_db_schema_security.sql
-- 4. 004_db_schema_activity.sql
-- 5. 005_db_schema_sharing.sql
-- 6. 006_db_schema_backup.sql
-- 7. 007_db_schema_functions.sql (this file)

-- After running all schemas:
-- 1. Verify all tables: \dt
-- 2. Verify all indexes: \di
-- 3. Verify RLS: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 4. Configure Supabase Auth providers (Email, Google, GitHub)
-- 5. Set up database backups in Supabase Dashboard

-- Security Checklist:
-- ✅ RLS enabled on all tables
-- ✅ All sensitive data encrypted (client-side)
-- ✅ User can only access own data
-- ✅ Cascading deletes configured
-- ✅ Indexes for performance
-- ✅ Timestamps for audit trail
-- ✅ Session management with expiry
