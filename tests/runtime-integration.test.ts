import { afterEach, describe, expect, it } from 'vitest';
import {
  CapturePageToInbox,
  GetPageStatus,
} from '../src/application/use-cases';
import { createFeatureUseCaseDependencies } from '../src/features/runtime/application-dependencies';
import {
  createYomiatoDatabase,
  type YomiatoDatabase,
} from '../src/infrastructure/db';

const databases: YomiatoDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

function createDatabase(name: string): YomiatoDatabase {
  const database = createYomiatoDatabase(name);
  databases.push(database);
  return database;
}

describe('工程11の実行コンテキスト統合', () => {
  it('PopupとDashboardが同じIndexedDBを参照する', async () => {
    const popupDatabase = createDatabase('yomiato-integration-shared');
    const dashboardDatabase = createDatabase('yomiato-integration-shared');
    const popupCapture = new CapturePageToInbox(
      createFeatureUseCaseDependencies(popupDatabase),
    );
    const dashboardStatus = new GetPageStatus(
      createFeatureUseCaseDependencies(dashboardDatabase),
    );

    await popupCapture.execute({
      url: 'https://example.com/shared',
      title: '共有ページ',
      source: 'current-tab',
    });

    const status = await dashboardStatus.execute(
      'https://example.com/shared#section',
    );

    expect(status.page?.title).toBe('共有ページ');
    expect(status.inboxItem?.status).toBe('unread');
  });

  it('Service Workerの再起動相当のDB再接続後も保存データを読める', async () => {
    const firstDatabase = createDatabase('yomiato-integration-restart');
    const capture = new CapturePageToInbox(
      createFeatureUseCaseDependencies(firstDatabase),
    );

    await capture.execute({
      url: 'https://example.com/restart',
      title: '再接続後も残るページ',
      source: 'current-tab',
    });
    firstDatabase.close();

    const restartedDatabase = createDatabase('yomiato-integration-restart');
    const status = await new GetPageStatus(
      createFeatureUseCaseDependencies(restartedDatabase),
    ).execute('https://example.com/restart');

    expect(status.page?.title).toBe('再接続後も残るページ');
    expect(status.inboxItem).toBeDefined();
  });

  it('別Dashboard接続からの同時登録でもInboxの一意制約を守る', async () => {
    const firstDatabase = createDatabase('yomiato-integration-concurrent');
    const secondDatabase = createDatabase('yomiato-integration-concurrent');
    const firstCapture = new CapturePageToInbox(
      createFeatureUseCaseDependencies(firstDatabase),
    );
    const secondCapture = new CapturePageToInbox(
      createFeatureUseCaseDependencies(secondDatabase),
    );
    const input = {
      url: 'https://example.com/concurrent',
      title: '同時登録',
      source: 'tab-import' as const,
    };

    const results = await Promise.allSettled([
      firstCapture.execute(input),
      secondCapture.execute(input),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const status = await new GetPageStatus(
      createFeatureUseCaseDependencies(firstDatabase),
    ).execute(input.url);
    expect(status.inboxItem).toBeDefined();
  });
});
