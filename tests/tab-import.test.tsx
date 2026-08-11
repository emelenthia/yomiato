import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserGatewayError } from '../src/infrastructure/browser';
import type { ImportTabsToInboxOutput } from '../src/application/dto';
import TabImportPanel from '../src/features/tab-import/TabImportPanel';
import type { TabImportServices } from '../src/features/tab-import';
import DashboardApp from '../src/entrypoints/dashboard/DashboardApp';

afterEach(() => cleanup());

function createServices(
  overrides: Partial<TabImportServices> = {},
): TabImportServices {
  return {
    browser: {
      hasTabsPermission: vi.fn().mockResolvedValue(true),
      requestTabsPermission: vi.fn().mockResolvedValue(undefined),
      listCurrentWindowTabs: vi.fn().mockResolvedValue([]),
    },
    getPageStatus: {
      execute: vi.fn().mockResolvedValue({
        page: undefined,
        normalizedUrl: 'https://example.com',
        inboxItem: undefined,
        readingEntryCount: 0,
      }),
    },
    importTabsToInbox: {
      execute: vi.fn().mockResolvedValue({
        added: 0,
        duplicate: 0,
        unsupported: 0,
        failed: 0,
        results: [],
      }),
    },
    ...overrides,
  } as TabImportServices;
}

describe('工程7の複数タブ取り込み', () => {
  it('開くと内部へフォーカスし、Escapeと閉じる操作で起点へ戻る', async () => {
    const services = createServices();
    const user = userEvent.setup();

    render(<DashboardApp tabImportServices={services} />);
    await user.click(
      screen.getByRole('button', { name: '複数タブを取り込む' }),
    );
    expect(screen.getByRole('dialog')).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', { name: '複数タブを取り込む' }),
    ).toHaveFocus();

    await user.click(
      screen.getByRole('button', { name: '複数タブを取り込む' }),
    );
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', { name: '複数タブを取り込む' }),
    ).toHaveFocus();
  });

  it('背景を不活性化し、Tabフォーカスをパネル内で循環させる', async () => {
    const user = userEvent.setup();

    render(<DashboardApp tabImportServices={createServices()} />);
    await user.click(
      screen.getByRole('button', { name: '複数タブを取り込む' }),
    );

    const dialog = screen.getByRole('dialog');
    const navigation = screen.getByRole('navigation', { hidden: true });
    const closeButton = screen.getByRole('button', { name: '閉じる' });
    const loadButton = screen.getByRole('button', {
      name: 'タブ一覧を読み込む',
    });

    expect(navigation).toHaveAttribute('aria-hidden', 'true');
    expect(navigation).toHaveAttribute('inert');

    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(loadButton).toHaveFocus();

    loadButton.focus();
    fireEvent.keyDown(loadButton, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    expect(dialog).toBeInTheDocument();
  });

  it('ビューのpopstateでパネルを閉じ、背景の不活性化を解除する', async () => {
    const user = userEvent.setup();

    render(<DashboardApp tabImportServices={createServices()} />);
    await user.click(screen.getByRole('button', { name: '読書ログ' }));
    await user.click(screen.getByRole('button', { name: 'Inbox' }));
    await user.click(
      screen.getByRole('button', { name: '複数タブを取り込む' }),
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    window.history.back();
    fireEvent.popState(window);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('navigation')).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: '読書ログ' })).toBeEnabled();
  });

  it('一覧の読み込み後にタブ選択へフォーカスを移す', async () => {
    const services = createServices({
      browser: {
        hasTabsPermission: vi.fn().mockResolvedValue(true),
        requestTabsPermission: vi.fn(),
        listCurrentWindowTabs: vi.fn().mockResolvedValue([
          {
            outcome: 'supported',
            tab: { id: 1, url: 'https://example.com/article', title: '記事' },
          },
        ]),
      },
    });
    const user = userEvent.setup();

    render(<TabImportPanel services={services} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: 'タブ一覧を読み込む' }),
    );

    expect(await screen.findByRole('checkbox', { name: /記事/ })).toHaveFocus();
  });

  it('既に権限が許可されていれば追加要求を行わない', async () => {
    const services = createServices({
      browser: {
        hasTabsPermission: vi.fn().mockResolvedValue(true),
        requestTabsPermission: vi.fn(),
        listCurrentWindowTabs: vi.fn().mockResolvedValue([
          {
            outcome: 'supported',
            tab: { id: 1, url: 'https://example.com/article', title: '記事' },
          },
        ]),
      },
    });
    const user = userEvent.setup();

    render(<TabImportPanel services={services} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: 'タブ一覧を読み込む' }),
    );

    expect(services.browser.requestTabsPermission).not.toHaveBeenCalled();
    expect(await screen.findByRole('checkbox', { name: /記事/ })).toBeChecked();
  });

  it('権限を直接操作内で要求し、混在したタブを表示する', async () => {
    const services = createServices({
      browser: {
        hasTabsPermission: vi.fn().mockResolvedValue(false),
        requestTabsPermission: vi.fn().mockResolvedValue(undefined),
        listCurrentWindowTabs: vi.fn().mockResolvedValue([
          {
            outcome: 'supported',
            tab: {
              id: 1,
              url: 'https://example.com/article',
              title: '記事',
            },
          },
          {
            outcome: 'unsupported',
            tab: {
              id: 2,
              url: 'chrome://settings',
              title: '設定',
              reason: 'UNSUPPORTED_URL',
            },
          },
        ]),
      },
    });
    const user = userEvent.setup();

    render(<TabImportPanel services={services} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: 'タブ一覧を読み込む' }),
    );

    expect(services.browser.hasTabsPermission).toHaveBeenCalledOnce();
    expect(services.browser.requestTabsPermission).toHaveBeenCalledOnce();
    expect(await screen.findByText('記事')).toBeVisible();
    expect(screen.getByText('設定')).toBeVisible();
    expect(screen.getByText('対応外URL')).toBeVisible();
    expect(screen.getByText('1件を選択中')).toBeVisible();
  });

  it('既存Inboxと入力内重複を選択不可にする', async () => {
    const services = createServices({
      browser: {
        hasTabsPermission: vi.fn().mockResolvedValue(true),
        requestTabsPermission: vi.fn().mockResolvedValue(undefined),
        listCurrentWindowTabs: vi.fn().mockResolvedValue([
          {
            outcome: 'supported',
            tab: { id: 1, url: 'https://example.com/one', title: '一件目' },
          },
          {
            outcome: 'supported',
            tab: {
              id: 2,
              url: 'https://example.com/one#same',
              title: '同じページ',
            },
          },
          {
            outcome: 'supported',
            tab: { id: 3, url: 'https://example.com/two', title: '登録済み' },
          },
        ]),
      },
      getPageStatus: {
        execute: vi.fn().mockImplementation(async (url: string) => ({
          page: undefined,
          normalizedUrl: url.includes('/two')
            ? 'https://example.com/two'
            : 'https://example.com/one',
          inboxItem: url.includes('/two') ? {} : undefined,
          readingEntryCount: 0,
        })),
      },
    });
    const user = userEvent.setup();

    render(<TabImportPanel services={services} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: 'タブ一覧を読み込む' }),
    );

    expect(screen.getByRole('checkbox', { name: /一件目/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /同じページ/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /登録済み/ })).toBeDisabled();
    expect(screen.getByText('同じページのタブが一覧内で重複')).toBeVisible();
    expect(screen.getByText('すでにInboxに登録済み')).toBeVisible();
  });

  it('選択ゼロでは実行できず、部分成功の結果を残す', async () => {
    let resolveImport: (value: ImportTabsToInboxOutput) => void = () =>
      undefined;
    const importPromise = new Promise<ImportTabsToInboxOutput>((resolve) => {
      resolveImport = resolve;
    });
    const importTabsToInbox = {
      execute: vi.fn(() => importPromise),
    };
    const services = createServices({
      browser: {
        hasTabsPermission: vi.fn().mockResolvedValue(true),
        requestTabsPermission: vi.fn().mockResolvedValue(undefined),
        listCurrentWindowTabs: vi.fn().mockResolvedValue([
          {
            outcome: 'supported',
            tab: { id: 1, url: 'https://example.com/one', title: '一件目' },
          },
          {
            outcome: 'supported',
            tab: { id: 2, url: 'https://example.com/two', title: '二件目' },
          },
        ]),
      },
      importTabsToInbox,
    });
    const user = userEvent.setup();

    render(<TabImportPanel services={services} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: 'タブ一覧を読み込む' }),
    );
    const importButton = screen.getByRole('button', { name: 'Inboxへ追加' });
    expect(importButton).toBeEnabled();

    await user.click(screen.getByRole('checkbox', { name: /一件目/ }));
    await user.click(screen.getByRole('checkbox', { name: /二件目/ }));
    expect(importButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /一件目/ }));
    expect(importButton).toBeEnabled();
    await user.click(importButton);
    expect(importButton).toBeDisabled();
    await user.click(importButton);
    expect(importTabsToInbox.execute).toHaveBeenCalledTimes(1);

    resolveImport({
      added: 0,
      duplicate: 0,
      unsupported: 0,
      failed: 1,
      results: [
        {
          tab: { url: 'https://example.com/one', title: '一件目' },
          outcome: 'failed',
        },
      ],
    });
    expect(await screen.findByText(/失敗 1件/)).toBeVisible();
  });

  it('権限拒否を説明し、再読み込みを表示する', async () => {
    const services = createServices({
      browser: {
        hasTabsPermission: vi.fn().mockResolvedValue(false),
        requestTabsPermission: vi
          .fn()
          .mockRejectedValue(new BrowserGatewayError('PERMISSION_DENIED')),
        listCurrentWindowTabs: vi.fn(),
      },
    });
    const user = userEvent.setup();

    render(<TabImportPanel services={services} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: 'タブ一覧を読み込む' }),
    );

    expect(
      await screen.findByText(
        'タブ情報への権限が許可されませんでした。個別のページ登録は引き続き利用できます。',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'もう一度読み込む' }),
    ).toBeVisible();
    expect(services.browser.listCurrentWindowTabs).not.toHaveBeenCalled();
  });
});
