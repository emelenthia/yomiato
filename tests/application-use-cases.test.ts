import { describe, expect, it } from 'vitest';
import type { Clock, IdGenerator } from '../src/domain/ports';
import {
  CapturePageToInbox,
  ClearAllData,
  CompleteCurrentPage,
  CompleteInboxItem,
  DeleteInboxItem,
  DeleteReadingEntry,
  DismissInboxItem,
  ExportBackup,
  GetDataSummary,
  GetPageStatus,
  GetReadingEntry,
  ImportBackup,
  ImportTabsToInbox,
  ListInbox,
  ListReadingLog,
  RecordReread,
  SearchReadingLog,
  UpdateReadingEntry,
} from '../src/application/use-cases';
import {
  createDexieRepositorySet,
  DexieSchemaVersionProvider,
  DexieRepositoryTransaction,
  createYomiatoDatabase,
} from '../src/infrastructure/db';
import type { YomiatoDatabase } from '../src/infrastructure/db';
import { createUseCaseDependencies } from '../src/application/use-cases';

let databaseSequence = 0;

function createDatabaseName(): string {
  databaseSequence += 1;
  return `yomiato-application-test-${Date.now()}-${databaseSequence}`;
}

function createDependencies(db: YomiatoDatabase) {
  let idSequence = 0;
  let currentTime = '2026-08-11T00:00:00.000Z';
  const clock: Clock = {
    now: () => new Date(currentTime),
  };
  const idGenerator: IdGenerator = {
    generate: () => `id-${++idSequence}`,
  };

  const dependencies = createUseCaseDependencies({
    repositories: createDexieRepositorySet(db),
    transaction: new DexieRepositoryTransaction(db),
    clock,
    idGenerator,
    schemaVersionProvider: new DexieSchemaVersionProvider(db),
    appVersion: '0.0.0-test',
  });

  return Object.assign(dependencies, {
    setNow: (value: string) => {
      currentTime = value;
    },
  });
}

async function withDependencies<T>(
  operation: (
    dependencies: ReturnType<typeof createDependencies>,
  ) => Promise<T>,
): Promise<T> {
  const db = createYomiatoDatabase(createDatabaseName());
  await db.open();

  try {
    return await operation(createDependencies(db));
  } finally {
    db.close();
    await db.delete();
  }
}

describe('Applicationユースケース', () => {
  it('現在ページをInboxへ一件だけ登録し、同時登録を重複として扱う', async () => {
    await withDependencies(async (dependencies) => {
      const capture = new CapturePageToInbox(dependencies);
      const results = await Promise.allSettled([
        capture.execute({
          url: 'https://example.com/article#one',
          title: '記事',
          source: 'current-tab',
        }),
        capture.execute({
          url: 'https://example.com/article?utm_source=x',
          title: '記事',
          source: 'current-tab',
        }),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      await expect(new ListInbox(dependencies).execute()).resolves.toHaveLength(
        1,
      );
      await expect(
        new GetDataSummary(dependencies).execute(),
      ).resolves.toMatchObject({
        schemaVersion: 1,
        pages: 1,
        inboxItems: 1,
      });
    });
  });

  it('タブ取り込みは追加、重複、対応外、失敗を項目ごとに分類する', async () => {
    await withDependencies(async (dependencies) => {
      const capture = new CapturePageToInbox(dependencies);
      await capture.execute({
        url: 'https://example.com/already',
        title: '既存',
        source: 'current-tab',
      });

      const result = await new ImportTabsToInbox(dependencies).execute([
        { url: 'https://example.com/new', title: '新規' },
        { url: 'https://example.com/already#part', title: '重複' },
        { url: 'chrome://settings', title: '設定' },
      ]);

      expect(result).toMatchObject({
        added: 1,
        duplicate: 1,
        unsupported: 1,
        failed: 0,
      });
    });
  });

  it('Inbox読了、直接読了、再読、編集、削除の状態を分離して扱う', async () => {
    await withDependencies(async (dependencies) => {
      const capture = new CapturePageToInbox(dependencies);
      const captured = await capture.execute({
        url: 'https://example.com/read',
        title: '読むページ',
        source: 'current-tab',
      });
      const completed = await new CompleteInboxItem(dependencies).execute({
        inboxItemId: captured.inboxItem.id,
        reflection: '最初の学び',
        noTakeaway: false,
      });

      expect(await new ListInbox(dependencies).execute()).toHaveLength(0);
      expect(await new ListReadingLog(dependencies).execute()).toHaveLength(1);

      const reread = await new RecordReread(dependencies).execute({
        pageId: completed.page.id,
        reflection: '二回目の気づき',
        noTakeaway: false,
      });
      await expect(
        new GetReadingEntry(dependencies).execute(completed.readingEntry.id),
      ).resolves.toMatchObject({
        readingEntry: completed.readingEntry,
      });
      const updated = await new UpdateReadingEntry(dependencies).execute({
        readingEntryId: completed.readingEntry.id,
        reflection: '編集した学び',
        noTakeaway: false,
      });

      expect(updated.completedAt).toBe(completed.readingEntry.completedAt);
      expect(
        await new SearchReadingLog(dependencies).execute('編集した'),
      ).toHaveLength(1);
      expect(
        await new SearchReadingLog(dependencies).execute('二回目'),
      ).toHaveLength(1);
      expect(
        await new GetReadingEntry(dependencies).execute(reread.id),
      ).toMatchObject({
        readingEntry: reread,
      });

      await new DeleteReadingEntry(dependencies).execute(reread.id);
      expect(await new ListReadingLog(dependencies).execute()).toHaveLength(1);
    });
  });

  it('直接読了は既存Inboxを除去し、得るものなしを保存できる', async () => {
    await withDependencies(async (dependencies) => {
      const capture = new CapturePageToInbox(dependencies);
      await capture.execute({
        url: 'https://example.com/direct',
        title: '直接読了',
        source: 'current-tab',
      });

      const output = await new CompleteCurrentPage(dependencies).execute({
        url: 'https://example.com/direct#fragment',
        title: '更新タイトル',
        reflection: '入力値は採用しない',
        noTakeaway: true,
      });

      expect(await new ListInbox(dependencies).execute()).toHaveLength(0);
      expect(output.readingEntry).toMatchObject({
        reflection: '',
        reflectionType: 'none',
      });
    });
  });

  it('断念は履歴を残し、単純削除は履歴を残さない', async () => {
    await withDependencies(async (dependencies) => {
      const capture = new CapturePageToInbox(dependencies);
      const dismissed = await capture.execute({
        url: 'https://example.com/dismiss',
        title: '断念',
        source: 'current-tab',
      });
      const deleted = await capture.execute({
        url: 'https://example.com/delete',
        title: '削除',
        source: 'current-tab',
      });

      await new DismissInboxItem(dependencies).execute({
        inboxItemId: dismissed.inboxItem.id,
        reason: '今は不要',
      });
      await new DeleteInboxItem(dependencies).execute(deleted.inboxItem.id);

      const summary = await new GetDataSummary(dependencies).execute();
      expect(summary).toMatchObject({
        inboxItems: 0,
        dismissalEntries: 1,
        readingEntries: 0,
        pages: 1,
      });
    });
  });

  it('バックアップの往復、プレビュー、不正入力の無変更を保証する', async () => {
    await withDependencies(async (dependencies) => {
      const capture = await new CapturePageToInbox(dependencies).execute({
        url: 'https://example.com/backup',
        title: 'バックアップ',
        source: 'current-tab',
      });
      await new CompleteInboxItem(dependencies).execute({
        inboxItemId: capture.inboxItem.id,
        reflection: '保存対象',
        noTakeaway: false,
      });

      const exported = await new ExportBackup(dependencies).execute();
      const importer = new ImportBackup(dependencies);
      expect(importer.preview(exported.json)).toMatchObject({
        pages: 1,
        inboxItems: 0,
        readingEntries: 1,
      });

      await new ClearAllData(dependencies).execute();
      await importer.execute(exported.json);
      await expect(
        new GetDataSummary(dependencies).execute(),
      ).resolves.toMatchObject({
        pages: 1,
        readingEntries: 1,
      });

      const before = await new GetDataSummary(dependencies).execute();
      await expect(
        importer.execute('{"formatName":"wrong"}'),
      ).rejects.toMatchObject({
        code: 'INVALID_BACKUP',
      });
      await expect(new GetDataSummary(dependencies).execute()).resolves.toEqual(
        before,
      );
      const nonUtcJson = exported.json.replace(
        '2026-08-11T00:00:00.000Z',
        '2026-08-11T09:00:00.000+09:00',
      );
      expect(() => importer.preview(nonUtcJson)).toThrowError(
        expect.objectContaining({ code: 'INVALID_BACKUP' }),
      );
      expect(() =>
        importer.preview(
          JSON.stringify({ formatName: 'yomiato-backup', schemaVersion: 2 }),
        ),
      ).toThrowError(
        expect.objectContaining({ code: 'UNSUPPORTED_BACKUP_VERSION' }),
      );
    });
  });

  it('一覧の時系列順、同時刻の安定順、大文字小文字を区別しない検索を保証する', async () => {
    await withDependencies(async (dependencies) => {
      const capture = new CapturePageToInbox(dependencies);
      const first = await capture.execute({
        url: 'https://example.com/first',
        title: 'First',
        source: 'current-tab',
      });
      dependencies.setNow('2026-08-11T01:00:00.000Z');
      const second = await capture.execute({
        url: 'https://example.com/second',
        title: 'Second',
        source: 'current-tab',
      });
      const third = await capture.execute({
        url: 'https://example.com/third',
        title: 'Third',
        source: 'current-tab',
      });

      expect(
        (await new ListInbox(dependencies).execute()).map(
          (item) => item.page.title,
        ),
      ).toEqual(['Third', 'Second', 'First']);

      dependencies.setNow('2026-08-11T02:00:00.000Z');
      const firstReading = await new CompleteInboxItem(dependencies).execute({
        inboxItemId: first.inboxItem.id,
        reflection: 'Alpha reflection',
        noTakeaway: false,
      });
      dependencies.setNow('2026-08-11T03:00:00.000Z');
      const secondReading = await new CompleteInboxItem(dependencies).execute({
        inboxItemId: second.inboxItem.id,
        reflection: 'Beta reflection',
        noTakeaway: false,
      });
      const thirdReading = await new CompleteInboxItem(dependencies).execute({
        inboxItemId: third.inboxItem.id,
        reflection: 'Gamma reflection',
        noTakeaway: false,
      });

      expect(
        (await new ListReadingLog(dependencies).execute()).map(
          (item) => item.readingEntry.id,
        ),
      ).toEqual([
        thirdReading.readingEntry.id,
        secondReading.readingEntry.id,
        firstReading.readingEntry.id,
      ]);
      expect(
        await new SearchReadingLog(dependencies).execute('ALPHA'),
      ).toHaveLength(1);
      expect(
        await new SearchReadingLog(dependencies).execute('EXAMPLE.COM'),
      ).toHaveLength(3);
    });
  });

  it('Pageの状態照会と空検索をApplicationで提供する', async () => {
    await withDependencies(async (dependencies) => {
      const status = new GetPageStatus(dependencies);
      await expect(
        status.execute('https://example.com/missing'),
      ).resolves.toMatchObject({
        page: undefined,
        readingEntryCount: 0,
      });

      const captured = await new CapturePageToInbox(dependencies).execute({
        url: 'https://example.com/status',
        title: '状態',
        source: 'current-tab',
      });
      await expect(
        status.execute('https://example.com/status#part'),
      ).resolves.toMatchObject({
        page: captured.page,
        inboxItem: captured.inboxItem,
        readingEntryCount: 0,
      });
      await expect(
        new SearchReadingLog(dependencies).execute(),
      ).resolves.toEqual([]);
    });
  });
});
