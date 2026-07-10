import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlStyles =
  "min-h-11 w-full appearance-none rounded-control border border-border bg-bg-subtle px-related py-tight text-sm text-text caret-accent transition-[border-color,box-shadow] duration-[var(--duration-feedback)] ease-feedback placeholder:text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-45 aria-[invalid=true]:border-error";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({
  className,
  invalid = false,
  ...props
}: InputProps): React.ReactElement {
  return (
    <input
      {...props}
      aria-invalid={invalid || props["aria-invalid"]}
      className={[controlStyles, className].filter(Boolean).join(" ")}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>): React.ReactElement {
  return (
    <textarea
      {...props}
      className={[controlStyles, "resize-y", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>): React.ReactElement {
  return (
    <span className="relative block">
      <select
        {...props}
        className={[controlStyles, "pr-step", className]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="right-related text-faint pointer-events-none absolute top-1/2 -translate-y-1/2"
      >
        ▾
      </span>
    </span>
  );
}

export function Field({
  children,
  className,
  error,
  errorId,
  hint,
  htmlFor,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  errorId?: string;
  hint?: ReactNode;
  htmlFor: string;
  label: ReactNode;
}): React.ReactElement {
  return (
    <div
      className={["gap-tight flex max-w-sm flex-col", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label htmlFor={htmlFor} className="text-text text-sm font-medium">
        {label}
      </label>
      {children}
      {hint !== undefined && error === undefined && (
        <span className="text-muted text-xs">{hint}</span>
      )}
      {error !== undefined && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}): React.ReactElement {
  return (
    <span id={id} role="alert" className="text-error text-xs">
      {children}
    </span>
  );
}
