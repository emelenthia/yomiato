import type {
  DismissalEntry,
  InboxItem,
  Page,
  ReadingEntry,
  Setting,
} from '../entities';
import type {
  DismissalEntryId,
  InboxItemId,
  PageId,
  ReadingEntryId,
} from '../../shared/types/ids';

export interface PageRepository {
  getById(id: PageId): Promise<Page | undefined>;
  getByNormalizedUrl(normalizedUrl: string): Promise<Page | undefined>;
  list(): Promise<ReadonlyArray<Page>>;
  add(page: Page): Promise<void>;
  update(page: Page): Promise<void>;
  deleteById(id: PageId): Promise<void>;
  count(): Promise<number>;
}

export interface InboxItemRepository {
  getById(id: InboxItemId): Promise<InboxItem | undefined>;
  getByPageId(pageId: PageId): Promise<InboxItem | undefined>;
  list(): Promise<ReadonlyArray<InboxItem>>;
  add(item: InboxItem): Promise<void>;
  update(item: InboxItem): Promise<void>;
  deleteById(id: InboxItemId): Promise<void>;
  count(): Promise<number>;
}

export interface ReadingEntryRepository {
  getById(id: ReadingEntryId): Promise<ReadingEntry | undefined>;
  listByPageId(pageId: PageId): Promise<ReadonlyArray<ReadingEntry>>;
  list(): Promise<ReadonlyArray<ReadingEntry>>;
  add(entry: ReadingEntry): Promise<void>;
  update(entry: ReadingEntry): Promise<void>;
  deleteById(id: ReadingEntryId): Promise<void>;
  count(): Promise<number>;
}

export interface DismissalEntryRepository {
  listByPageId(pageId: PageId): Promise<ReadonlyArray<DismissalEntry>>;
  list(): Promise<ReadonlyArray<DismissalEntry>>;
  add(entry: DismissalEntry): Promise<void>;
  deleteById(id: DismissalEntryId): Promise<void>;
  count(): Promise<number>;
}

export interface SettingRepository {
  getByKey<TValue = unknown>(key: string): Promise<Setting<TValue> | undefined>;
  list(): Promise<ReadonlyArray<Setting>>;
  put<TValue>(setting: Setting<TValue>): Promise<void>;
  deleteByKey(key: string): Promise<void>;
  count(): Promise<number>;
}

export interface RepositorySet {
  pages: PageRepository;
  inboxItems: InboxItemRepository;
  readingEntries: ReadingEntryRepository;
  dismissalEntries: DismissalEntryRepository;
  settings: SettingRepository;
}

export interface RepositoryTransaction {
  run<T>(operation: (repositories: RepositorySet) => Promise<T>): Promise<T>;
}
