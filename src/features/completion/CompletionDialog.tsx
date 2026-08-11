import React from 'react';
import type { InboxListItem } from '../../application/dto';
import { ApplicationError } from '../../application/errors';
import { Button } from '../../components/Button';
import { formatDisplayDateTime } from '../../shared/utils/date-time';
import { ModalDialog } from './ModalDialog';

type CompletionDialogProps = {
  item: InboxListItem;
  onClose: () => void;
  onSave: (reflection: string, noTakeaway: boolean) => Promise<void>;
};

function getCompletionErrorMessage(error: unknown): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case 'REFLECTION_REQUIRED':
        return '振り返りを入力するか、「得るものなし」を選択してください。';
      case 'REFLECTION_TOO_LONG':
        return '振り返りは5,000文字以内で入力してください。';
      case 'INBOX_ITEM_NOT_FOUND':
        return 'このInboxアイテムはすでに処理されています。';
      default:
        break;
    }
  }

  return '読了として保存できませんでした。もう一度お試しください。';
}

export function CompletionDialog({
  item,
  onClose,
  onSave,
}: CompletionDialogProps) {
  const [reflection, setReflection] = React.useState('');
  const [noTakeaway, setNoTakeaway] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [isSaving, setIsSaving] = React.useState(false);
  const savingRef = React.useRef(false);
  const reflectionRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(undefined);

    if (!noTakeaway && !reflection.trim()) {
      setError('振り返りを入力するか、「得るものなし」を選択してください。');
      savingRef.current = false;
      setIsSaving(false);
      return;
    }

    try {
      await onSave(reflection, noTakeaway);
    } catch (saveError) {
      setError(getCompletionErrorMessage(saveError));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <ModalDialog
      eyebrow="読了"
      title="読了として記録"
      titleId="completion-dialog-heading"
      onClose={onClose}
      isBusy={isSaving}
      initialFocusRef={reflectionRef}
    >
      <p className="inbox-dialog-page-title">{item.page.title}</p>
      <p className="inbox-dialog-date">
        登録日：{formatDisplayDateTime(item.inboxItem.addedAt)}
      </p>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label className="inbox-field-label" htmlFor="completion-reflection">
          振り返り
        </label>
        <p className="inbox-field-help" id="completion-reflection-help">
          一言でOKです。学んだこと、気づいたこと、面白かったこと、まだ分からないこと、次に試したいことを書けます。
        </p>
        <textarea
          ref={reflectionRef}
          id="completion-reflection"
          aria-describedby="completion-reflection-help"
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          maxLength={5000}
          rows={5}
          disabled={isSaving}
        />
        <label className="inbox-checkbox-label">
          <input
            type="checkbox"
            checked={noTakeaway}
            onChange={(event) => setNoTakeaway(event.target.checked)}
            disabled={isSaving}
          />
          <span>得るものなしとして記録する</span>
        </label>
        {noTakeaway ? (
          <p className="inbox-field-help">
            入力した振り返りは消えずに残りますが、保存時は「得るものなし」として記録されます。
          </p>
        ) : null}
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
            {isSaving ? '保存しています。' : '保存'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
