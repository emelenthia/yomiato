import { z } from 'zod';
import type { BackupData, BackupPreview } from '../dto';
import { ApplicationError } from '../errors';
import { parseAndNormalizeUrl } from '../../domain/values/url';
import type { RepositorySet } from '../../domain/ports';
import {
  MAX_DISMISSAL_REASON_LENGTH,
  MAX_IMPORT_FILE_SIZE,
  MAX_REFLECTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../shared/constants/limits';

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const pageSchema = z
  .object({
    id: z.string().min(1),
    normalizedUrl: z.string().min(1),
    originalUrl: z.string().min(1),
    title: z.string(),
    siteName: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const inboxItemSchema = z
  .object({
    id: z.string().min(1),
    pageId: z.string().min(1),
    status: z.enum(['unread', 'reading']),
    source: z.enum(['current-tab', 'tab-import']),
    addedAt: z.string().datetime({ offset: true }),
    startedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const readingEntrySchema = z
  .object({
    id: z.string().min(1),
    pageId: z.string().min(1),
    reflection: z.string(),
    reflectionType: z.enum([
      'learning',
      'impression',
      'question',
      'action',
      'none',
    ]),
    completedAt: z.string().datetime({ offset: true }),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const dismissalEntrySchema = z
  .object({
    id: z.string().min(1),
    pageId: z.string().min(1),
    reason: z.string(),
    dismissedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const settingSchema = z
  .object({
    key: z.string().min(1),
    value: jsonValueSchema,
  })
  .strict();

export const backupSchema = z
  .object({
    formatName: z.literal('yomiato-backup'),
    schemaVersion: z.literal(1),
    appVersion: z.string().min(1),
    exportedAt: z.string().datetime({ offset: true }),
    pages: z.array(pageSchema),
    inboxItems: z.array(inboxItemSchema),
    readingEntries: z.array(readingEntrySchema),
    dismissalEntries: z.array(dismissalEntrySchema),
    settings: z.array(settingSchema),
  })
  .strict();

function invalidBackup(): never {
  throw new ApplicationError('INVALID_BACKUP');
}

function assertUnique(values: ReadonlyArray<string>): void {
  if (new Set(values).size !== values.length) {
    invalidBackup();
  }
}

export function assertBackupIntegrity(backup: BackupData): void {
  const allIds = [
    ...backup.pages.map((record) => record.id),
    ...backup.inboxItems.map((record) => record.id),
    ...backup.readingEntries.map((record) => record.id),
    ...backup.dismissalEntries.map((record) => record.id),
  ];
  assertUnique(allIds);
  assertUnique(backup.settings.map((record) => record.key));
  assertUnique(backup.pages.map((record) => record.normalizedUrl));
  assertUnique(backup.inboxItems.map((record) => record.pageId));

  const pageIds = new Set(backup.pages.map((record) => record.id));
  for (const page of backup.pages) {
    try {
      const parsed = parseAndNormalizeUrl(page.originalUrl);
      if (
        parsed.normalizedUrl !== page.normalizedUrl ||
        parsed.siteName !== page.siteName ||
        page.originalUrl !== page.originalUrl.trim() ||
        page.title !== page.title.trim() ||
        page.title.length === 0 ||
        Array.from(page.title).length > MAX_TITLE_LENGTH
      ) {
        invalidBackup();
      }
    } catch {
      invalidBackup();
    }
  }
  for (const entry of backup.readingEntries) {
    if (entry.reflectionType === 'none') {
      if (entry.reflection !== '') {
        invalidBackup();
      }
    } else if (
      entry.reflection !== entry.reflection.trim() ||
      entry.reflection.length === 0 ||
      entry.reflection.length > MAX_REFLECTION_LENGTH
    ) {
      invalidBackup();
    }
  }
  for (const entry of backup.dismissalEntries) {
    if (
      entry.reason !== entry.reason.trim() ||
      entry.reason.length > MAX_DISMISSAL_REASON_LENGTH
    ) {
      invalidBackup();
    }
  }
  for (const record of [
    ...backup.inboxItems,
    ...backup.readingEntries,
    ...backup.dismissalEntries,
  ]) {
    if (!pageIds.has(record.pageId)) {
      invalidBackup();
    }
  }
}

export function parseBackup(input: string | unknown): BackupData {
  let raw: unknown;

  if (typeof input === 'string') {
    const bytes = new TextEncoder().encode(input).byteLength;
    if (bytes > MAX_IMPORT_FILE_SIZE) {
      invalidBackup();
    }

    try {
      raw = JSON.parse(input) as unknown;
    } catch {
      invalidBackup();
    }
  } else {
    raw = input;
  }

  if (
    typeof raw === 'object' &&
    raw !== null &&
    'schemaVersion' in raw &&
    raw.schemaVersion !== 1
  ) {
    throw new ApplicationError('UNSUPPORTED_BACKUP_VERSION');
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    invalidBackup();
  }

  const backup = parsed.data as BackupData;
  assertBackupIntegrity(backup);
  return backup;
}

export function toBackupPreview(backup: BackupData): BackupPreview {
  const pages = backup.pages.length;
  const inboxItems = backup.inboxItems.length;
  const readingEntries = backup.readingEntries.length;
  const dismissalEntries = backup.dismissalEntries.length;
  const settings = backup.settings.length;

  return {
    appVersion: backup.appVersion,
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    pages,
    inboxItems,
    readingEntries,
    dismissalEntries,
    settings,
    totalRecords:
      pages + inboxItems + readingEntries + dismissalEntries + settings,
  };
}

export async function assertRepositoriesIntegrity(
  repositories: RepositorySet,
): Promise<void> {
  const backup: BackupData = {
    formatName: 'yomiato-backup',
    schemaVersion: 1,
    appVersion: 'internal',
    exportedAt: new Date(0).toISOString(),
    pages: await repositories.pages.list(),
    inboxItems: await repositories.inboxItems.list(),
    readingEntries: await repositories.readingEntries.list(),
    dismissalEntries: await repositories.dismissalEntries.list(),
    settings: await repositories.settings.list(),
  };
  assertBackupIntegrity(backup);
}
