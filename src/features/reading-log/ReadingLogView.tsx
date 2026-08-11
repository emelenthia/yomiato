import React from 'react';
import type { ReadingLogItem } from '../../application/dto';
import { ApplicationError } from '../../application/errors';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDisplayDateTime } from '../../shared/utils/date-time';
import { ConfirmDialog } from '../completion/ConfirmDialog';
import {
  ReadingEntryDialog,
  type ReadingEntryDialogMode,
} from './ReadingEntryDialog';
import type { ReadingLogServices } from './reading-log-services';

export type ReadingLogViewProps = {
  services: ReadingLogServices;
};

function getErrorMessage(error: unknown, action = '読み込み'): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case 'READING_ENTRY_NOT_FOUND':
        return 'この読書記録はすでに処理されています。';
      case 'STORAGE_FAILURE':
        return `${action}に失敗しました。保存領域を確認してもう一度お試しください。`;
      default:
        break;
    }
  }

  return `${action}に失敗しました。もう一度お試しください。`;
}

function entryLabel(item: ReadingLogItem): string {
  return item.page.title || item.page.siteName;
}

function reflectionLabel(item: ReadingLogItem): string {
  return item.readingEntry.reflectionType === 'none'
    ? '得るものなし'
    : item.readingEntry.reflection;
}

export function ReadingLogView({ services }: ReadingLogViewProps) {
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<ReadonlyArray<ReadingLogItem>>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [message, setMessage] = React.useState<string>();
  const [dialog, setDialog] = React.useState<
    { mode: ReadingEntryDialogMode; item: ReadingLogItem } | undefined
  >();
  const [deleteItem, setDeleteItem] = React.useState<ReadingLogItem>();
  const requestIdRef = React.useRef(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const dialogTriggerRef = React.useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = React.useRef<HTMLButtonElement>(null);

  const loadItems = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const nextItems = await services.listReadingLog.execute(search);
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

  const closeDialog = () => {
    setDialog(undefined);
    restoreFocus(dialogTriggerRef);
  };

  const closeDelete = () => {
    setDeleteItem(undefined);
    restoreFocus(deleteTriggerRef);
  };

  const handleOpenUrl = async (item: ReadingLogItem) => {
    setMessage(undefined);
    try {
      await services.browser.openSavedUrl(item.page.originalUrl);
    } catch (openError) {
      setError(getErrorMessage(openError, 'ページを開く操作'));
    }
  };

  const handleSave = async (reflection: string, noTakeaway: boolean) => {
    if (!dialog) {
      return;
    }

    setMessage(undefined);

    if (dialog.mode === 'edit') {
      await services.updateReadingEntry.execute({
        readingEntryId: dialog.item.readingEntry.id,
        reflection,
        noTakeaway,
      });
    } else {
      await services.recordReread.execute({
        readingEntryId: dialog.item.readingEntry.id,
        reflection,
        noTakeaway,
      });
    }

    await loadItems();
    setMessage(
      dialog.mode === 'edit'
        ? '振り返りを更新しました。'
        : '再読を記録しました。',
    );
    closeDialog();
  };

  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    setMessage(undefined);

    try {
      await services.deleteReadingEntry.execute(deleteItem.readingEntry.id);
      await loadItems();
      setMessage('読書記録を削除しました。');
      closeDelete();
    } catch (deleteError) {
      setMessage(undefined);
      setError(getErrorMessage(deleteError, '削除'));
      closeDelete();
    }
  };

  const showEmpty = !isLoading && !error && items?.length === 0;
  const isDialogOpen = Boolean(dialog || deleteItem);

  return (
    <div className="reading-log-view">
      <div
        className="reading-log-background"
        aria-hidden={isDialogOpen || undefined}
        inert={isDialogOpen || undefined}
      >
        <div className="reading-log-toolbar">
          <p className="reading-log-count" role="status" aria-live="polite">
            {isLoading
              ? '読み込んでいます。'
              : search
                ? `検索結果：${items?.length ?? 0}件`
                : `読了：${items?.length ?? 0}件`}
          </p>
          <label className="inbox-search-label" htmlFor="reading-log-search">
            読書ログを検索
          </label>
          <input
            ref={searchInputRef}
            id="reading-log-search"
            className="inbox-search"
            type="search"
            placeholder="タイトル、URL、サイト、振り返りで検索"
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
            <ErrorMessage
              title="読書ログを表示できません"
              description={error}
            />
            <Button type="button" onClick={() => void loadItems()}>
              もう一度読み込む
            </Button>
          </div>
        ) : null}
        {isLoading && !error ? (
          <p className="status" role="status">
            読書ログを読み込んでいます。
          </p>
        ) : null}
        {showEmpty ? (
          <EmptyState
            title={search ? '検索結果がありません' : '読書ログはまだありません'}
            description={
              search
                ? 'タイトル、URL、サイト、振り返りを変えて検索してください。'
                : 'ページを読了として記録すると、ここに残ります。'
            }
          />
        ) : null}
        {!isLoading && !error && items && items.length > 0 ? (
          <div className="reading-log-list" aria-label="読書ログ一覧">
            {items.map((item) => (
              <article className="reading-log-card" key={item.readingEntry.id}>
                <div className="reading-log-card-content">
                  <p className="reading-log-reflection">
                    {reflectionLabel(item)}
                  </p>
                  <h3>{entryLabel(item)}</h3>
                  <p className="reading-log-card-meta">
                    {item.page.siteName} · 読了日：
                    {formatDisplayDateTime(item.readingEntry.completedAt)}
                  </p>
                  <p className="reading-log-card-url">
                    {item.page.originalUrl}
                  </p>
                </div>
                <div className="reading-log-card-actions">
                  <Button
                    type="button"
                    onClick={() => void handleOpenUrl(item)}
                  >
                    元ページを開く
                  </Button>
                  <Button
                    type="button"
                    onClick={(event) => {
                      dialogTriggerRef.current = event.currentTarget;
                      setDialog({ mode: 'edit', item });
                    }}
                  >
                    編集
                  </Button>
                  <Button
                    type="button"
                    onClick={(event) => {
                      dialogTriggerRef.current = event.currentTarget;
                      setDialog({ mode: 'reread', item });
                    }}
                  >
                    再読
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

      {dialog ? (
        <ReadingEntryDialog
          item={dialog.item}
          mode={dialog.mode}
          onClose={closeDialog}
          onSave={handleSave}
        />
      ) : null}
      {deleteItem ? (
        <ConfirmDialog
          title="読書記録を削除しますか"
          description={`${entryLabel(deleteItem)}の読書記録を削除します。Inboxや同じページの他の記録には影響しません。`}
          onClose={closeDelete}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}

export default ReadingLogView;
