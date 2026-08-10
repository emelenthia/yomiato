import type { InboxItemId, PageId } from '../../shared/types/ids';

export type InboxItemStatus = 'unread' | 'reading';
export type InboxItemSource = 'current-tab' | 'tab-import';

export interface InboxItem {
  id: InboxItemId;
  pageId: PageId;
  status: InboxItemStatus;
  source: InboxItemSource;
  addedAt: string;
  startedAt?: string;
}
