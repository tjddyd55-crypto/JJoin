import type { InputHTMLAttributes, ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({ label, hint, error, children, id, ...inputProps }: FormFieldProps) {
  const fieldId = id ?? inputProps.name;
  return (
    <div className="form-field">
      <label htmlFor={fieldId}>{label}</label>
      {children ?? <input id={fieldId} {...inputProps} />}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
