"use client";

// Form field primitives codifying the login-page idiom: uppercase tracked
// label, `.input` control, `text-critical` inline error.

type ShellProps = {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

function FieldShell({ label, id, error, hint, required, children }: ShellProps & { children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {required && <span className="text-gold"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-critical">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, id, error, hint, required, ...props }: ShellProps & InputProps) {
  return (
    <FieldShell label={label} id={id} error={error} hint={hint} required={required}>
      <input id={id} className="input" required={required} {...props} />
    </FieldShell>
  );
}

export function MoneyField({ label, id, error, hint, required, ...props }: ShellProps & InputProps) {
  return (
    <FieldShell label={label} id={id} error={error} hint={hint} required={required}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">$</span>
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          className="input num pl-7 text-right"
          required={required}
          {...props}
        />
      </div>
    </FieldShell>
  );
}

export function DateField({ label, id, error, hint, required, ...props }: ShellProps & InputProps) {
  return (
    <FieldShell label={label} id={id} error={error} hint={hint} required={required}>
      <input id={id} type="date" className="input" required={required} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  id,
  error,
  hint,
  required,
  children,
  ...props
}: ShellProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} id={id} error={error} hint={hint} required={required}>
      <select id={id} className="input" required={required} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  id,
  error,
  hint,
  required,
  ...props
}: ShellProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} id={id} error={error} hint={hint} required={required}>
      <textarea id={id} className="input min-h-24" required={required} {...props} />
    </FieldShell>
  );
}
