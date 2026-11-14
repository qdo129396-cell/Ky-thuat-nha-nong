import type { InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

export function FormField({ label, error, registration, id, ...inputProps }: FormFieldProps) {
  const inputId = id ?? registration.name;
  const errorId = `${inputId}-error`;
  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...inputProps}
        {...registration}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <span className="field-error" id={errorId}>{error}</span>}
    </div>
  );
}

