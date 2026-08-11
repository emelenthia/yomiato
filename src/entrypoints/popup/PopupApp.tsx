import React from 'react';
import './App.css';
import { ApplicationError } from '../../application/errors';
import type {
  ActiveTabResult,
  BrowserTabInfo,
} from '../../infrastructure/browser/browser-gateway';
import { BrowserGatewayError } from '../../infrastructure/browser';
import type { PopupServices } from '../../features/capture';

type PopupAppProps = {
  services?: PopupServices;
  initializationError?: string;
};

type PopupState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'unavailable'; message: string }
  | { phase: 'unsupported'; message: string; title?: string }
  | {
      phase: 'ready';
      tab: BrowserTabInfo;
      inboxRegistered: boolean;
      readingEntryCount: number;
      message?: string;
    };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApplicationError) {
    if (error.code === 'ALREADY_IN_INBOX') {
      return 'すでに後で読むにあります。';
    }

    if (error.code === 'UNSUPPORTED_URL') {
      return 'このページは保存できません。';
    }
  }

  if (
    error instanceof BrowserGatewayError &&
    error.code === 'UNSUPPORTED_URL'
  ) {
    return 'このページは保存できません。';
  }

  return fallback;
}

function unsupportedReasonMessage(
  result: Extract<ActiveTabResult, { outcome: 'unsupported' }>,
): string {
  switch (result.tab.reason) {
    case 'UNSUPPORTED_URL':
      return 'このページは保存できない種類のURLです。';
    case 'MISSING_URL':
      return '現在のページのURLを取得できません。';
    case 'MISSING_TITLE':
      return '現在のページのタイトルを取得できません。';
    case 'MISSING_ID':
      return '現在のページを識別できません。';
  }
}

function statusMessage(
  inboxRegistered: boolean,
  readingEntryCount: number,
): string {
  if (inboxRegistered && readingEntryCount > 0) {
    return `すでに後で読むにあり、読了記録もあります（${readingEntryCount}回）。`;
  }

  if (inboxRegistered) {
    return 'すでに後で読むにあります。';
  }

  if (readingEntryCount > 0) {
    return `読了記録があります（${readingEntryCount}回）。`;
  }

  return 'まだ登録されていません。';
}

function PopupApp({ services, initializationError }: PopupAppProps) {
  const [state, setState] = React.useState<PopupState>(() =>
    initializationError
      ? { phase: 'error', message: initializationError }
      : { phase: 'loading' },
  );
  const savingRef = React.useRef(false);

  React.useEffect(() => {
    if (!services || initializationError) {
      return;
    }

    const popupServices = services;
    let cancelled = false;

    async function loadCurrentPage() {
      try {
        const activeTab = await popupServices.browser.getActiveTab();

        if (cancelled) {
          return;
        }

        if (activeTab.outcome === 'unavailable') {
          setState({
            phase: 'unavailable',
            message: '現在のページを取得できません。',
          });
          return;
        }

        if (activeTab.outcome === 'unsupported') {
          setState({
            phase: 'unsupported',
            title: activeTab.tab.title,
            message: unsupportedReasonMessage(activeTab),
          });
          return;
        }

        const pageStatus = await popupServices.getPageStatus.execute(
          activeTab.tab.url,
        );

        if (cancelled) {
          return;
        }

        setState({
          phase: 'ready',
          tab: activeTab.tab,
          inboxRegistered: Boolean(pageStatus.inboxItem),
          readingEntryCount: pageStatus.readingEntryCount,
        });
      } catch {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: '現在のページの状態を確認できませんでした。',
          });
        }
      }
    }

    void loadCurrentPage();

    return () => {
      cancelled = true;
    };
  }, [initializationError, services]);

  const handleCapture = async () => {
    if (state.phase !== 'ready' || savingRef.current || !services) {
      return;
    }

    savingRef.current = true;
    try {
      await services.capturePageToInbox.execute({
        url: state.tab.url,
        title: state.tab.title,
        source: 'current-tab',
      });
      setState((current) =>
        current.phase === 'ready'
          ? {
              ...current,
              inboxRegistered: true,
              message: '追加しました。このタブを閉じても大丈夫です。',
            }
          : current,
      );
    } catch (error) {
      setState((current) =>
        current.phase === 'ready'
          ? {
              ...current,
              inboxRegistered:
                error instanceof ApplicationError &&
                error.code === 'ALREADY_IN_INBOX'
                  ? true
                  : current.inboxRegistered,
              message: getErrorMessage(error, '保存に失敗しました。'),
            }
          : current,
      );
    } finally {
      savingRef.current = false;
    }
  };

  const handleOpenDashboard = async () => {
    if (!services) {
      return;
    }

    try {
      await services.browser.openDashboard();
    } catch {
      setState((current) =>
        current.phase === 'ready'
          ? { ...current, message: 'Dashboardを開けませんでした。' }
          : current,
      );
    }
  };

  const handleOpenCompletion = async () => {
    if (state.phase !== 'ready' || !services) {
      return;
    }

    try {
      await services.browser.openDashboard({
        view: 'complete',
        url: state.tab.url,
        title: state.tab.title,
      });
    } catch (error) {
      setState((current) =>
        current.phase === 'ready'
          ? {
              ...current,
              message: getErrorMessage(error, '読了入力を開けませんでした。'),
            }
          : current,
      );
    }
  };

  const isReady = state.phase === 'ready';

  return (
    <main className="popup-shell">
      <header>
        <p className="eyebrow">よみあと</p>
        <h1>読みたいページを、あとで読める場所へ。</h1>
      </header>

      <section className="page-card" aria-labelledby="current-page-heading">
        <p className="section-label" id="current-page-heading">
          現在のページ
        </p>
        {isReady ? (
          <>
            <h2>{state.tab.title || 'タイトルなし'}</h2>
            <p className="site-name">{new URL(state.tab.url).hostname}</p>
            {state.message !==
            statusMessage(state.inboxRegistered, state.readingEntryCount) ? (
              <p className="muted">
                {statusMessage(state.inboxRegistered, state.readingEntryCount)}
              </p>
            ) : null}
          </>
        ) : state.phase === 'unsupported' ? (
          <>
            {state.title ? <h2>{state.title}</h2> : null}
            <p className="muted">{state.message}</p>
          </>
        ) : (
          <p className="muted">
            {state.phase === 'loading'
              ? '現在のページを確認しています。'
              : state.message}
          </p>
        )}
      </section>

      <div className="action-stack">
        <button
          type="button"
          disabled={!isReady || state.inboxRegistered || savingRef.current}
          onClick={() => void handleCapture()}
        >
          後で読む
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!isReady}
          onClick={() => void handleOpenCompletion()}
        >
          読了として記録
        </button>
      </div>

      <p className="status" role="status" aria-live="polite">
        {isReady && state.message
          ? state.message
          : state.phase === 'error' || state.phase === 'unavailable'
            ? state.message
            : ''}
      </p>

      <button
        type="button"
        className="dashboard-link"
        onClick={() => void handleOpenDashboard()}
      >
        よみあとを開く
      </button>
    </main>
  );
}

export default PopupApp;
