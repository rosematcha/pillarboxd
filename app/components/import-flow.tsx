import type { ReactNode } from "react";

export function ImportFlow({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <div className="max-w-[42rem] [counter-reset:step]">{children}</div>;
}

export function ImportStep({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description?: ReactNode;
  title: string;
}): React.ReactElement {
  return (
    <section className="gap-block border-border py-step flex flex-col border-b first:pt-0 last:border-0 last:pb-0">
      <h2 className="import-step-title text-base font-medium">{title}</h2>
      {description !== undefined && (
        <p className="text-muted max-w-[70ch] text-sm">{description}</p>
      )}
      {children}
    </section>
  );
}

export function ImportResults({
  imported,
  unmatched,
}: {
  imported: number;
  unmatched: { name: string; year: number | null }[];
}): React.ReactElement {
  return (
    <div className="gap-section flex flex-col" aria-live="polite">
      <div className="gap-tight flex flex-col">
        <p className="text-sm font-medium">
          {String(imported)} entries imported
        </p>
        <p className="text-muted text-sm">
          Added to your diary with ratings and dates preserved.
        </p>
      </div>
      {unmatched.length > 0 && (
        <div className="gap-tight flex flex-col">
          <p className="text-sm font-medium">
            {String(unmatched.length)} films could not be matched
          </p>
          <p className="text-muted text-sm">
            We could not find these in TMDB automatically.
          </p>
          <ul className="mt-related border-border border-t">
            {unmatched.map((film) => (
              <li
                key={`${film.name} ${String(film.year ?? "")}`}
                className="border-border py-related text-muted border-b text-sm last:border-0 last:pb-0"
              >
                {film.name}
                {film.year !== null && ` (${String(film.year)})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
