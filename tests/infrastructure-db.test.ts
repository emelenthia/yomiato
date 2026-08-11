import { describe, expect, it } from 'vitest';
import type {
  DismissalEntry,
  InboxItem,
  Page,
  ReadingEntry,
} from '../src/domain/entities';
import {
  createDexieRepositorySet,
  DexieRepositoryTransaction,
  createYomiatoDatabase,
  V1_SCHEMA,
} from '../src/infrastructure/db';
import type { YomiatoDatabase } from '../src/infrastructure/db';

let databaseSequence = 0;

function createDatabaseName(): string {
  databaseSequence += 1;
  return `yomiato-test-${Date.now()}-${databaseSequence}`;
}

function createPage(
  id: string,
  normalizedUrl = `https://example.com/${id}`,
): Page {
  return {
    id,
    normalizedUrl,
    originalUrl: normalizedUrl,
    title: `ページ ${id}`,
    siteName: 'example.com',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  };
}

function createInboxItem(id: string, pageId: string): InboxItem {
  return {
    id,
    pageId,
    status: 'unread',
    source: 'current-tab',
    addedAt: '2026-08-11T00:00:00.000Z',
  };
}

function createReadingEntry(id: string, pageId: string): ReadingEntry {
  return {
    id,
    pageId,
    reflection: '学んだこと',
    reflectionType: 'learning',
    completedAt: '2026-08-11T00:00:00.000Z',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  };
}

function createDismissalEntry(id: string, pageId: string): DismissalEntry {
  return {
    id,
    pageId,
    reason: '今は不要',
    dismissedAt: '2026-08-11T00:00:00.000Z',
  };
}

async function withDatabase<T>(operation: (db: YomiatoDatabase) => Promise<T>) {
  const db = createYomiatoDatabase(createDatabaseName());

  try {
    await db.open();
    return await operation(db);
  } finally {
    db.close();
    await db.delete();
  }
}

describe('IndexedDB v1スキーマ', () => {
  it('空のDBを開くと全テーブルと必要なインデックスが作成される', async () => {
    await withDatabase(async (db) => {
      expect(db.tables.map((table) => table.name)).toEqual([
        'pages',
        'inboxItems',
        'readingEntries',
        'dismissalEntries',
        'settings',
      ]);
      expect(db.pages.schema.indexes.map((index) => index.name)).toEqual([
        'normalizedUrl',
        'createdAt',
      ]);
      expect(db.inboxItems.schema.indexes.map((index) => index.name)).toEqual([
        'pageId',
        'status',
        'addedAt',
      ]);
      expect(
        db.readingEntries.schema.indexes.map((index) => index.name),
      ).toEqual(['pageId', 'completedAt', 'updatedAt']);
      expect(
        db.dismissalEntries.schema.indexes.map((index) => index.name),
      ).toEqual(['pageId', 'dismissedAt']);
      expect(db.settings.schema.indexes).toHaveLength(0);
      expect(V1_SCHEMA.pages).toContain('&normalizedUrl');
    });
  });

  it('v1スキーマの既存fixtureを再度開ける', async () => {
    const name = createDatabaseName();
    const fixture = createYomiatoDatabase(name);
    const page = createPage('fixture-page');

    try {
      await fixture.open();
      await fixture.pages.add(page);
      fixture.close();

      const reopened = createYomiatoDatabase(name);
      await reopened.open();
      await expect(reopened.pages.get(page.id)).resolves.toEqual(page);
      reopened.close();
    } finally {
      fixture.close();
      await fixture.delete();
    }
  });
});

describe('Dexie Repository', () => {
  it('全テーブルの作成、取得、更新、削除を行える', async () => {
    await withDatabase(async (db) => {
      const repositories = createDexieRepositorySet(db);
      const page = createPage('page-1');
      const inboxItem = createInboxItem('inbox-1', page.id);
      const readingEntry = createReadingEntry('reading-1', page.id);
      const dismissalEntry = createDismissalEntry('dismissal-1', page.id);

      await repositories.pages.add(page);
      await repositories.inboxItems.add(inboxItem);
      await repositories.readingEntries.add(readingEntry);
      await repositories.dismissalEntries.add(dismissalEntry);
      await repositories.settings.put({ key: 'theme', value: 'light' });

      expect(await repositories.pages.getById(page.id)).toEqual(page);
      expect(
        await repositories.pages.getByNormalizedUrl(page.normalizedUrl),
      ).toEqual(page);
      expect(await repositories.inboxItems.getByPageId(page.id)).toEqual(
        inboxItem,
      );
      expect(await repositories.readingEntries.listByPageId(page.id)).toEqual([
        readingEntry,
      ]);
      expect(await repositories.dismissalEntries.listByPageId(page.id)).toEqual(
        [dismissalEntry],
      );
      expect(await repositories.settings.getByKey('theme')).toEqual({
        key: 'theme',
        value: 'light',
      });

      const updatedPage = { ...page, title: '更新後のページ' };
      const updatedInboxItem = { ...inboxItem, status: 'reading' as const };
      const updatedReadingEntry = {
        ...readingEntry,
        reflection: '更新後の振り返り',
      };
      await repositories.pages.update(updatedPage);
      await repositories.inboxItems.update(updatedInboxItem);
      await repositories.readingEntries.update(updatedReadingEntry);
      await repositories.settings.put({ key: 'theme', value: 'dark' });

      expect(await repositories.pages.getById(page.id)).toEqual(updatedPage);
      expect(await repositories.inboxItems.getById(inboxItem.id)).toEqual(
        updatedInboxItem,
      );
      expect(
        await repositories.readingEntries.getById(readingEntry.id),
      ).toEqual(updatedReadingEntry);
      expect(await repositories.settings.getByKey('theme')).toEqual({
        key: 'theme',
        value: 'dark',
      });

      await repositories.pages.deleteById(page.id);
      await repositories.inboxItems.deleteById(inboxItem.id);
      await repositories.readingEntries.deleteById(readingEntry.id);
      await repositories.dismissalEntries.deleteById(dismissalEntry.id);
      await repositories.settings.deleteByKey('theme');

      expect(await repositories.pages.count()).toBe(0);
      expect(await repositories.inboxItems.count()).toBe(0);
      expect(await repositories.readingEntries.count()).toBe(0);
      expect(await repositories.dismissalEntries.count()).toBe(0);
      expect(await repositories.settings.count()).toBe(0);
    });
  });

  it('同じnormalizedUrlとpageIdを重複保存できない', async () => {
    await withDatabase(async (db) => {
      const repositories = createDexieRepositorySet(db);
      await repositories.pages.add(
        createPage('page-1', 'https://example.com/same'),
      );

      await expect(
        repositories.pages.add(
          createPage('page-2', 'https://example.com/same'),
        ),
      ).rejects.toThrow();

      await repositories.inboxItems.add(createInboxItem('inbox-1', 'page-1'));
      await expect(
        repositories.inboxItems.add(createInboxItem('inbox-2', 'page-1')),
      ).rejects.toThrow();
    });
  });

  it('同じPageに複数のReadingEntryを保存でき、参照有無を判定できる', async () => {
    await withDatabase(async (db) => {
      const repositories = createDexieRepositorySet(db);
      const page = createPage('page-1');
      await repositories.pages.add(page);

      expect(await repositories.pages.isReferenced(page.id)).toBe(false);

      await repositories.readingEntries.add(
        createReadingEntry('reading-1', page.id),
      );
      await repositories.readingEntries.add(
        createReadingEntry('reading-2', page.id),
      );

      expect(
        await repositories.readingEntries.listByPageId(page.id),
      ).toHaveLength(2);
      expect(await repositories.pages.isReferenced(page.id)).toBe(true);

      await repositories.readingEntries.deleteById('reading-1');
      await repositories.readingEntries.deleteById('reading-2');
      expect(await repositories.pages.isReferenced(page.id)).toBe(false);

      await repositories.inboxItems.add(createInboxItem('inbox-1', page.id));
      expect(await repositories.pages.isReferenced(page.id)).toBe(true);
      await repositories.inboxItems.deleteById('inbox-1');

      await repositories.dismissalEntries.add(
        createDismissalEntry('dismissal-1', page.id),
      );
      expect(await repositories.pages.isReferenced(page.id)).toBe(true);
    });
  });

  it('トランザクション途中の例外で全変更をロールバックする', async () => {
    await withDatabase(async (db) => {
      const transaction = new DexieRepositoryTransaction(db);
      const page = createPage('page-1');

      await expect(
        transaction.run(async (repositories) => {
          await repositories.pages.add(page);
          await repositories.inboxItems.add(
            createInboxItem('inbox-1', page.id),
          );
          throw new Error('transaction failure');
        }),
      ).rejects.toThrow('transaction failure');

      const repositories = createDexieRepositorySet(db);
      expect(await repositories.pages.getById(page.id)).toBeUndefined();
      expect(await repositories.inboxItems.getById('inbox-1')).toBeUndefined();
    });
  });

  it('DBを閉じて再度開いてもデータが残る', async () => {
    const name = createDatabaseName();
    const db = createYomiatoDatabase(name);
    const page = createPage('persistent-page');

    try {
      await db.open();
      await createDexieRepositorySet(db).pages.add(page);
      db.close();

      const reopened = createYomiatoDatabase(name);
      await reopened.open();
      await expect(
        createDexieRepositorySet(reopened).pages.getById(page.id),
      ).resolves.toEqual(page);
      reopened.close();
    } finally {
      db.close();
      await db.delete();
    }
  });
});
