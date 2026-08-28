type DangerDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DangerDialog({
  open,
  title,
  message,
  confirmLabel = '실행',
  cancelLabel = '취소',
  busy = false,
  onConfirm,
  onCancel,
}: DangerDialogProps) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog is-danger"
        role="dialog"
        aria-modal="true"
        aria-labelledby="danger-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="danger-dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-danger" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
