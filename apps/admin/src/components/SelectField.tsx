import type { SelectHTMLAttributes } from 'react';

type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  options: Option[];
  hint?: string;
  error?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({
  label,
  options,
  hint,
  error,
  id,
  ...selectProps
}: SelectFieldProps) {
  const fieldId = id ?? selectProps.name;
  return (
    <div className="form-field">
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} {...selectProps}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
