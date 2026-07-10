import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-accent-strong text-accent-text hover:bg-[oklch(from_var(--accent-strong)_calc(l-0.05)_c_h)] active:bg-[oklch(from_var(--accent-strong)_calc(l-0.08)_c_h)]",
  secondary:
    "border-border bg-transparent text-text hover:border-border-strong hover:bg-bg-subtle active:bg-border",
  destructive:
    "border-border bg-transparent text-error hover:border-error hover:bg-[color-mix(in_oklch,var(--error)_8%,transparent)] active:bg-[color-mix(in_oklch,var(--error)_14%,transparent)]",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  className = "",
): string {
  return [
    "inline-flex items-center justify-center gap-tight whitespace-nowrap rounded-control border px-block py-tight text-sm font-medium transition-[background-color,border-color,color,opacity] duration-[var(--duration-feedback)] ease-feedback disabled:cursor-not-allowed disabled:opacity-45",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel = "Loading",
  variant = "primary",
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      {...props}
      className={buttonStyles(variant, `relative ${className ?? ""}`)}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
    >
      <span className={loading ? "invisible" : undefined}>{children}</span>
      {loading && (
        <>
          <span className="sr-only">{loadingLabel}</span>
          <span
            aria-hidden="true"
            className="size-block absolute animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
        </>
      )}
    </button>
  );
}
