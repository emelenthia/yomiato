import React from 'react';
import './DashboardApp.css';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { parseAndNormalizeUrl } from '../../domain/values/url';
import { normalizeTitle } from '../../shared/utils/text';
import TabImportPanel from '../../features/tab-import/TabImportPanel';
import type { TabImportServices } from '../../features/tab-import';
import InboxView from '../../features/inbox/InboxView';
import type { InboxServices } from '../../features/inbox/inbox-services';
import ReadingLogView from '../../features/reading-log/ReadingLogView';
import type { ReadingLogServices } from '../../features/reading-log/reading-log-services';
import SettingsView from '../../features/settings/SettingsView';
import type { SettingsServices } from '../../features/settings/settings-services';

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
    emptyDescription: '設定・データ管理を利用できません。',
  },
] as const;

export type DashboardViewId = (typeof dashboardViews)[number]['id'];

const defaultView: DashboardViewId = 'inbox';

export interface CompletionDraft {
  url: string;
  title: string;
}

export interface DashboardAppProps {
  tabImportServices?: TabImportServices;
  inboxServices?: InboxServices;
  readingLogServices?: ReadingLogServices;
  settingsServices?: SettingsServices;
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
    const normalizedTitle = normalizeTitle(title, parsedUrl.siteName);

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

function DashboardApp({
  tabImportServices,
  inboxServices,
  readingLogServices,
  settingsServices,
}: DashboardAppProps) {
  const [activeView, setActiveView] = React.useState<DashboardViewId>(() =>
    getDashboardView(window.location.search),
  );
  const [completionDraft, setCompletionDraft] = React.useState(() =>
    getCompletionDraft(window.location.search),
  );
  const [isTabImportOpen, setIsTabImportOpen] = React.useState(false);
  const [inboxRefreshToken, setInboxRefreshToken] = React.useState(0);
  const [dataRefreshToken, setDataRefreshToken] = React.useState(0);
  const tabImportTriggerRef = React.useRef<HTMLButtonElement>(null);
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
      setIsTabImportOpen(false);
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
    setIsTabImportOpen(false);
    setActiveView(view);
  };

  const handleTabImportClose = () => {
    setIsTabImportOpen(false);
    setInboxRefreshToken((current) => current + 1);
    window.setTimeout(() => tabImportTriggerRef.current?.focus(), 0);
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

      <nav
        aria-label="管理画面のビュー"
        aria-hidden={isTabImportOpen || undefined}
        inert={isTabImportOpen || undefined}
      >
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
          {activeView === 'inbox' && tabImportServices ? (
            <div className="tab-import-entry">
              {isTabImportOpen ? (
                <TabImportPanel
                  services={tabImportServices}
                  onClose={handleTabImportClose}
                />
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  ref={tabImportTriggerRef}
                  onClick={() => setIsTabImportOpen(true)}
                >
                  複数タブを取り込む
                </Button>
              )}
            </div>
          ) : null}
          {activeView === 'inbox' && inboxServices ? (
            <InboxView
              services={inboxServices}
              refreshToken={inboxRefreshToken}
            />
          ) : activeView === 'log' && readingLogServices ? (
            <ReadingLogView
              services={readingLogServices}
              refreshToken={dataRefreshToken}
            />
          ) : activeView === 'settings' && settingsServices ? (
            <SettingsView
              services={settingsServices}
              refreshToken={dataRefreshToken}
              onDataChanged={() => {
                setDataRefreshToken((current) => current + 1);
                setInboxRefreshToken((current) => current + 1);
              }}
            />
          ) : (
            <EmptyState
              title={selectedView.emptyTitle}
              description={selectedView.emptyDescription}
            />
          )}
        </section>
      )}
    </main>
  );
}

export default DashboardApp;
