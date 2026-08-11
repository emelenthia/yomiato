import React from 'react';
import type { InboxListItem } from '../../application/dto';
import { ApplicationError } from '../../application/errors';
import { Button } from '../../components/Button';
import { ModalDialog } from './ModalDialog';

type DismissalDialogProps = {
  item: InboxListItem;
  onClose: () => void;
  onSave: (reason: string) => Promise<void>;
};

function getDismissalErrorMessage(error: unknown): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case 'DISMISSAL_REASON_TOO_LONG':
        return '断念理由は1,000文字以内で入力してください。';
      case 'INBOX_ITEM_NOT_FOUND':
        return 'このInboxアイテムはすでに処理されています。';
      default:
        break;
    }
  }

  return '断念として保存できませんでした。もう一度お試しください。';
}

export function DismissalDialog({
  item,
  onClose,
  onSave,
}: DismissalDialogProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [isSaving, setIsSaving] = React.useState(false);
  const savingRef = React.useRef(false);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(undefined);

    try {
      await onSave(reason);
    } catch (saveError) {
      setError(getDismissalErrorMessage(saveError));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <ModalDialog
      eyebrow="断念"
      title="このページを断念"
      titleId="dismissal-dialog-heading"
      onClose={onClose}
      isBusy={isSaving}
      initialFocusRef={reasonRef}
    >
      <p className="inbox-dialog-page-title">{item.page.title}</p>
      <p className="inbox-field-help">
        読むのをやめた理由を残せます。入力せずに断念することもできます。
      </p>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label className="inbox-field-label" htmlFor="dismissal-reason">
          断念理由（任意）
        </label>
        <textarea
          ref={reasonRef}
          id="dismissal-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={1000}
          rows={4}
          disabled={isSaving}
        />
        {error ? (
          <p className="inbox-dialog-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="inbox-dialog-actions">
          <Button type="button" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? '保存しています。' : '断念する'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
