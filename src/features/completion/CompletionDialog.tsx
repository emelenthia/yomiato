import React from 'react';
import type { InboxListItem } from '../../application/dto';
import { formatDisplayDateTime } from '../../shared/utils/date-time';
import { ModalDialog } from './ModalDialog';
import { ReflectionForm } from './ReflectionForm';

type CompletionDialogProps = {
  item: InboxListItem;
  onClose: () => void;
  onSave: (reflection: string, noTakeaway: boolean) => Promise<void>;
};

export function CompletionDialog({
  item,
  onClose,
  onSave,
}: CompletionDialogProps) {
  const reflectionRef = React.useRef<HTMLTextAreaElement>(null);
  const [isSaving, setIsSaving] = React.useState(false);

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
      <ReflectionForm
        reflectionId="completion-reflection"
        operationLabel="読了"
        reflectionRef={reflectionRef}
        onCancel={onClose}
        onBusyChange={setIsSaving}
        onSave={onSave}
      />
    </ModalDialog>
  );
}
