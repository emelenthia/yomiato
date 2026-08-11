import React from 'react';
import { Button } from '../../components/Button';
import { ModalDialog } from './ModalDialog';

type ConfirmDialogProps = {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDialog({
  title,
  description,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    if (isConfirming) {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <ModalDialog
      eyebrow="確認"
      title={title}
      titleId="inbox-confirm-dialog-heading"
      onClose={onClose}
      isBusy={isConfirming}
      initialFocusRef={confirmRef}
    >
      <p className="inbox-field-help">{description}</p>
      <div className="inbox-dialog-actions">
        <Button type="button" onClick={onClose} disabled={isConfirming}>
          キャンセル
        </Button>
        <Button
          ref={confirmRef}
          type="button"
          variant="primary"
          onClick={() => void handleConfirm()}
          disabled={isConfirming}
        >
          {isConfirming ? '処理しています。' : '削除する'}
        </Button>
      </div>
    </ModalDialog>
  );
}
