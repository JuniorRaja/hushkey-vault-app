-- HushKey Vault - Database Schema: Vaults & Items
-- Part 2: Vaults, items, categories, file attachments
-- Run in order: 001 -> 007

BEGIN;

-- ============================================================================
-- CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    color VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VAULTS
-- ============================================================================

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
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- ITEMS
-- ============================================================================

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
    is_deleted BOOLEAN DEFAULT FALSE,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    folder VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- FILE ATTACHMENTS
-- ============================================================================

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
-- INDEXES
-- ============================================================================

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Vaults
CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_vaults_deleted_at ON vaults(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vaults_is_shared ON vaults(is_shared);
CREATE INDEX IF NOT EXISTS idx_vaults_created_at ON vaults(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vaults_is_deleted ON vaults(is_deleted, deleted_at);

-- Items
CREATE INDEX IF NOT EXISTS idx_items_vault_id ON items(vault_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_is_favorite_accessed ON items(is_favorite, last_accessed_at DESC) 
    WHERE is_favorite = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_is_deleted ON items(is_deleted, deleted_at);

-- File attachments
CREATE INDEX IF NOT EXISTS idx_file_attachments_item_id ON file_attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_mime_type ON file_attachments(mime_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Categories policies
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories" ON categories
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

COMMIT;
