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

export function InboxView({ services }: InboxViewProps) {
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<ReadonlyArray<InboxListItem>>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [message, setMessage] = React.useState<string>();
  const [completionItem, setCompletionItem] = React.useState<InboxListItem>();
  const [dismissalItem, setDismissalItem] = React.useState<InboxListItem>();
  const [deleteItem, setDeleteItem] = React.useState<InboxListItem>();
  const requestIdRef = React.useRef(0);

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
  }, [loadItems]);

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
    setCompletionItem(undefined);
    setMessage('読了として記録しました。');
    await loadItems();
  };

  const handleDismiss = async (reason: string) => {
    if (!dismissalItem) {
      return;
    }

    await services.dismissInboxItem.execute({
      inboxItemId: dismissalItem.inboxItem.id,
      reason,
    });
    setDismissalItem(undefined);
    setMessage('Inboxから断念として記録しました。');
    await loadItems();
  };

  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    try {
      await services.deleteInboxItem.execute(deleteItem.inboxItem.id);
      setDeleteItem(undefined);
      setMessage('Inboxから削除しました。');
      await loadItems();
    } catch (deleteError) {
      setDeleteItem(undefined);
      setError(getErrorMessage(deleteError, '削除'));
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
                    onClick={() => setCompletionItem(item)}
                  >
                    読了
                  </Button>
                  <Button type="button" onClick={() => setDismissalItem(item)}>
                    断念
                  </Button>
                  <Button type="button" onClick={() => setDeleteItem(item)}>
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
          onClose={() => setCompletionItem(undefined)}
          onSave={handleComplete}
        />
      ) : null}
      {dismissalItem ? (
        <DismissalDialog
          item={dismissalItem}
          onClose={() => setDismissalItem(undefined)}
          onSave={handleDismiss}
        />
      ) : null}
      {deleteItem ? (
        <ConfirmDialog
          title="Inboxから削除しますか"
          description={`${itemLabel(deleteItem)}をInboxから削除します。断念履歴は残りません。`}
          onClose={() => setDeleteItem(undefined)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}

export default InboxView;
