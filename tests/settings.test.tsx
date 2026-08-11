import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  BackupPreview,
  DataSummary,
  ExportBackupOutput,
} from '../src/application/dto';
import SettingsView from '../src/features/settings/SettingsView';
import type { SettingsServices } from '../src/features/settings/settings-services';

afterEach(() => {
  cleanup();
});

function createServices(
  overrides: Partial<SettingsServices> = {},
): SettingsServices {
  const summary: DataSummary = {
    schemaVersion: 1,
    pages: 2,
    inboxItems: 1,
    readingEntries: 3,
    dismissalEntries: 1,
    settings: 0,
  };
  const preview: BackupPreview = {
    appVersion: '0.0.0-test',
    exportedAt: '2026-08-11T00:00:00.000Z',
    schemaVersion: 1,
    pages: 1,
    inboxItems: 1,
    readingEntries: 1,
    dismissalEntries: 0,
    settings: 0,
    totalRecords: 3,
  };
  const output = {
    backup: { exportedAt: '2026-08-11T00:00:00.000Z' },
    json: '{"formatName":"yomiato-backup"}',
  } as unknown as ExportBackupOutput;

  return {
    browser: {
      downloadJson: vi.fn(),
      readFile: vi.fn(async () => '{"valid":true}'),
    },
    clearAllData: { execute: vi.fn(async () => undefined) },
    exportBackup: { execute: vi.fn(async () => output) },
    getDataSummary: { execute: vi.fn(async () => summary) },
    importBackup: {
      execute: vi.fn(async () => preview),
      preview: vi.fn(() => preview),
    },
    ...overrides,
  } as SettingsServices;
}

describe('工程10の設定・データ管理', () => {
  it('保存方針と現在の件数を表示する', async () => {
    render(<SettingsView services={createServices()} />);

    expect(screen.getByText(/ページ本文は保存せず/)).toBeVisible();
    await waitFor(() => {
      expect(
        screen.getByText(/ページ 2件、Inbox 1件、読書ログ 3件/),
      ).toBeVisible();
    });
    expect(screen.getByText('保存件数')).toBeVisible();
    expect(screen.getByText('schemaVersion 1')).toBeVisible();
  });

  it('整合性検査済みJSONを日付付きファイル名でエクスポートする', async () => {
    const services = createServices();
    const user = userEvent.setup();
    render(<SettingsView services={services} />);

    await user.click(
      screen.getByRole('button', { name: 'JSONをエクスポート' }),
    );

    await waitFor(() => {
      expect(services.exportBackup.execute).toHaveBeenCalledTimes(1);
      expect(services.browser.downloadJson).toHaveBeenCalledWith(
        '{"formatName":"yomiato-backup"}',
        'yomiato-backup-2026-08-11.json',
      );
    });
    expect(screen.getByText('バックアップを保存しました。')).toBeVisible();
  });

  it('JSONをプレビューし、確認後に全置換復元して反映通知する', async () => {
    const services = createServices();
    const onDataChanged = vi.fn();
    const user = userEvent.setup();
    render(<SettingsView onDataChanged={onDataChanged} services={services} />);

    const file = new File(['{"valid":true}'], 'backup.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText('JSONファイルを選ぶ'), file);

    expect(
      await screen.findByRole('heading', {
        name: 'バックアップを復元しますか',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/復元後：ページ 1件、Inbox 1件、読書ログ 1件/),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: '全置換して復元' }));

    await waitFor(() => {
      expect(services.importBackup.execute).toHaveBeenCalledWith(
        '{"valid":true}',
      );
      expect(onDataChanged).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('バックアップを復元しました。')).toBeVisible();
  });

  it('上限を超えるファイルを読み込まずに拒否する', async () => {
    const services = createServices();
    const user = userEvent.setup();
    render(<SettingsView services={services} />);

    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.json',
      {
        type: 'application/json',
      },
    );
    await user.upload(screen.getByLabelText('JSONファイルを選ぶ'), file);

    expect(
      screen.getByText(
        'ファイルが大きすぎます。10 MiB以下のJSONを選んでください。',
      ),
    ).toBeVisible();
    expect(services.browser.readFile).not.toHaveBeenCalled();
  });

  it('ファイル読み込み中は入力を無効化し、最新の選択結果だけを採用する', async () => {
    let resolveFirst: (value: string) => void = () => undefined;
    let resolveSecond: (value: string) => void = () => undefined;
    const firstRead = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const secondRead = new Promise<string>((resolve) => {
      resolveSecond = resolve;
    });
    const services = createServices({
      browser: {
        downloadJson: vi.fn(),
        readFile: vi
          .fn()
          .mockReturnValueOnce(firstRead)
          .mockReturnValueOnce(secondRead),
      },
    });
    const user = userEvent.setup();
    render(<SettingsView services={services} />);

    const input = screen.getByLabelText('JSONファイルを選ぶ');
    fireEvent.change(input, {
      target: { files: [new File(['first'], 'first.json')] },
    });
    expect(input).toBeDisabled();

    fireEvent.change(input, {
      target: { files: [new File(['second'], 'second.json')] },
    });
    resolveSecond('second-json');
    expect(
      await screen.findByRole('heading', {
        name: 'バックアップを復元しますか',
      }),
    ).toBeVisible();
    resolveFirst('first-json');
    await waitFor(() =>
      expect(services.browser.readFile).toHaveBeenCalledTimes(2),
    );

    await user.click(screen.getByRole('button', { name: '全置換して復元' }));
    await waitFor(() => {
      expect(services.importBackup.execute).toHaveBeenCalledWith('second-json');
    });
  });

  it('「よみあと」の入力後だけ全データ削除を実行する', async () => {
    const services = createServices();
    const onDataChanged = vi.fn();
    const user = userEvent.setup();
    render(<SettingsView onDataChanged={onDataChanged} services={services} />);

    await user.click(
      screen.getByRole('button', { name: '全データ削除を開始' }),
    );
    const clearButton = screen.getByRole('button', { name: 'すべて削除' });
    expect(clearButton).toBeDisabled();
    await user.type(screen.getByLabelText('確認文字列'), 'よみあと');
    expect(clearButton).toBeEnabled();
    await user.click(clearButton);

    await waitFor(() => {
      expect(services.clearAllData.execute).toHaveBeenCalledTimes(1);
      expect(onDataChanged).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('すべてのデータを削除しました。')).toBeVisible();
  });
});
