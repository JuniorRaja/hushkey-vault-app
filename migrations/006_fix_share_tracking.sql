-- Fix share tracking for unauthenticated users
BEGIN;

-- Drop existing update policy
DROP POLICY IF EXISTS "Allow users to update their own shares" ON shares;

-- Allow authenticated users to update their own shares (all columns)
CREATE POLICY "Allow users to update their own shares" ON shares
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow public to update ONLY tracking columns (view_count, last_accessed_at, revoked, revoked_at)
CREATE POLICY "Allow public to update share tracking" ON shares
  FOR UPDATE
  USING (true)
  WITH CHECK (
    -- Only allow changes to tracking columns
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

COMMIT;
