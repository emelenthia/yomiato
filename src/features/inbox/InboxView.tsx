import React from 'react';
import type { InboxListItem } from '../../application/dto';
import { ApplicationError } from '../../application/errors';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDisplayDateTime } from '../../shared/utils/date-time';
import { CompletionDialog } from '../completion/CompletionDialog';
import { ConfirmDialog } from '../completion/ConfirmDialog';
import { DismissalDialog } from '../completion/DismissalDialog';
import type { InboxServices } from './inbox-services';

export type InboxViewProps = {
  services: InboxServices;
  refreshToken?: number;
};

function getErrorMessage(error: unknown, action = '読み込み'): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case 'INBOX_ITEM_NOT_FOUND':
        return 'このInboxアイテムはすでに処理されています。';
      case 'STORAGE_FAILURE':
        return `${action}に失敗しました。保存領域を確認してもう一度お試しください。`;
      default:
        break;
    }
  }

  return `${action}に失敗しました。もう一度お試しください。`;
}

function itemLabel(item: InboxListItem): string {
  return item.page.title || item.page.siteName;
}

export function InboxView({ services, refreshToken = 0 }: InboxViewProps) {
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<ReadonlyArray<InboxListItem>>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [message, setMessage] = React.useState<string>();
  const [completionItem, setCompletionItem] = React.useState<InboxListItem>();
  const [dismissalItem, setDismissalItem] = React.useState<InboxListItem>();
  const [deleteItem, setDeleteItem] = React.useState<InboxListItem>();
  const requestIdRef = React.useRef(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const completionTriggerRef = React.useRef<HTMLButtonElement>(null);
  const dismissalTriggerRef = React.useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = React.useRef<HTMLButtonElement>(null);

  const loadItems = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(undefined);

    try {
      const nextItems = await services.listInbox.execute(search);
      if (requestId === requestIdRef.current) {
        setItems(nextItems);
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, services]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems, refreshToken]);

  const restoreFocus = (
    triggerRef: React.RefObject<HTMLButtonElement | null>,
  ) => {
    window.setTimeout(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
      } else {
        searchInputRef.current?.focus();
      }
    }, 0);
  };

  const closeCompletion = () => {
    setCompletionItem(undefined);
    restoreFocus(completionTriggerRef);
  };

  const closeDismissal = () => {
    setDismissalItem(undefined);
    restoreFocus(dismissalTriggerRef);
  };

  const closeDelete = () => {
    setDeleteItem(undefined);
    restoreFocus(deleteTriggerRef);
  };

  const handleOpenUrl = async (item: InboxListItem) => {
    try {
      await services.browser.openSavedUrl(item.page.originalUrl);
    } catch (openError) {
      setError(getErrorMessage(openError, 'ページを開く操作'));
    }
  };

  const handleComplete = async (reflection: string, noTakeaway: boolean) => {
    if (!completionItem) {
      return;
    }

    await services.completeInboxItem.execute({
      inboxItemId: completionItem.inboxItem.id,
      reflection,
      noTakeaway,
    });
    setMessage('読了として記録しました。');
    await loadItems();
    closeCompletion();
  };

  const handleDismiss = async (reason: string) => {
    if (!dismissalItem) {
      return;
    }

    await services.dismissInboxItem.execute({
      inboxItemId: dismissalItem.inboxItem.id,
      reason,
    });
    setMessage('Inboxから断念として記録しました。');
    await loadItems();
    closeDismissal();
  };

  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    try {
      await services.deleteInboxItem.execute(deleteItem.inboxItem.id);
      setMessage('Inboxから削除しました。');
      await loadItems();
      closeDelete();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, '削除'));
      closeDelete();
    }
  };

  const showEmpty = !isLoading && !error && items?.length === 0;
  const isDialogOpen = Boolean(completionItem || dismissalItem || deleteItem);

  return (
    <div className="inbox-view">
      <div
        className="inbox-background"
        aria-hidden={isDialogOpen || undefined}
        inert={isDialogOpen || undefined}
      >
        <div className="inbox-toolbar">
          <p className="inbox-count" role="status" aria-live="polite">
            {isLoading
              ? '読み込んでいます。'
              : search
                ? `検索結果：${items?.length ?? 0}件`
                : `未読：${items?.length ?? 0}件`}
          </p>
          <label className="inbox-search-label" htmlFor="inbox-search">
            Inboxを検索
          </label>
          <input
            ref={searchInputRef}
            id="inbox-search"
            className="inbox-search"
            type="search"
            placeholder="タイトル、URLで検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {message ? (
          <p className="inbox-success" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <div className="inbox-error-area">
            <ErrorMessage title="Inboxを表示できません" description={error} />
            <Button type="button" onClick={() => void loadItems()}>
              もう一度読み込む
            </Button>
          </div>
        ) : null}
        {isLoading && !error ? (
          <p className="status" role="status">
            Inboxを読み込んでいます。
          </p>
        ) : null}
        {showEmpty ? (
          <EmptyState
            title={search ? '検索結果がありません' : 'Inboxは空です'}
            description={
              search
                ? 'タイトルやURLを変えて検索してください。'
                : 'Popupや複数タブ取り込みからページを追加できます。'
            }
          />
        ) : null}
        {!isLoading && !error && items && items.length > 0 ? (
          <div className="inbox-list" aria-label="Inbox一覧">
            {items.map((item) => (
              <article className="inbox-card" key={item.inboxItem.id}>
                <div className="inbox-card-content">
                  <h3>{itemLabel(item)}</h3>
                  <p className="inbox-card-meta">
                    {item.page.siteName} · 登録日：
                    {formatDisplayDateTime(item.inboxItem.addedAt)}
                  </p>
                  <p className="inbox-card-url">{item.page.originalUrl}</p>
                </div>
                <div className="inbox-card-actions">
                  <Button
                    type="button"
                    onClick={() => void handleOpenUrl(item)}
                  >
                    元ページを開く
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={(event) => {
                      completionTriggerRef.current = event.currentTarget;
                      setCompletionItem(item);
                    }}
                  >
                    読了
                  </Button>
                  <Button
                    type="button"
                    onClick={(event) => {
                      dismissalTriggerRef.current = event.currentTarget;
                      setDismissalItem(item);
                    }}
                  >
                    断念
                  </Button>
                  <Button
                    type="button"
                    onClick={(event) => {
                      deleteTriggerRef.current = event.currentTarget;
                      setDeleteItem(item);
                    }}
                  >
                    削除
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {completionItem ? (
        <CompletionDialog
          item={completionItem}
          onClose={closeCompletion}
          onSave={handleComplete}
        />
      ) : null}
      {dismissalItem ? (
        <DismissalDialog
          item={dismissalItem}
          onClose={closeDismissal}
          onSave={handleDismiss}
        />
      ) : null}
      {deleteItem ? (
        <ConfirmDialog
          title="Inboxから削除しますか"
          description={`${itemLabel(deleteItem)}をInboxから削除します。断念履歴は残りません。`}
          onClose={closeDelete}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}

export default InboxView;
