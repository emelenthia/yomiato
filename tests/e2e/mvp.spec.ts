import {
  test,
  expect,
  createExtensionContext,
  getExtensionId,
  openDashboard,
  openFixturePage,
  openPopup,
  type FixtureTab,
} from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

async function addInboxItem(
  context: BrowserContext,
  extensionId: string,
  pathName: string,
  title: string,
): Promise<FixtureTab> {
  const sourcePage = await openFixturePage(context, pathName, title);
  const activeTab = {
    id: Math.floor(Math.random() * 100_000) + 1,
    url: sourcePage.url(),
    title,
  };
  const popup = await openPopup(context, extensionId, activeTab);
  await popup.getByRole('button', { name: '後で読む', exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('追加しました');
  await popup.close();
  return activeTab;
}

async function completeInboxItem(
  dashboard: Page,
  title: string,
  reflection: string,
): Promise<void> {
  const card = dashboard.locator('.inbox-card').filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '読了', exact: true }).click();
  const dialog = dashboard.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('textarea').fill(reflection);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(card).toHaveCount(0);
}

async function dismissInboxItem(
  dashboard: Page,
  title: string,
  reason: string,
): Promise<void> {
  const card = dashboard.locator('.inbox-card').filter({ hasText: title });
  await card.getByRole('button', { name: '断念', exact: true }).click();
  const dialog = dashboard.getByRole('dialog');
  await dialog.locator('textarea').fill(reason);
  await dialog.getByRole('button', { name: '断念する', exact: true }).click();
  await expect(card).toHaveCount(0);
}

async function deleteInboxItem(dashboard: Page, title: string): Promise<void> {
  const card = dashboard.locator('.inbox-card').filter({ hasText: title });
  await card.getByRole('button', { name: '削除', exact: true }).click();
  const dialog = dashboard.getByRole('dialog');
  await dialog.getByRole('button', { name: '削除する', exact: true }).click();
  await expect(card).toHaveCount(0);
}

async function openLog(dashboard: Page): Promise<void> {
  await dashboard
    .getByRole('button', { name: '読書ログ', exact: true })
    .click();
  await expect(
    dashboard.getByRole('heading', { name: '読書ログ', exact: true }),
  ).toBeVisible();
}

async function openSettings(dashboard: Page): Promise<void> {
  await dashboard
    .getByRole('button', { name: '設定・データ管理', exact: true })
    .click();
  await expect(
    dashboard.getByRole('heading', { name: '設定・データ管理', exact: true }),
  ).toBeVisible();
}

test('E2E-01 個別登録から読了', async ({ extensionContext, extensionId }) => {
  const tab = await addInboxItem(
    extensionContext,
    extensionId,
    '/article-a',
    '記事A',
  );
  const dashboard = await openDashboard(extensionContext, extensionId);

  await completeInboxItem(dashboard, tab.title, '実装の要点を確認した');
  await openLog(dashboard);
  await expect(dashboard.locator('.reading-log-card')).toContainText(
    '実装の要点を確認した',
  );
});

test('E2E-02 直接読了', async ({ extensionContext, extensionId }) => {
  const sourcePage = await openFixturePage(
    extensionContext,
    '/article-direct',
    '直接読了記事',
  );
  const activeTab: FixtureTab = {
    id: 201,
    url: sourcePage.url(),
    title: '直接読了記事',
  };
  const popup = await openPopup(extensionContext, extensionId, activeTab);
  const dashboardPromise = extensionContext.waitForEvent('page');
  await popup
    .getByRole('button', { name: '読了として記録', exact: true })
    .click();
  const dashboard = await dashboardPromise;
  await expect(
    dashboard.getByRole('heading', { name: '読了として記録', exact: true }),
  ).toBeVisible();
  await dashboard
    .locator('#direct-completion-reflection')
    .fill('直接読了の振り返り');
  await dashboard.getByRole('button', { name: '保存', exact: true }).click();
  await expect(
    dashboard.getByRole('heading', { name: '読書ログ', exact: true }),
  ).toBeVisible();
  await expect(dashboard.locator('.reading-log-card')).toContainText(
    '直接読了の振り返り',
  );
});

test('E2E-03 重複と再読', async ({ extensionContext, extensionId }) => {
  const tab = await addInboxItem(
    extensionContext,
    extensionId,
    '/article-reread',
    '再読記事',
  );
  const popup = await openPopup(extensionContext, extensionId, tab);
  await expect(
    popup.getByRole('button', { name: '後で読む', exact: true }),
  ).toBeDisabled();
  await popup.close();

  const dashboard = await openDashboard(extensionContext, extensionId);
  await completeInboxItem(dashboard, tab.title, '最初の振り返り');
  await openLog(dashboard);
  const card = dashboard
    .locator('.reading-log-card')
    .filter({ hasText: tab.title });
  await card.getByRole('button', { name: '再読', exact: true }).click();
  const dialog = dashboard.getByRole('dialog');
  await dialog.locator('textarea').fill('二回目の振り返り');
  await dialog.getByRole('button', { name: '再読を保存', exact: true }).click();
  await expect(dashboard.locator('.reading-log-card')).toHaveCount(2);
  await expect(
    dashboard
      .locator('.reading-log-card')
      .filter({ hasText: '二回目の振り返り' }),
  ).toHaveCount(1);
});

test('E2E-04 複数タブ取り込み', async ({ extensionContext, extensionId }) => {
  const tabA = await addInboxItem(
    extensionContext,
    extensionId,
    '/article-tab-a',
    'タブA',
  );
  const sourceB = await openFixturePage(
    extensionContext,
    '/article-tab-b',
    'タブB',
  );
  const duplicate: FixtureTab = {
    id: 402,
    url: tabA.url,
    title: 'タブAの重複',
  };
  const tabB: FixtureTab = { id: 403, url: sourceB.url(), title: 'タブB' };
  const unsupported: FixtureTab = {
    id: 404,
    url: 'chrome://settings',
    title: '設定',
  };
  const dashboard = await openDashboard(extensionContext, extensionId, {
    tabs: [tabA, duplicate, tabB, unsupported],
  });

  await dashboard
    .getByRole('button', { name: '複数タブを取り込む', exact: true })
    .click();
  await dashboard
    .getByRole('button', { name: 'タブ一覧を読み込む', exact: true })
    .click();
  await expect(dashboard.getByText('対応外URL', { exact: true })).toBeVisible();
  await expect(
    dashboard.getByText('すでにInboxに登録済み', { exact: true }),
  ).toHaveCount(2);
  await expect(dashboard.getByRole('checkbox')).toHaveCount(3);
  await expect(dashboard.getByRole('checkbox').nth(0)).toBeDisabled();
  await expect(dashboard.getByRole('checkbox').nth(1)).toBeDisabled();
  await expect(dashboard.getByRole('checkbox').nth(2)).toBeChecked();
  await dashboard
    .getByRole('button', { name: 'Inboxへ追加', exact: true })
    .click();
  await expect(
    dashboard.getByText('追加 1件、重複 0件、対応外 0件、失敗 0件', {
      exact: true,
    }),
  ).toBeVisible();
  await dashboard.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(dashboard.locator('.inbox-card')).toHaveCount(2);
});

test('E2E-05 断念と削除', async ({ extensionContext, extensionId }) => {
  await addInboxItem(
    extensionContext,
    extensionId,
    '/article-dismiss',
    '断念記事',
  );
  await addInboxItem(
    extensionContext,
    extensionId,
    '/article-delete',
    '削除記事',
  );
  const dashboard = await openDashboard(extensionContext, extensionId);

  await dismissInboxItem(dashboard, '断念記事', '読む時間が取れなかった');
  await deleteInboxItem(dashboard, '削除記事');
  await expect(
    dashboard.getByText('Inboxは空です', { exact: true }),
  ).toBeVisible();
  await openSettings(dashboard);
  await expect(
    dashboard.getByText('断念履歴 1件', { exact: false }),
  ).toBeVisible();
});

test('E2E-06 検索・編集・削除', async ({ extensionContext, extensionId }) => {
  await addInboxItem(
    extensionContext,
    extensionId,
    '/article-search-a',
    '検索記事A',
  );
  await addInboxItem(
    extensionContext,
    extensionId,
    '/article-search-b',
    '検索記事B',
  );
  const dashboard = await openDashboard(extensionContext, extensionId);
  await completeInboxItem(dashboard, '検索記事A', '検索対象の振り返り');
  await completeInboxItem(dashboard, '検索記事B', '残す振り返り');
  await openLog(dashboard);

  const search = dashboard.locator('#reading-log-search');
  await search.fill('検索記事A');
  await expect(dashboard.locator('.reading-log-card')).toHaveCount(1);
  await search.fill('検索対象の振り返り');
  await expect(dashboard.locator('.reading-log-card')).toHaveCount(1);
  await search.fill('');

  const cardA = dashboard
    .locator('.reading-log-card')
    .filter({ hasText: '検索記事A' });
  await cardA.getByRole('button', { name: '編集', exact: true }).click();
  const editDialog = dashboard.getByRole('dialog');
  await editDialog.locator('textarea').fill('更新した振り返り');
  await editDialog
    .getByRole('button', { name: '更新する', exact: true })
    .click();
  await expect(
    dashboard.getByText('振り返りを更新しました。', { exact: true }),
  ).toBeVisible();

  const updatedCard = dashboard
    .locator('.reading-log-card')
    .filter({ hasText: '更新した振り返り' });
  await updatedCard.getByRole('button', { name: '削除', exact: true }).click();
  await dashboard
    .getByRole('dialog')
    .getByRole('button', { name: '削除する', exact: true })
    .click();
  await expect(dashboard.locator('.reading-log-card')).toHaveCount(1);
  await dashboard.reload();
  await openLog(dashboard);
  await expect(dashboard.locator('.reading-log-card')).toHaveCount(1);
  await expect(dashboard.locator('.reading-log-card')).toContainText(
    '残す振り返り',
  );
  await expect(dashboard.locator('.reading-log-card')).not.toContainText(
    '更新した振り返り',
  );
});

test('E2E-07 バックアップ復元', async ({ extensionContext, extensionId }) => {
  await addInboxItem(
    extensionContext,
    extensionId,
    '/article-backup-a',
    'バックアップ記事A',
  );
  await addInboxItem(
    extensionContext,
    extensionId,
    '/article-backup-b',
    'バックアップ記事B',
  );
  const dashboard = await openDashboard(extensionContext, extensionId);
  await completeInboxItem(dashboard, 'バックアップ記事A', '復元する読書ログ');
  await dismissInboxItem(dashboard, 'バックアップ記事B', '復元する断念履歴');
  await openSettings(dashboard);
  await expect(
    dashboard.getByText('ページ 2件、Inbox 0件、読書ログ 1件、断念履歴 1件', {
      exact: true,
    }),
  ).toBeVisible();

  const downloadPromise = dashboard.waitForEvent('download');
  await dashboard
    .getByRole('button', { name: 'JSONをエクスポート', exact: true })
    .click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  const backup = await (await import('node:fs/promises')).readFile(backupPath!);

  await dashboard
    .getByRole('button', { name: '全データ削除を開始', exact: true })
    .click();
  const clearDialog = dashboard.getByRole('dialog');
  await clearDialog.locator('#clear-confirmation').fill('よみあと');
  await clearDialog
    .getByRole('button', { name: 'すべて削除', exact: true })
    .click();
  await expect(
    dashboard.getByText('ページ 0件、Inbox 0件、読書ログ 0件、断念履歴 0件', {
      exact: true,
    }),
  ).toBeVisible();

  await dashboard.locator('#backup-file').setInputFiles({
    name: 'yomiato-backup.json',
    mimeType: 'application/json',
    buffer: backup,
  });
  await expect(
    dashboard.getByText(
      '復元後：ページ 2件、Inbox 0件、読書ログ 1件、断念履歴 1件',
      { exact: true },
    ),
  ).toBeVisible();
  await dashboard
    .getByRole('dialog')
    .getByRole('button', { name: '全置換して復元', exact: true })
    .click();
  await expect(
    dashboard.getByText('バックアップを復元しました。', { exact: true }),
  ).toBeVisible();
  await expect(
    dashboard.getByText('ページ 2件、Inbox 0件、読書ログ 1件、断念履歴 1件', {
      exact: true,
    }),
  ).toBeVisible();
  await openLog(dashboard);
  await expect(
    dashboard.getByText('復元する読書ログ', { exact: true }),
  ).toBeVisible();
});

test('E2E-08 永続性', async ({}, testInfo) => {
  const firstContext = await createExtensionContext(
    testInfo,
    'persistent-profile',
  );
  const firstExtensionId = await getExtensionId(firstContext);
  await addInboxItem(
    firstContext,
    firstExtensionId,
    '/article-persistent',
    '永続する記事',
  );
  await firstContext.close();

  const secondContext = await createExtensionContext(
    testInfo,
    'persistent-profile',
  );
  try {
    const secondExtensionId = await getExtensionId(secondContext);
    const dashboard = await openDashboard(secondContext, secondExtensionId);
    await expect(dashboard.locator('.inbox-card')).toContainText(
      '永続する記事',
    );
  } finally {
    await secondContext.close();
  }
});
