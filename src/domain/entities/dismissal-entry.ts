import type { DismissalEntryId, PageId } from '../../shared/types/ids';

export interface DismissalEntry {
  id: DismissalEntryId;
  pageId: PageId;
  reason: string;
  dismissedAt: string;
}
