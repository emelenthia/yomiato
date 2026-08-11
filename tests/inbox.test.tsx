import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InboxListItem } from '../src/application/dto';
import { ApplicationError } from '../src/application/errors';
import InboxView from '../src/features/inbox/InboxView';
import type { InboxServices } from '../src/features/inbox/inbox-services';

afterEach(() => cleanup());

function createItem(
  id: string,
  title: string,
  url: string,
  addedAt: string,
): InboxListItem {
  return {
    page: {
      id: `page-${id}`,
      normalizedUrl: url,
      originalUrl: url,
      title,
      siteName: new URL(url).hostname,
      createdAt: addedAt,
      updatedAt: addedAt,
    },
    inboxItem: {
      id: `inbox-${id}`,
      pageId: `page-${id}`,
      status: 'unread',
      source: 'current-tab',
      addedAt,
    },
  };
}

function createServices(
  items: ReadonlyArray<InboxListItem> = [
    createItem(
      'new',
      '新しい記事',
      'https://example.com/new',
      '2026-08-11T02:00:00.000Z',
    ),
    createItem(
      'old',
      '古い記事',
      'https://example.org/old',
      '2026-08-11T01:00:00.000Z',
    ),
  ],
): InboxServices {
  return {
    browser: { openSavedUrl: vi.fn().mockResolvedValue(undefined) },
    listInbox: { execute: vi.fn().mockResolvedValue(items) },
    completeInboxItem: { execute: vi.fn().mockResolvedValue(undefined) },
    dismissInboxItem: { execute: vi.fn().mockResolvedValue(undefined) },
    deleteInboxItem: { execute: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('工程8のInbox', () => {
  it('登録日の降順で一覧、件数、タイトル、サイト、元URLを表示する', async () => {
    const services = createServices();

    render(<InboxView services={services} />);

    expect(
      await screen.findByRole('heading', { name: '新しい記事' }),
    ).toBeVisible();
    expect(screen.getByText('未読：2件')).toBeVisible();
    expect(screen.getAllByText(/example\.com/)[0]).toBeVisible();
    expect(screen.getByText('https://example.org/old')).toBeVisible();
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['新しい記事', '古い記事']);
  });

  it('タイトルとURLの検索語をApplicationへ渡す', async () => {
    const services = createServices();
    const user = userEvent.setup();

    render(<InboxView services={services} />);
    await screen.findByRole('heading', { name: '新しい記事' });
    await user.type(
      screen.getByRole('searchbox', { name: 'Inboxを検索' }),
      'example.org',
    );

    expect(services.listInbox.execute).toHaveBeenLastCalledWith('example.org');
  });

  it('振り返りなしでは読了せず、入力後はInboxから除去する', async () => {
    const services = createServices();
    const user = userEvent.setup();

    render(<InboxView services={services} />);
    await screen.findByRole('heading', { name: '新しい記事' });
    await user.click(screen.getAllByRole('button', { name: '読了' })[0]!);
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '振り返りを入力するか、「得るものなし」を選択してください。',
    );
    expect(services.completeInboxItem.execute).not.toHaveBeenCalled();

    await user.type(
      screen.getByRole('textbox', { name: '振り返り' }),
      '一言の学び',
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(services.completeInboxItem.execute).toHaveBeenCalledWith({
      inboxItemId: 'inbox-new',
      reflection: '一言の学び',
      noTakeaway: false,
    });
    expect(await screen.findByText('読了として記録しました。')).toBeVisible();
  });

  it('得るものなしを選んだときも入力値を消さずに明示した状態で保存する', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
      ),
    ]);
    const user = userEvent.setup();

    render(<InboxView services={services} />);
    await screen.findByRole('heading', { name: '記事' });
    await user.click(screen.getByRole('button', { name: '読了' }));
    const reflection = screen.getByRole('textbox', { name: '振り返り' });
    await user.type(reflection, '入力したまま');
    await user.click(
      screen.getByRole('checkbox', { name: '得るものなしとして記録する' }),
    );

    expect(reflection).toHaveValue('入力したまま');
    expect(screen.getByText(/保存時は「得るものなし」/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(services.completeInboxItem.execute).toHaveBeenCalledWith({
      inboxItemId: 'inbox-one',
      reflection: '入力したまま',
      noTakeaway: true,
    });
  });

  it('断念は任意理由を保存し、削除は確認後に実行する', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
      ),
    ]);
    const user = userEvent.setup();

    render(<InboxView services={services} />);
    await screen.findByRole('heading', { name: '記事' });
    await user.click(screen.getByRole('button', { name: '断念' }));
    await user.type(
      screen.getByRole('textbox', { name: '断念理由（任意）' }),
      '今は不要',
    );
    await user.click(screen.getByRole('button', { name: '断念する' }));

    expect(services.dismissInboxItem.execute).toHaveBeenCalledWith({
      inboxItemId: 'inbox-one',
      reason: '今は不要',
    });

    await user.click(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '断念履歴は残りません',
    );
    expect(services.deleteInboxItem.execute).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '削除する' }));

    expect(services.deleteInboxItem.execute).toHaveBeenCalledWith('inbox-one');
  });

  it('元ページを開く操作をBrowser Gatewayへ委譲する', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
      ),
    ]);
    const user = userEvent.setup();

    render(<InboxView services={services} />);
    await screen.findByRole('heading', { name: '記事' });
    await user.click(screen.getByRole('button', { name: '元ページを開く' }));

    expect(services.browser.openSavedUrl).toHaveBeenCalledWith(
      'https://example.com/one',
    );
  });

  it('読了保存の失敗時はInboxを残してエラーを表示する', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
      ),
    ]);
    services.completeInboxItem.execute = vi
      .fn()
      .mockRejectedValue(new ApplicationError('STORAGE_FAILURE'));
    const user = userEvent.setup();

    render(<InboxView services={services} />);
    await screen.findByRole('heading', { name: '記事' });
    await user.click(screen.getByRole('button', { name: '読了' }));
    await user.type(
      screen.getByRole('textbox', { name: '振り返り' }),
      '保存失敗',
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '読了として保存できませんでした',
    );
    expect(
      screen.getByRole('heading', { name: '記事', hidden: true }),
    ).toBeVisible();
  });
});
