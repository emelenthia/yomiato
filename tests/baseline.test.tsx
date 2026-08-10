import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PopupApp from '../src/entrypoints/popup/PopupApp';
import DashboardApp from '../src/entrypoints/dashboard/DashboardApp';

describe('工程0の仮画面', () => {
  it('Popupを表示できる', () => {
    render(<PopupApp />);

    expect(
      screen.getByRole('heading', { name: /読みたいページ/ }),
    ).toBeVisible();
  });

  it('Dashboardの3つのビューを表示できる', () => {
    render(<DashboardApp />);

    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '読書ログ' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: '設定・データ管理' }),
    ).toBeVisible();
  });
});
