import React from 'react';
import { Button } from '../../components/Button';

type ModalDialogProps = {
  title: string;
  eyebrow: string;
  titleId: string;
  children: React.ReactNode;
  onClose: () => void;
  isBusy?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
};

function getFocusableElements(dialog: HTMLElement): ReadonlyArray<HTMLElement> {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function ModalDialog({
  title,
  eyebrow,
  titleId,
  children,
  onClose,
  isBusy = false,
  initialFocusRef,
}: ModalDialogProps) {
  const dialogRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const initialFocus = initialFocusRef?.current;
    const firstFocusable = getFocusableElements(dialog).at(0);
    (initialFocus ?? firstFocusable ?? dialog).focus();
  }, [initialFocusRef]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog || !dialog.contains(document.activeElement)) {
        return;
      }

      if (event.key === 'Escape' && !isBusy) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      const firstElement = focusableElements.at(0);
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  return (
    <section
      ref={dialogRef}
      className="inbox-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="inbox-dialog-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3 id={titleId}>{title}</h3>
        </div>
        <Button type="button" onClick={onClose} disabled={isBusy}>
          閉じる
        </Button>
      </div>
      {children}
    </section>
  );
}
