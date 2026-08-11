import React from 'react';
import { ApplicationError } from '../../application/errors';
import { Button } from '../../components/Button';
import { MAX_REFLECTION_LENGTH } from '../../shared/constants/limits';

export type ReflectionFormProps = {
  reflectionId: string;
  initialReflection?: string;
  initialNoTakeaway?: boolean;
  operationLabel: string;
  submitLabel?: string;
  reflectionRef?: React.RefObject<HTMLTextAreaElement | null>;
  onCancel: () => void;
  onBusyChange?: (isBusy: boolean) => void;
  onSave: (reflection: string, noTakeaway: boolean) => Promise<void>;
};

function getErrorMessage(error: unknown, operationLabel: string): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case 'REFLECTION_REQUIRED':
        return '振り返りを入力するか、「得るものなし」を選択してください。';
      case 'REFLECTION_TOO_LONG':
        return '振り返りは5,000文字以内で入力してください。';
      case 'INBOX_ITEM_NOT_FOUND':
        return 'このInboxアイテムはすでに処理されています。';
      case 'READING_ENTRY_NOT_FOUND':
        return 'この読書記録はすでに処理されています。';
      default:
        break;
    }
  }

  return `${operationLabel}として保存できませんでした。もう一度お試しください。`;
}

export function ReflectionForm({
  reflectionId,
  initialReflection = '',
  initialNoTakeaway = false,
  operationLabel,
  submitLabel = '保存',
  reflectionRef,
  onCancel,
  onBusyChange,
  onSave,
}: ReflectionFormProps) {
  const [reflection, setReflection] = React.useState(initialReflection);
  const [noTakeaway, setNoTakeaway] = React.useState(initialNoTakeaway);
  const [error, setError] = React.useState<string>();
  const [isSaving, setIsSaving] = React.useState(false);
  const savingRef = React.useRef(false);

  React.useEffect(() => {
    onBusyChange?.(isSaving);
  }, [isSaving, onBusyChange]);

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
      setError(getErrorMessage(saveError, operationLabel));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <label className="inbox-field-label" htmlFor={reflectionId}>
        振り返り
      </label>
      <p className="inbox-field-help" id={`${reflectionId}-help`}>
        一言でOKです。学んだこと、気づいたこと、面白かったこと、まだ分からないこと、次に試したいことを書けます。
      </p>
      <textarea
        ref={reflectionRef}
        id={reflectionId}
        aria-describedby={`${reflectionId}-help`}
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
        maxLength={MAX_REFLECTION_LENGTH}
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
        <Button type="button" onClick={onCancel} disabled={isSaving}>
          キャンセル
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? '保存しています。' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
