import type {
  DismissalEntry,
  InboxItem,
  Page,
  ReadingEntry,
  Setting,
} from '../../domain/entities';
import type { ApplicationErrorCode } from '../errors';

export interface CapturePageToInboxInput {
  url: string;
  title: string;
  source: 'current-tab' | 'tab-import';
}

export interface CapturePageToInboxOutput {
  page: Page;
  inboxItem: InboxItem;
  readingEntryCount: number;
}

export interface ImportTab {
  url: string;
  title: string;
}

export interface TabImportItemResult {
  tab: ImportTab;
  outcome: 'added' | 'duplicate' | 'unsupported' | 'failed';
  errorCode?: ApplicationErrorCode;
}

export interface ImportTabsToInboxOutput {
  added: number;
  duplicate: number;
  unsupported: number;
  failed: number;
  results: ReadonlyArray<TabImportItemResult>;
}

export interface CompletionInput {
  reflection: string;
  noTakeaway: boolean;
}

export interface CompleteInboxItemInput extends CompletionInput {
  inboxItemId: string;
}

export interface CompleteInboxItemOutput {
  page: Page;
  readingEntry: ReadingEntry;
}

export interface CompleteCurrentPageInput extends CompletionInput {
  url: string;
  title: string;
}

export interface CompleteCurrentPageOutput {
  page: Page;
  readingEntry: ReadingEntry;
}

export interface DismissInboxItemInput {
  inboxItemId: string;
  reason: string;
}

export interface DismissInboxItemOutput {
  page: Page;
  dismissalEntry: DismissalEntry;
}

export interface DeleteInboxItemOutput {
  deletedInboxItem: InboxItem;
  deletedPage: Page | undefined;
}

export interface UpdateReadingEntryInput extends CompletionInput {
  readingEntryId: string;
}

export interface RecordRereadInput extends CompletionInput {
  pageId?: string;
  readingEntryId?: string;
}

export interface ReadingLogItem {
  page: Page;
  readingEntry: ReadingEntry;
}

export interface InboxListItem {
  page: Page;
  inboxItem: InboxItem;
}

export interface GetPageStatusOutput {
  page: Page | undefined;
  normalizedUrl: string;
  inboxItem: InboxItem | undefined;
  readingEntryCount: number;
}

export interface GetReadingEntryOutput {
  page: Page;
  readingEntry: ReadingEntry;
}

export interface DataSummary {
  schemaVersion: number;
  pages: number;
  inboxItems: number;
  readingEntries: number;
  dismissalEntries: number;
  settings: number;
}

export interface BackupData {
  formatName: 'yomiato-backup';
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  pages: ReadonlyArray<Page>;
  inboxItems: ReadonlyArray<InboxItem>;
  readingEntries: ReadonlyArray<ReadingEntry>;
  dismissalEntries: ReadonlyArray<DismissalEntry>;
  settings: ReadonlyArray<Setting>;
}

export interface ExportBackupOutput {
  backup: BackupData;
  json: string;
}

export interface BackupPreview {
  appVersion: string;
  exportedAt: string;
  schemaVersion: 1;
  pages: number;
  inboxItems: number;
  readingEntries: number;
  dismissalEntries: number;
  settings: number;
  totalRecords: number;
}
