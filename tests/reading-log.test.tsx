import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReadingLogItem } from '../src/application/dto';
import { ApplicationError } from '../src/application/errors';
import ReadingLogView from '../src/features/reading-log/ReadingLogView';
import type { ReadingLogServices } from '../src/features/reading-log/reading-log-services';

afterEach(() => cleanup());

function createItem(
  id: string,
  title: string,
  url: string,
  completedAt: string,
  reflection = '最初の気づき',
): ReadingLogItem {
  return {
    page: {
      id: `page-${id}`,
      normalizedUrl: url,
      originalUrl: url,
      title,
      siteName: new URL(url).hostname,
      createdAt: completedAt,
      updatedAt: completedAt,
    },
    readingEntry: {
      id: `reading-${id}`,
      pageId: `page-${id}`,
      reflection,
      reflectionType: reflection ? 'impression' : 'none',
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    },
  };
}

function createServices(
  items: ReadonlyArray<ReadingLogItem> = [
    createItem(
      'new',
      '新しい記事',
      'https://example.com/new',
      '2026-08-11T02:00:00.000Z',
      '新しい学び',
    ),
    createItem(
      'old',
      '古い記事',
      'https://example.org/old',
      '2026-08-11T01:00:00.000Z',
      '',
    ),
  ],
): ReadingLogServices {
  return {
    browser: { openSavedUrl: vi.fn().mockResolvedValue(undefined) },
    listReadingLog: { execute: vi.fn().mockResolvedValue(items) },
    updateReadingEntry: { execute: vi.fn().mockResolvedValue(undefined) },
    recordReread: { execute: vi.fn().mockResolvedValue(undefined) },
    deleteReadingEntry: { execute: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('工程9の読書ログ', () => {
  it('振り返りを主情報として表示し、得るものなしも表示する', async () => {
    const services = createServices();

    render(<ReadingLogView services={services} />);

    expect(await screen.findByText('新しい学び')).toBeVisible();
    expect(screen.getByText('得るものなし')).toBeVisible();
    expect(screen.getByText('読了：2件')).toBeVisible();
    expect(screen.getByText('https://example.org/old')).toBeVisible();
  });

  it('タイトル、URL、サイト、振り返りの検索語をApplicationへ渡す', async () => {
    const services = createServices();
    const user = userEvent.setup();

    render(<ReadingLogView services={services} />);
    await screen.findByText('新しい学び');
    await user.type(
      screen.getByRole('searchbox', { name: '読書ログを検索' }),
      'example.org',
    );

    expect(services.listReadingLog.execute).toHaveBeenLastCalledWith(
      'example.org',
    );
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

    render(<ReadingLogView services={services} />);
    await screen.findByText('最初の気づき');
    await user.click(screen.getByRole('button', { name: '元ページを開く' }));

    expect(services.browser.openSavedUrl).toHaveBeenCalledWith(
      'https://example.com/one',
    );
  });

  it('編集は既存値を初期表示し、completedAtを変更せず更新する', async () => {
    const item = createItem(
      'one',
      '記事',
      'https://example.com/one',
      '2026-08-11T00:00:00.000Z',
      '既存の振り返り',
    );
    const services = createServices([item]);
    const user = userEvent.setup();

    render(<ReadingLogView services={services} />);
    await screen.findByText('既存の振り返り');
    await user.click(screen.getByRole('button', { name: '編集' }));

    const reflection = screen.getByRole('textbox', { name: '振り返り' });
    expect(reflection).toHaveValue('既存の振り返り');
    await user.clear(reflection);
    await user.type(reflection, '更新した振り返り');
    await user.click(screen.getByRole('button', { name: '更新する' }));

    expect(services.updateReadingEntry.execute).toHaveBeenCalledWith({
      readingEntryId: 'reading-one',
      reflection: '更新した振り返り',
      noTakeaway: false,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('再読は過去の振り返りをコピーせず、新しい記録を作る', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
        '過去の振り返り',
      ),
    ]);
    const user = userEvent.setup();

    render(<ReadingLogView services={services} />);
    await screen.findByText('過去の振り返り');
    await user.click(screen.getByRole('button', { name: '再読' }));

    expect(screen.getByRole('textbox', { name: '振り返り' })).toHaveValue('');
    await user.type(
      screen.getByRole('textbox', { name: '振り返り' }),
      '再読の気づき',
    );
    await user.click(screen.getByRole('button', { name: '再読を保存' }));

    expect(services.recordReread.execute).toHaveBeenCalledWith({
      readingEntryId: 'reading-one',
      reflection: '再読の気づき',
      noTakeaway: false,
    });
  });

  it('削除は確認後に一件だけ実行する', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
      ),
    ]);
    const user = userEvent.setup();

    render(<ReadingLogView services={services} />);
    await screen.findByText('最初の気づき');
    await user.click(screen.getByRole('button', { name: '削除' }));
    expect(services.deleteReadingEntry.execute).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '削除する' }));

    expect(services.deleteReadingEntry.execute).toHaveBeenCalledWith(
      'reading-one',
    );
  });

  it('振り返りをHTMLとして解釈しない', async () => {
    const services = createServices([
      createItem(
        'one',
        '記事',
        'https://example.com/one',
        '2026-08-11T00:00:00.000Z',
        '<strong>文字列</strong>',
      ),
    ]);

    render(<ReadingLogView services={services} />);

    expect(await screen.findByText('<strong>文字列</strong>')).toBeVisible();
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });

  it('一覧取得に失敗したときは対処可能なエラーを表示する', async () => {
    const services = createServices();
    services.listReadingLog.execute = vi
      .fn()
      .mockRejectedValue(new ApplicationError('STORAGE_FAILURE'));

    render(<ReadingLogView services={services} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '読書ログを表示できません',
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'もう一度読み込む' }));
    await waitFor(() =>
      expect(services.listReadingLog.execute).toHaveBeenCalledTimes(2),
    );
  });
});
