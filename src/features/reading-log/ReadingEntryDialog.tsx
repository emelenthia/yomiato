import React from 'react';
import type { ReadingLogItem } from '../../application/dto';
import { formatDisplayDateTime } from '../../shared/utils/date-time';
import { ModalDialog } from '../completion/ModalDialog';
import { ReflectionForm } from '../completion/ReflectionForm';

export type ReadingEntryDialogMode = 'edit' | 'reread';

type ReadingEntryDialogProps = {
  item: ReadingLogItem;
  mode: ReadingEntryDialogMode;
  onClose: () => void;
  onSave: (reflection: string, noTakeaway: boolean) => Promise<void>;
};

export function ReadingEntryDialog({
  item,
  mode,
  onClose,
  onSave,
}: ReadingEntryDialogProps) {
  const reflectionRef = React.useRef<HTMLTextAreaElement>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const isEdit = mode === 'edit';

  return (
    <ModalDialog
      eyebrow={isEdit ? '編集' : '再読'}
      title={isEdit ? '振り返りを編集' : '再読として記録'}
      titleId="reading-entry-dialog-heading"
      onClose={onClose}
      isBusy={isSaving}
      initialFocusRef={reflectionRef}
    >
      <p className="inbox-dialog-page-title">
        {item.page.title || item.page.siteName}
      </p>
      <p className="inbox-dialog-date">
        前回の読了日：{formatDisplayDateTime(item.readingEntry.completedAt)}
      </p>
      <ReflectionForm
        reflectionId="reading-entry-reflection"
        initialReflection={isEdit ? item.readingEntry.reflection : ''}
        initialNoTakeaway={
          isEdit && item.readingEntry.reflectionType === 'none'
        }
        operationLabel={isEdit ? '更新' : '再読'}
        submitLabel={isEdit ? '更新する' : '再読を保存'}
        reflectionRef={reflectionRef}
        onCancel={onClose}
        onBusyChange={setIsSaving}
        onSave={onSave}
      />
    </ModalDialog>
  );
}
