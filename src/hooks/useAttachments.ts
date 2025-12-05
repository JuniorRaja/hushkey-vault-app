/**
 * useAttachments Hook
 * Manages file attachments for items
 */

import { useState, useEffect } from 'react';
import AttachmentsService, { FileMetadata } from '../services/attachmentsService';
import { useAuthStore } from '../stores/authStore';

export const useAttachments = (itemId: string) => {
  const { masterKey } = useAuthStore();
  const [attachments, setAttachments] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = async () => {
    if (!masterKey || !itemId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const files = await AttachmentsService.getAttachments(itemId, masterKey);
      setAttachments(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [itemId, masterKey]);

  return {
    attachments,
    loading,
    error,
    refresh: loadAttachments,
  };
};
