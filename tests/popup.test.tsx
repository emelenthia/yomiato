import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '../src/application/errors';
import PopupApp from '../src/entrypoints/popup/PopupApp';
import type { PopupServices } from '../src/features/capture';

afterEach(() => cleanup());

function createServices({
  activeTab = {
    outcome: 'supported' as const,
    tab: { id: 1, url: 'https://example.com/article', title: '記事' },
  },
  inboxItem,
  readingEntryCount = 0,
  capture = vi.fn().mockResolvedValue({}),
}: {
  activeTab?: PopupServices['browser'] extends {
    getActiveTab: (...args: never[]) => infer Result;
  }
    ? Awaited<Result>
    : never;
  inboxItem?: object;
  readingEntryCount?: number;
  capture?: ReturnType<typeof vi.fn>;
} = {}): PopupServices {
  return {
    browser: {
      getActiveTab: vi.fn().mockResolvedValue(activeTab),
      openDashboard: vi.fn().mockResolvedValue(undefined),
    },
    getPageStatus: {
      execute: vi.fn().mockResolvedValue({
        page: undefined,
        normalizedUrl: 'https://example.com/article',
        inboxItem,
        readingEntryCount,
      }),
    },
    capturePageToInbox: { execute: capture },
  } as unknown as PopupServices;
}

describe('工程6のPopup', () => {
  it.each([
    ['未登録', undefined, 0, 'まだ登録されていません。'],
    ['Inbox登録済み', {}, 0, 'すでに後で読むにあります。'],
    ['読了履歴あり', undefined, 2, '読了記録があります（2回）。'],
    [
      'Inboxと読了履歴あり',
      {},
      2,
      'すでに後で読むにあり、読了記録もあります（2回）。',
    ],
  ])('%sの状態を表示する', async (_label, inboxItem, count, message) => {
    render(
      <PopupApp
        services={createServices({
          inboxItem,
          readingEntryCount: count,
        })}
      />,
    );

    expect(await screen.findByText(message)).toBeVisible();
  });

  it('対応外ページでは理由を表示し、登録操作を無効にする', async () => {
    render(
      <PopupApp
        services={createServices({
          activeTab: {
            outcome: 'unsupported',
            tab: {
              id: 1,
              url: 'chrome://settings',
              title: '設定',
              reason: 'UNSUPPORTED_URL',
            },
          },
        })}
      />,
    );

    expect(
      await screen.findByText('このページは保存できない種類のURLです。'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '後で読む' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '読了として記録' }),
    ).toBeDisabled();
  });

  it('登録成功時にタブを閉じてよいことを表示する', async () => {
    const services = createServices();
    const user = userEvent.setup();
    render(<PopupApp services={services} />);

    await user.click(await screen.findByRole('button', { name: '後で読む' }));

    expect(await screen.findByText(/追加しました/)).toBeVisible();
    expect(services.capturePageToInbox.execute).toHaveBeenCalledWith({
      url: 'https://example.com/article',
      title: '記事',
      source: 'current-tab',
    });
  });

  it('重複登録を状態メッセージとして表示する', async () => {
    const services = createServices({
      capture: vi
        .fn()
        .mockRejectedValue(new ApplicationError('ALREADY_IN_INBOX')),
    });
    render(<PopupApp services={services} />);

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: '後で読む' }));

    expect(await screen.findByText('すでに後で読むにあります。')).toBeVisible();
  });

  it('ストレージ失敗を表示する', async () => {
    const services = createServices({
      capture: vi.fn().mockRejectedValue(new Error('storage failed')),
    });
    render(<PopupApp services={services} />);

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: '後で読む' }));

    expect(await screen.findByText('保存に失敗しました。')).toBeVisible();
  });

  it('登録ボタンの連打を一件の保存に抑える', async () => {
    let resolveCapture: (value: unknown) => void = () => undefined;
    const capturePromise = new Promise((resolve) => {
      resolveCapture = resolve;
    });
    const services = createServices({
      capture: vi.fn(() => capturePromise),
    });
    const user = userEvent.setup();
    render(<PopupApp services={services} />);
    const button = await screen.findByRole('button', { name: '後で読む' });

    await user.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('保存しています。');
    await user.click(button);
    expect(services.capturePageToInbox.execute).toHaveBeenCalledTimes(1);

    resolveCapture({});
    expect(await screen.findByText(/追加しました/)).toBeVisible();
  });

  it('Dashboard導線と直接読了導線を開く', async () => {
    const services = createServices();
    const user = userEvent.setup();
    render(<PopupApp services={services} />);

    await user.click(
      await screen.findByRole('button', { name: 'よみあとを開く' }),
    );
    expect(services.browser.openDashboard).toHaveBeenCalledWith();

    await user.click(screen.getByRole('button', { name: '読了として記録' }));
    expect(services.browser.openDashboard).toHaveBeenLastCalledWith({
      view: 'complete',
      url: 'https://example.com/article',
      title: '記事',
    });
  });
});
