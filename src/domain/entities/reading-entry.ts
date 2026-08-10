import type { PageId, ReadingEntryId } from '../../shared/types/ids';

export type ReflectionType =
  'learning' | 'impression' | 'question' | 'action' | 'none';

export interface ReadingEntry {
  id: ReadingEntryId;
  pageId: PageId;
  reflection: string;
  reflectionType: ReflectionType;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}
