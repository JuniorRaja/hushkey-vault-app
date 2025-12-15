-- HushKey Vault - Database Schema: Security
-- Part 3: Devices, biometric credentials, guardian scans
-- Run in order: 001 -> 007

BEGIN;

-- ============================================================================
-- DEVICES
-- ============================================================================

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
-- BIOMETRIC CREDENTIALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS biometric_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- GUARDIAN (Security Scans)
-- ============================================================================

-- Guardian scans table
CREATE TABLE IF NOT EXISTS guardian_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL,
    scan_date TIMESTAMPTZ DEFAULT NOW(),
    total_items_scanned INTEGER NOT NULL,
    weak_passwords_count INTEGER DEFAULT 0,
    reused_passwords_count INTEGER DEFAULT 0,
    compromised_passwords_count INTEGER DEFAULT 0,
    scan_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardian findings table
CREATE TABLE IF NOT EXISTS guardian_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES guardian_scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    finding_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    obsolete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Devices
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_devices_expires_at ON devices(expires_at);

-- Biometric credentials
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON biometric_credentials(user_id);

-- Guardian
CREATE INDEX IF NOT EXISTS idx_guardian_scans_user ON guardian_scans(user_id, scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_findings_scan ON guardian_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_guardian_findings_obsolete ON guardian_findings(obsolete);
CREATE INDEX IF NOT EXISTS idx_guardian_findings_user ON guardian_findings(user_id, resolved);
CREATE INDEX IF NOT EXISTS idx_guardian_findings_item ON guardian_findings(item_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_findings ENABLE ROW LEVEL SECURITY;

-- Devices policies
DROP POLICY IF EXISTS "Users manage own devices" ON devices;
CREATE POLICY "Users manage own devices" ON devices
    FOR ALL USING (auth.uid() = user_id);

-- Biometric credentials policies
DROP POLICY IF EXISTS "Users can manage their own biometric credentials" ON biometric_credentials;
CREATE POLICY "Users can manage their own biometric credentials" ON biometric_credentials
    FOR ALL USING (auth.uid() = user_id);

-- Guardian policies
DROP POLICY IF EXISTS "Users manage own scans" ON guardian_scans;
CREATE POLICY "Users manage own scans" ON guardian_scans 
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own findings" ON guardian_findings;
CREATE POLICY "Users manage own findings" ON guardian_findings 
    FOR ALL USING (auth.uid() = user_id);

COMMIT;
