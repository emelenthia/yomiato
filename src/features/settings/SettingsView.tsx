import React from 'react';
import type { BackupPreview, DataSummary } from '../../application/dto';
import { ApplicationError } from '../../application/errors';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/ErrorMessage';
import { BrowserGatewayError } from '../../infrastructure/browser';
import { MAX_IMPORT_FILE_SIZE } from '../../shared/constants/limits';
import { ModalDialog } from '../completion/ModalDialog';
import type { SettingsServices } from './settings-services';

const CLEAR_CONFIRMATION = 'よみあと';

export interface SettingsViewProps {
  onDataChanged?: () => void;
  refreshToken?: number;
  services: SettingsServices;
}

type PendingImport = {
  json: string;
  preview: BackupPreview;
};

function getSettingsErrorMessage(error: unknown, action = '処理'): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case 'INVALID_BACKUP':
        return 'バックアップの形式またはデータ整合性を確認できませんでした。既存データは変更していません。';
      case 'UNSUPPORTED_BACKUP_VERSION':
        return 'このバックアップのデータ形式には対応していません。';
      case 'STORAGE_FAILURE':
        return `${action}に失敗しました。保存領域を確認してもう一度お試しください。`;
      default:
        break;
    }
  }

  if (error instanceof BrowserGatewayError) {
    switch (error.code) {
      case 'DOWNLOAD_FAILURE':
        return 'バックアップファイルの保存に失敗しました。';
      case 'FILE_READ_FAILURE':
        return 'バックアップファイルを読み込めませんでした。';
      default:
        break;
    }
  }

  return `${action}に失敗しました。もう一度お試しください。`;
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MiB`;
}

function summaryLabel(summary: DataSummary | undefined): string {
  if (!summary) {
    return '読み込み中…';
  }

  return `ページ ${summary.pages}件、Inbox ${summary.inboxItems}件、読書ログ ${summary.readingEntries}件、断念履歴 ${summary.dismissalEntries}件`;
}

function backupSummaryLabel(preview: BackupPreview): string {
  return `ページ ${preview.pages}件、Inbox ${preview.inboxItems}件、読書ログ ${preview.readingEntries}件、断念履歴 ${preview.dismissalEntries}件`;
}

export function SettingsView({
  services,
  onDataChanged,
  refreshToken = 0,
}: SettingsViewProps) {
  const [summary, setSummary] = React.useState<DataSummary>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [pendingImport, setPendingImport] = React.useState<PendingImport>();
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false);
  const [clearConfirmation, setClearConfirmation] = React.useState('');
  const [message, setMessage] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [dialogError, setDialogError] = React.useState<string>();
  const importTriggerRef = React.useRef<HTMLInputElement>(null);
  const clearTriggerRef = React.useRef<HTMLButtonElement>(null);
  const clearInputRef = React.useRef<HTMLInputElement>(null);

  const loadSummary = React.useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setSummary(await services.getDataSummary.execute());
    } catch (loadError) {
      setError(getSettingsErrorMessage(loadError, '保存データの読み込み'));
    } finally {
      setIsLoading(false);
    }
  }, [services]);

  React.useEffect(() => {
    void loadSummary();
  }, [loadSummary, refreshToken]);

  const clearMessage = () => {
    setMessage(undefined);
    setError(undefined);
    setDialogError(undefined);
  };

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    clearMessage();
    try {
      const output = await services.exportBackup.execute();
      const date = output.backup.exportedAt.slice(0, 10);
      services.browser.downloadJson(output.json, `yomiato-backup-${date}.json`);
      setMessage('バックアップを保存しました。');
    } catch (exportError) {
      setError(getSettingsErrorMessage(exportError, 'バックアップの保存'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPendingImport(undefined);
    clearMessage();

    if (!file) {
      return;
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setError(
        `ファイルが大きすぎます。${formatBytes(MAX_IMPORT_FILE_SIZE)}以下のJSONを選んでください。`,
      );
      return;
    }

    try {
      const json = await services.browser.readFile(file);
      const preview = services.importBackup.preview(json);
      setPendingImport({ json, preview });
    } catch (importError) {
      setError(getSettingsErrorMessage(importError, 'バックアップの確認'));
    }
  };

  const closeImportDialog = () => {
    if (isImporting) {
      return;
    }

    setPendingImport(undefined);
    setDialogError(undefined);
    window.setTimeout(() => importTriggerRef.current?.focus(), 0);
  };

  const handleImport = async () => {
    if (!pendingImport || isImporting) {
      return;
    }

    setIsImporting(true);
    clearMessage();
    try {
      await services.importBackup.execute(pendingImport.json);
      setPendingImport(undefined);
      setMessage('バックアップを復元しました。');
      onDataChanged?.();
      await loadSummary();
      window.setTimeout(() => importTriggerRef.current?.focus(), 0);
    } catch (importError) {
      const message = getSettingsErrorMessage(
        importError,
        'バックアップの復元',
      );
      setError(message);
      setDialogError(message);
    } finally {
      setIsImporting(false);
    }
  };

  const openClearDialog = () => {
    clearMessage();
    setClearConfirmation('');
    setIsClearDialogOpen(true);
  };

  const closeClearDialog = () => {
    if (isClearing) {
      return;
    }

    setIsClearDialogOpen(false);
    setClearConfirmation('');
    setDialogError(undefined);
    window.setTimeout(() => clearTriggerRef.current?.focus(), 0);
  };

  const handleClear = async () => {
    if (clearConfirmation !== CLEAR_CONFIRMATION || isClearing) {
      return;
    }

    setIsClearing(true);
    clearMessage();
    try {
      await services.clearAllData.execute();
      setIsClearDialogOpen(false);
      setClearConfirmation('');
      setMessage('すべてのデータを削除しました。');
      onDataChanged?.();
      await loadSummary();
      window.setTimeout(() => clearTriggerRef.current?.focus(), 0);
    } catch (clearError) {
      const message = getSettingsErrorMessage(clearError, '全データの削除');
      setError(message);
      setDialogError(message);
    } finally {
      setIsClearing(false);
    }
  };

  const isDialogOpen = Boolean(pendingImport || isClearDialogOpen);

  return (
    <div className="settings-view">
      <div
        className="settings-background"
        aria-hidden={isDialogOpen || undefined}
        inert={isDialogOpen || undefined}
      >
        {message ? (
          <p className="inbox-success" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <div className="inbox-error-area">
            <ErrorMessage
              title="データ管理でエラーが発生しました"
              description={error}
            />
            <Button type="button" onClick={() => void loadSummary()}>
              もう一度読み込む
            </Button>
          </div>
        ) : null}

        <section
          className="settings-section"
          aria-labelledby="data-policy-heading"
        >
          <h3 id="data-policy-heading">保存と権限</h3>
          <p>
            保存対象はURL、タイトル、サイト名、登録日時、状態、振り返り、断念履歴です。
          </p>
          <p>
            ページ本文は保存せず、データはこのブラウザ内だけに保存します。外部へ送信せず、タブ情報はページ登録のために必要な範囲で使用します。
          </p>
          <p>
            使用権限：現在のページ取得と、ユーザーが開始した複数タブ取り込み。
          </p>
        </section>

        <section
          className="settings-section"
          aria-labelledby="data-status-heading"
        >
          <h3 id="data-status-heading">保存データ</h3>
          <p role="status">
            {isLoading
              ? '保存データを読み込んでいます。'
              : summaryLabel(summary)}
          </p>
          {summary ? (
            <dl className="settings-summary">
              <div>
                <dt>DB形式</dt>
                <dd>schemaVersion {summary.schemaVersion}</dd>
              </div>
              <div>
                <dt>保存件数</dt>
                <dd>
                  {summary.pages +
                    summary.inboxItems +
                    summary.readingEntries +
                    summary.dismissalEntries +
                    summary.settings}
                  件
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="settings-section" aria-labelledby="backup-heading">
          <h3 id="backup-heading">バックアップ</h3>
          <p>UTF-8の整形済みJSONとして、保存データを端末へ書き出します。</p>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleExport()}
            disabled={isExporting}
          >
            {isExporting
              ? 'バックアップを準備しています。'
              : 'JSONをエクスポート'}
          </Button>
        </section>

        <section className="settings-section" aria-labelledby="import-heading">
          <h3 id="import-heading">バックアップから復元</h3>
          <p>
            10 MiB以下のJSONを検証し、確認後に現在のデータをすべて置き換えます。
          </p>
          <label className="settings-file-label" htmlFor="backup-file">
            JSONファイルを選ぶ
          </label>
          <input
            id="backup-file"
            ref={importTriggerRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleFileChange(event)}
          />
        </section>

        <section
          className="settings-section settings-danger"
          aria-labelledby="delete-heading"
        >
          <h3 id="delete-heading">全データ削除</h3>
          <p>Inbox、読書ログ、断念履歴、ページ情報、設定をすべて削除します。</p>
          <Button ref={clearTriggerRef} type="button" onClick={openClearDialog}>
            全データ削除を開始
          </Button>
        </section>
      </div>

      {pendingImport ? (
        <ModalDialog
          eyebrow="確認"
          title="バックアップを復元しますか"
          titleId="settings-import-dialog-heading"
          onClose={closeImportDialog}
          isBusy={isImporting}
        >
          {dialogError ? (
            <p className="inbox-dialog-error" role="alert">
              {dialogError}
            </p>
          ) : null}
          <p className="inbox-field-help">
            現在のデータをすべて置き換えます。この操作は、検証に成功したデータだけを一つの処理で反映します。
          </p>
          <p className="settings-dialog-count">現在：{summaryLabel(summary)}</p>
          <p className="settings-dialog-count">
            復元後：{backupSummaryLabel(pendingImport.preview)}
          </p>
          <div className="inbox-dialog-actions">
            <Button
              type="button"
              onClick={closeImportDialog}
              disabled={isImporting}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleImport()}
              disabled={isImporting}
            >
              {isImporting ? '復元しています。' : '全置換して復元'}
            </Button>
          </div>
        </ModalDialog>
      ) : null}

      {isClearDialogOpen ? (
        <ModalDialog
          eyebrow="確認"
          title="全データを削除しますか"
          titleId="settings-clear-dialog-heading"
          onClose={closeClearDialog}
          isBusy={isClearing}
          initialFocusRef={clearInputRef}
        >
          {dialogError ? (
            <p className="inbox-dialog-error" role="alert">
              {dialogError}
            </p>
          ) : null}
          <p className="inbox-field-help">
            この操作で保存データをすべて削除します。確認のため「よみあと」と入力してください。
          </p>
          <label className="inbox-field-label" htmlFor="clear-confirmation">
            確認文字列
          </label>
          <input
            ref={clearInputRef}
            id="clear-confirmation"
            className="settings-confirmation-input"
            value={clearConfirmation}
            onChange={(event) => setClearConfirmation(event.target.value)}
            autoComplete="off"
          />
          <div className="inbox-dialog-actions">
            <Button
              type="button"
              onClick={closeClearDialog}
              disabled={isClearing}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleClear()}
              disabled={clearConfirmation !== CLEAR_CONFIRMATION || isClearing}
            >
              {isClearing ? '削除しています。' : 'すべて削除'}
            </Button>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}

export default SettingsView;
