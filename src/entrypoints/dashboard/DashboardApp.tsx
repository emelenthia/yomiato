import React from 'react';
import './DashboardApp.css';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';

export const dashboardViews = [
  {
    id: 'inbox',
    title: 'Inbox',
    description: '未読ページを確認します。',
    emptyTitle: 'まだ読むページがありません',
    emptyDescription: 'Popupからページを追加すると、ここで確認できます。',
  },
  {
    id: 'log',
    title: '読書ログ',
    description: '読了したページと振り返りを確認します。',
    emptyTitle: '読書ログはまだありません',
    emptyDescription: 'ページを読了として記録すると、ここに残ります。',
  },
  {
    id: 'settings',
    title: '設定・データ管理',
    description: '保存方針とデータ管理を確認します。',
    emptyTitle: '保存データはまだありません',
    emptyDescription: 'データ管理の機能は後続の工程で利用できます。',
  },
] as const;

export type DashboardViewId = (typeof dashboardViews)[number]['id'];

const defaultView: DashboardViewId = 'inbox';

export function getDashboardView(search: string): DashboardViewId {
  const view = new URLSearchParams(search).get('view');

  return dashboardViews.some((candidate) => candidate.id === view)
    ? (view as DashboardViewId)
    : defaultView;
}

function updateDashboardUrl(view: DashboardViewId) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  window.history.pushState({ view }, '', url);
}

function DashboardApp() {
  const [activeView, setActiveView] = React.useState<DashboardViewId>(() =>
    getDashboardView(window.location.search),
  );

  React.useEffect(() => {
    const handlePopState = () => {
      setActiveView(getDashboardView(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectedView = dashboardViews.find((view) => view.id === activeView);

  if (!selectedView) {
    return null;
  }

  const handleViewChange = (view: DashboardViewId) => {
    if (view === activeView) {
      return;
    }

    updateDashboardUrl(view);
    setActiveView(view);
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">よみあと</p>
          <h1>読書の記録</h1>
        </div>
        <p className="status" role="status">
          データはこの端末内に保存されます。
        </p>
      </header>

      <nav aria-label="管理画面のビュー">
        {dashboardViews.map((view) => (
          <Button
            type="button"
            key={view.id}
            className={view.id === activeView ? 'is-active' : ''}
            aria-current={view.id === activeView ? 'page' : undefined}
            onClick={() => handleViewChange(view.id)}
          >
            {view.title}
          </Button>
        ))}
      </nav>

      <section className="view-panel" aria-labelledby="active-view-heading">
        <p className="eyebrow">現在のビュー</p>
        <h2 id="active-view-heading">{selectedView.title}</h2>
        <p className="view-description">{selectedView.description}</p>
        <EmptyState
          title={selectedView.emptyTitle}
          description={selectedView.emptyDescription}
        />
      </section>
    </main>
  );
}

export default DashboardApp;
