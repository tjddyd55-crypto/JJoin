import type { ReactNode } from 'react';

type FormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  wide?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function FormDialog({
  open,
  title,
  description,
  children,
  confirmLabel = '저장',
  cancelLabel = '취소',
  busy = false,
  confirmDisabled = false,
  wide = false,
  onConfirm,
  onCancel,
}: FormDialogProps) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className={`dialog${wide ? ' is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="form-dialog-title">{title}</h3>
        {description ? <p>{description}</p> : null}
        {children}
        <div className="dialog-actions">
          <button type="button" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
