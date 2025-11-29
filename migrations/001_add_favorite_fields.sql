BEGIN;

-- Add last_accessed_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='items' AND column_name='last_accessed_at') THEN
        ALTER TABLE items ADD COLUMN last_accessed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index for favorites if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_items_is_favorite_accessed 
ON items(is_favorite, last_accessed_at DESC) 
WHERE is_favorite = TRUE AND deleted_at IS NULL;

COMMIT;
