import Dexie, { type Table } from 'dexie';
import type {
  DismissalEntry,
  InboxItem,
  Page,
  ReadingEntry,
  Setting,
} from '../../../domain/entities';
import type {
  DismissalEntryId,
  InboxItemId,
  PageId,
  ReadingEntryId,
} from '../../../shared/types/ids';
import { V1_SCHEMA } from '../migrations/v1';

export class YomiatoDatabase extends Dexie {
  pages!: Table<Page, PageId>;
  inboxItems!: Table<InboxItem, InboxItemId>;
  readingEntries!: Table<ReadingEntry, ReadingEntryId>;
  dismissalEntries!: Table<DismissalEntry, DismissalEntryId>;
  settings!: Table<Setting, string>;

  constructor(name = 'yomiato') {
    super(name);
    this.version(1).stores(V1_SCHEMA);
  }
}

export function createYomiatoDatabase(name = 'yomiato'): YomiatoDatabase {
  return new YomiatoDatabase(name);
}
