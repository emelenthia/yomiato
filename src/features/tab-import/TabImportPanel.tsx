import React from 'react';
import { Button } from '../../components/Button';
import { BrowserGatewayError } from '../../infrastructure/browser';
import type {
  TabImportCandidate,
  TabImportInspection,
  TabImportServices,
} from './tab-import-services';
import { inspectCurrentWindowTabs, toImportTab } from './tab-import-services';

type TabImportPanelProps = {
  services: TabImportServices;
  onClose: () => void;
};

type PanelState =
  | { phase: 'ready-to-load' }
  | { phase: 'loading' }
  | { phase: 'loaded'; inspection: TabImportInspection }
  | { phase: 'error'; message: string };

function getErrorMessage(error: unknown): string {
  if (
    error instanceof BrowserGatewayError &&
    error.code === 'PERMISSION_DENIED'
  ) {
    return 'タブ情報への権限が許可されませんでした。個別のページ登録は引き続き利用できます。';
  }

  return 'タブ一覧を読み込めませんでした。もう一度お試しください。';
}

function unsupportedReason(reason: string): string {
  switch (reason) {
    case 'UNSUPPORTED_URL':
      return '対応外URL';
    case 'MISSING_URL':
      return 'URLを取得できません';
    case 'MISSING_TITLE':
      return 'タイトルを取得できません';
    case 'MISSING_ID':
      return 'タブを識別できません';
    default:
      return '対応外';
  }
}

function candidateLabel(candidate: TabImportCandidate): string {
  return candidate.tab.title.trim() || candidate.siteName;
}

function isSelectable(candidate: TabImportCandidate): boolean {
  return !candidate.isInInbox && !candidate.isInputDuplicate;
}

function TabImportPanel({ services, onClose }: TabImportPanelProps) {
  const [state, setState] = React.useState<PanelState>({
    phase: 'ready-to-load',
  });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<number>>(
    new Set(),
  );
  const [isImporting, setIsImporting] = React.useState(false);
  const [result, setResult] = React.useState<
    | Awaited<ReturnType<TabImportServices['importTabsToInbox']['execute']>>
    | undefined
  >();
  const importingRef = React.useRef(false);
  const loadingRef = React.useRef(false);

  const loadTabs = async () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setState({ phase: 'loading' });
    setResult(undefined);

    try {
      if (!(await services.browser.hasTabsPermission())) {
        await services.browser.requestTabsPermission();
      }

      const inspections = await services.browser.listCurrentWindowTabs();
      const inspection = await inspectCurrentWindowTabs(services, inspections);
      setState({ phase: 'loaded', inspection });
      setSelectedIds(
        new Set(
          inspection.supported
            .filter(isSelectable)
            .map((candidate) => candidate.tab.id),
        ),
      );
    } catch (error) {
      setState({ phase: 'error', message: getErrorMessage(error) });
      setSelectedIds(new Set());
    } finally {
      loadingRef.current = false;
    }
  };

  const toggleSelection = (tabId: number) => {
    if (isImporting || state.phase !== 'loaded') {
      return;
    }

    const candidate = state.inspection.supported.find(
      (item) => item.tab.id === tabId,
    );
    if (!candidate || !isSelectable(candidate)) {
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (state.phase !== 'loaded' || isImporting) {
      return;
    }

    setSelectedIds(
      new Set(
        state.inspection.supported
          .filter(isSelectable)
          .map((candidate) => candidate.tab.id),
      ),
    );
  };

  const clearSelection = () => {
    if (isImporting) {
      return;
    }
    setSelectedIds(new Set());
  };

  const importSelectedTabs = async () => {
    if (
      importingRef.current ||
      isImporting ||
      state.phase !== 'loaded' ||
      selectedIds.size === 0
    ) {
      return;
    }

    importingRef.current = true;
    setIsImporting(true);
    const selectedCandidates = state.inspection.supported.filter((candidate) =>
      selectedIds.has(candidate.tab.id),
    );

    try {
      const importResult = await services.importTabsToInbox.execute(
        selectedCandidates.map(toImportTab),
      );
      setResult(importResult);
      setSelectedIds(
        new Set(
          selectedCandidates
            .filter(
              (candidate, index) =>
                importResult.results[index]?.outcome === 'failed',
            )
            .map((candidate) => candidate.tab.id),
        ),
      );
    } catch {
      setResult(undefined);
      setState({
        phase: 'error',
        message: '一括登録を開始できませんでした。もう一度お試しください。',
      });
    } finally {
      importingRef.current = false;
      setIsImporting(false);
    }
  };

  return (
    <section className="tab-import-panel" aria-labelledby="tab-import-heading">
      <div className="tab-import-header">
        <div>
          <p className="eyebrow">複数タブ取り込み</p>
          <h3 id="tab-import-heading">開いているタブをInboxへ追加</h3>
        </div>
        <Button type="button" onClick={onClose} disabled={isImporting}>
          閉じる
        </Button>
      </div>
      <p className="view-description">
        タイトルとURLを読み取り、選んだページだけを端末内のInboxへ保存します。ページ本文や画像は取得しません。
      </p>

      {state.phase === 'ready-to-load' ? (
        <div className="tab-import-permission">
          <p>
            開いているタブの一覧を表示するため、一時的に「タブ」権限を使用します。権限はこの操作を始めるときにだけ確認します。
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => void loadTabs()}
          >
            タブ一覧を読み込む
          </Button>
        </div>
      ) : null}

      {state.phase === 'loading' ? (
        <p className="status" role="status">
          タブ一覧を読み込んでいます。
        </p>
      ) : null}

      {state.phase === 'error' ? (
        <div className="tab-import-error" role="alert">
          <p>{state.message}</p>
          <Button type="button" onClick={() => void loadTabs()}>
            もう一度読み込む
          </Button>
        </div>
      ) : null}

      {state.phase === 'loaded' ? (
        <div className="tab-import-content">
          <div className="tab-import-actions">
            <span className="status" role="status">
              {selectedIds.size}件を選択中
            </span>
            <div>
              <Button type="button" onClick={selectAll} disabled={isImporting}>
                すべて選択
              </Button>
              <Button
                type="button"
                onClick={clearSelection}
                disabled={isImporting || selectedIds.size === 0}
              >
                すべて解除
              </Button>
            </div>
          </div>

          <fieldset className="tab-list" disabled={isImporting}>
            <legend>登録可能なタブ</legend>
            {state.inspection.supported.length === 0 ? (
              <p className="status">登録可能なタブはありません。</p>
            ) : (
              state.inspection.supported.map((candidate) => {
                const disabled = !isSelectable(candidate);
                const reason = candidate.isInInbox
                  ? 'すでにInboxに登録済み'
                  : candidate.isInputDuplicate
                    ? '同じページのタブが一覧内で重複'
                    : undefined;

                return (
                  <label
                    className={`tab-list-item${disabled ? ' is-disabled' : ''}`}
                    key={candidate.tab.id}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(candidate.tab.id)}
                      disabled={disabled}
                      onChange={() => toggleSelection(candidate.tab.id)}
                    />
                    <span className="tab-list-text">
                      <strong>{candidateLabel(candidate)}</strong>
                      <span>
                        {candidate.siteName} · {candidate.tab.url}
                      </span>
                    </span>
                    {reason ? (
                      <span className="tab-list-reason">{reason}</span>
                    ) : null}
                  </label>
                );
              })
            )}
          </fieldset>

          {state.inspection.unsupported.length > 0 ? (
            <div className="tab-list tab-list-unsupported">
              <h4>選択できないタブ</h4>
              {state.inspection.unsupported.map((inspection, index) => (
                <div
                  className="tab-list-item is-disabled"
                  key={`${inspection.tab.id ?? 'unknown'}-${index}`}
                >
                  <span className="tab-list-text">
                    <strong>
                      {inspection.tab.title?.trim() || 'タイトル不明'}
                    </strong>
                    <span>{inspection.tab.url || 'URL不明'}</span>
                  </span>
                  <span className="tab-list-reason">
                    {unsupportedReason(inspection.tab.reason)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <Button
            type="button"
            variant="primary"
            onClick={() => void importSelectedTabs()}
            disabled={isImporting || selectedIds.size === 0}
          >
            {isImporting ? 'Inboxへ追加しています。' : 'Inboxへ追加'}
          </Button>

          {result ? (
            <div className="tab-import-results" role="status">
              <h4>取り込み結果</h4>
              <p>
                追加 {result.added}件、重複 {result.duplicate}件、対応外{' '}
                {result.unsupported}件、失敗 {result.failed}件
              </p>
              {result.results.some((item) => item.outcome !== 'added') ? (
                <ul>
                  {result.results.map((item, index) =>
                    item.outcome === 'added' ? null : (
                      <li key={`${item.tab.url}-${index}`}>
                        {item.tab.title || item.tab.url}：
                        {item.outcome === 'duplicate'
                          ? 'すでにInboxに登録済み'
                          : item.outcome === 'unsupported'
                            ? '対応外URL'
                            : '保存に失敗しました'}
                      </li>
                    ),
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default TabImportPanel;
