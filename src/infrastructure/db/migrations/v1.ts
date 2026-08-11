export const V1_SCHEMA = {
  pages: 'id, &normalizedUrl, createdAt',
  inboxItems: 'id, &pageId, status, addedAt',
  readingEntries: 'id, pageId, completedAt, updatedAt',
  dismissalEntries: 'id, pageId, dismissedAt',
  settings: 'key',
} as const;
