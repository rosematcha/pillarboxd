import type { ReactNode } from "react";

import { ImportManualMatch } from "~/components/import-manual-match";
import type { UnmatchedEntry } from "~/lib/importer.server";

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
  jobId,
}: {
  imported: number;
  unmatched: UnmatchedEntry[];
  jobId?: string;
}): React.ReactElement {
  return (
    <div className="gap-section flex flex-col" aria-live="polite">
      <div className="gap-tight flex flex-col">
        <p className="text-sm font-medium">{String(imported)} items imported</p>
        <p className="text-muted text-sm">
          Added diary entries and any other film data found.
        </p>
      </div>
      {unmatched.length > 0 && (
        <div className="gap-tight flex flex-col">
          <p className="text-sm font-medium">
            {String(unmatched.length)} films could not be matched
          </p>
          <p className="text-muted text-sm">
            Search TMDB for the right film, then paste its id below.
          </p>
          <ul className="mt-related border-border border-t">
            {unmatched.map((film, index) => (
              <ImportManualMatch
                key={film.id ?? `${film.name}-${String(index)}`}
                entry={film}
                index={index}
                jobId={jobId}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
