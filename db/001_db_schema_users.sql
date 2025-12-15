-- HushKey Vault - Database Schema: Users
-- Part 1: User profiles and settings
-- Run in order: 001 -> 007

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES
-- ============================================================================

-- User profiles (encryption keys and metadata)
-- Uses Supabase auth.users as base, extends with encryption data
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Encryption keys (for zero-knowledge architecture)
    salt TEXT NOT NULL,
    public_key TEXT,
    private_key_encrypted TEXT,
    
    -- PIN verification (encrypted constant to validate PIN without storing it)
    pin_verification TEXT,
    
    -- User metadata (encrypted)
    name_encrypted TEXT,
    avatar VARCHAR(10),
    recovery_email_encrypted TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Security settings
    auto_lock_minutes INTEGER DEFAULT 5,
    clipboard_clear_seconds INTEGER DEFAULT 30,
    unlock_method VARCHAR(20) DEFAULT 'pin',
    allow_screenshots BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    
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
    
    -- Sync & Trash
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    auto_delete_days INTEGER DEFAULT 30,
    
    -- Backup settings
    last_backup_at TIMESTAMPTZ,
    backup_reminder_enabled BOOLEAN DEFAULT TRUE,
    backup_frequency_days INTEGER DEFAULT 30,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

CREATE POLICY "user_profiles_insert_policy" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_select_policy" ON user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_policy" ON user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete_policy" ON user_profiles
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- User settings policies
DROP POLICY IF EXISTS "Users manage own settings" ON user_settings;
CREATE POLICY "Users manage own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

COMMIT;
