import React from 'react';
import './DashboardApp.css';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { parseAndNormalizeUrl } from '../../domain/values/url';
import { MAX_TITLE_LENGTH } from '../../shared/constants/limits';
import { trimText } from '../../shared/utils/text';

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

export interface CompletionDraft {
  url: string;
  title: string;
}

export function getDashboardView(search: string): DashboardViewId {
  const view = new URLSearchParams(search).get('view');

  return dashboardViews.some((candidate) => candidate.id === view)
    ? (view as DashboardViewId)
    : defaultView;
}

export function getCompletionDraft(
  search: string,
): CompletionDraft | undefined {
  const params = new URLSearchParams(search);

  if (params.get('view') !== 'complete') {
    return undefined;
  }

  const url = params.get('url');
  const title = params.get('title');

  if (!url || title === null) {
    return undefined;
  }

  try {
    const parsedUrl = parseAndNormalizeUrl(url);
    const normalizedTitle = trimText(title);

    if (
      normalizedTitle.length === 0 ||
      Array.from(normalizedTitle).length > MAX_TITLE_LENGTH
    ) {
      return undefined;
    }

    return { url: parsedUrl.originalUrl, title: normalizedTitle };
  } catch {
    return undefined;
  }
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
  const [completionDraft, setCompletionDraft] = React.useState(() =>
    getCompletionDraft(window.location.search),
  );
  const completionRoute =
    new URLSearchParams(window.location.search).get('view') === 'complete';

  React.useEffect(() => {
    if (!completionRoute) {
      return;
    }

    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('view', completionDraft ? 'complete' : 'inbox');
    window.history.replaceState(
      { view: completionDraft ? 'complete' : 'inbox' },
      '',
      url,
    );
  }, [completionDraft, completionRoute]);

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
    setCompletionDraft(undefined);
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

      {completionDraft ? (
        <section className="view-panel" aria-labelledby="completion-heading">
          <p className="eyebrow">読了入力</p>
          <h2 id="completion-heading">読了として記録</h2>
          <p className="view-description">
            Popupで選んだページを読了として記録します。
          </p>
          <dl className="completion-page">
            <div>
              <dt>タイトル</dt>
              <dd>{completionDraft.title}</dd>
            </div>
            <div>
              <dt>URL</dt>
              <dd>{completionDraft.url}</dd>
            </div>
          </dl>
          <p className="status" role="status">
            振り返りの入力画面は次の工程で追加します。
          </p>
        </section>
      ) : (
        <section className="view-panel" aria-labelledby="active-view-heading">
          <p className="eyebrow">現在のビュー</p>
          <h2 id="active-view-heading">{selectedView.title}</h2>
          <p className="view-description">{selectedView.description}</p>
          <EmptyState
            title={selectedView.emptyTitle}
            description={selectedView.emptyDescription}
          />
        </section>
      )}
    </main>
  );
}

export default DashboardApp;
