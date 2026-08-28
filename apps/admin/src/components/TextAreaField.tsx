import type { TextareaHTMLAttributes } from 'react';

type TextAreaFieldProps = {
  label: string;
  hint?: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({
  label,
  hint,
  error,
  id,
  rows = 3,
  ...textareaProps
}: TextAreaFieldProps) {
  const fieldId = id ?? textareaProps.name;
  return (
    <div className="form-field">
      <label htmlFor={fieldId}>{label}</label>
      <textarea id={fieldId} rows={rows} {...textareaProps} />
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
