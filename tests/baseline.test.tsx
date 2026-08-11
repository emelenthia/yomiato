import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PopupApp from '../src/entrypoints/popup/PopupApp';
import DashboardApp, {
  getDashboardView,
} from '../src/entrypoints/dashboard/DashboardApp';
import { DashboardErrorBoundary } from '../src/entrypoints/dashboard/DashboardErrorBoundary';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('工程5のDashboard', () => {
  it('Popupを表示できる', () => {
    render(<PopupApp />);

    expect(
      screen.getByRole('heading', { name: /読みたいページ/ }),
    ).toBeVisible();
  });

  it('Inboxの空状態を表示できる', () => {
    render(<DashboardApp />);

    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    expect(screen.getByText('まだ読むページがありません')).toBeVisible();
  });

  it('ナビゲーションでビューを切り替え、URLへ保存する', () => {
    window.history.replaceState({}, '', '/dashboard.html');
    render(<DashboardApp />);

    fireEvent.click(screen.getByRole('button', { name: '読書ログ' }));

    expect(screen.getByRole('heading', { name: '読書ログ' })).toBeVisible();
    expect(screen.getByText('読書ログはまだありません')).toBeVisible();
    expect(window.location.search).toBe('?view=log');
    expect(screen.getByRole('button', { name: '読書ログ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('URLのビューを初期状態として復元する', () => {
    window.history.replaceState({}, '', '/dashboard.html?view=settings');
    render(<DashboardApp />);

    expect(
      screen.getByRole('heading', { name: '設定・データ管理' }),
    ).toBeVisible();
    expect(screen.getByText('保存データはまだありません')).toBeVisible();
  });

  it('同じビューを選び直しても履歴を追加しない', () => {
    window.history.replaceState({}, '', '/dashboard.html?view=inbox');
    render(<DashboardApp />);
    const pushState = vi.spyOn(window.history, 'pushState');

    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }));

    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it('popstateで戻る・進む先のビューへ追従する', () => {
    window.history.replaceState({}, '', '/dashboard.html?view=inbox');
    render(<DashboardApp />);

    window.history.pushState({}, '', '/dashboard.html?view=log');
    fireEvent.popState(window);
    expect(screen.getByRole('heading', { name: '読書ログ' })).toBeVisible();

    window.history.pushState({}, '', '/dashboard.html?view=settings');
    fireEvent.popState(window);
    expect(
      screen.getByRole('heading', { name: '設定・データ管理' }),
    ).toBeVisible();
  });

  it('未対応または欠落したビューはInboxへ戻す', () => {
    expect(getDashboardView('?view=unknown')).toBe('inbox');
    expect(getDashboardView('')).toBe('inbox');
  });

  it('ビュー操作をキーボードで行え、フォーカス表示用の属性を持つ', async () => {
    window.history.replaceState({}, '', '/dashboard.html');
    render(<DashboardApp />);
    const logButton = screen.getByRole('button', { name: '読書ログ' });
    const user = userEvent.setup();

    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(logButton);
    expect(screen.getByRole('heading', { name: '読書ログ' })).toBeVisible();
    expect(logButton).toHaveAttribute('type', 'button');
  });

  it('予期しない描画エラーを画面内に表示する', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    function BrokenView() {
      throw new Error('unexpected');

      return null;
    }

    render(
      <DashboardErrorBoundary>
        <BrokenView />
      </DashboardErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('画面を表示できません');

    consoleError.mockRestore();
  });
});
