/**
 * Returns a human-readable relative time string from an ISO date string.
 * e.g. "Just now", "5m ago", "2h ago", "Yesterday", "3d ago", "Jan 5"
 */
export const formatRelativeDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Formats a date string to a locale date string (e.g. "1/5/2025").
 */
export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
};
