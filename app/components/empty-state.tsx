import type { ReactNode } from "react";

export function EmptyState({
  action,
  className,
  children,
}: {
  action: ReactNode;
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div
      className={[
        "gap-block px-block mx-auto flex max-w-md flex-col items-center py-12 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-muted text-sm">{children}</p>
      {action}
    </div>
  );
}
