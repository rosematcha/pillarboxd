import { Form } from "react-router";

import { Button } from "~/components/button";
import { Field, Input } from "~/components/input";
import type { UnmatchedEntry } from "~/lib/importer.server";
import { formatShortDate } from "~/lib/dates";

export function ImportManualMatch({
  entry,
  index,
  jobId,
}: {
  entry: UnmatchedEntry;
  index: number;
  jobId?: string;
}): React.ReactElement {
  const searchQuery = encodeURIComponent(entry.name);
  return (
    <li className="gap-block border-border py-related flex flex-col border-b text-sm last:border-0 last:pb-0">
      <div className="gap-tight flex flex-col">
        <p className="font-medium">
          {entry.name}
          {entry.year !== null && ` (${String(entry.year)})`}
        </p>
        <p className="text-muted text-xs">
          {formatShortDate(entry.watchedOn, { includeYear: true })}
          {entry.rating !== null && ` · ${String(entry.rating / 2)}★`}
          {entry.candidates.length > 0 && " · several TMDB matches"}
        </p>
      </div>
      {entry.candidates.length > 0 && (
        <ul className="gap-tight flex flex-col">
          {entry.candidates.map((candidate) => (
            <li key={candidate.tmdbId}>
              <Form
                method="post"
                className="gap-related flex flex-col items-stretch sm:flex-row sm:items-center"
              >
                <input type="hidden" name="intent" value="match" />
                {jobId !== undefined && (
                  <input type="hidden" name="jobId" value={jobId} />
                )}
                {entry.id !== undefined && (
                  <input type="hidden" name="entryId" value={entry.id} />
                )}
                <input type="hidden" name="name" value={entry.name} />
                <input
                  type="hidden"
                  name="year"
                  value={entry.year === null ? "" : String(entry.year)}
                />
                <input
                  type="hidden"
                  name="watchedOn"
                  value={entry.watchedOn ?? ""}
                />
                <input
                  type="hidden"
                  name="rating"
                  value={entry.rating === null ? "" : String(entry.rating)}
                />
                <input type="hidden" name="review" value={entry.review ?? ""} />
                <input
                  type="hidden"
                  name="tags"
                  value={entry.tags.join(", ")}
                />
                {entry.rewatch && (
                  <input type="hidden" name="rewatch" value="on" />
                )}
                {entry.liked && <input type="hidden" name="liked" value="on" />}
                {entry.containsSpoilers && (
                  <input type="hidden" name="containsSpoilers" value="on" />
                )}
                <input
                  type="hidden"
                  name="tmdbId"
                  value={String(candidate.tmdbId)}
                />
                <span className="min-w-0 flex-1">
                  {candidate.title}
                  {candidate.year !== null && ` (${String(candidate.year)})`}
                </span>
                <Button
                  type="submit"
                  variant="secondary"
                  className="sm:self-auto"
                >
                  Use this
                </Button>
              </Form>
            </li>
          ))}
        </ul>
      )}
      <Form
        method="post"
        className="gap-related flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-end"
      >
        <input type="hidden" name="intent" value="match" />
        {jobId !== undefined && (
          <input type="hidden" name="jobId" value={jobId} />
        )}
        {entry.id !== undefined && (
          <input type="hidden" name="entryId" value={entry.id} />
        )}
        <input type="hidden" name="name" value={entry.name} />
        <input
          type="hidden"
          name="year"
          value={entry.year === null ? "" : String(entry.year)}
        />
        <input type="hidden" name="watchedOn" value={entry.watchedOn ?? ""} />
        <input
          type="hidden"
          name="rating"
          value={entry.rating === null ? "" : String(entry.rating)}
        />
        <input type="hidden" name="review" value={entry.review ?? ""} />
        <input type="hidden" name="tags" value={entry.tags.join(", ")} />
        {entry.rewatch && <input type="hidden" name="rewatch" value="on" />}
        {entry.liked && <input type="hidden" name="liked" value="on" />}
        {entry.containsSpoilers && (
          <input type="hidden" name="containsSpoilers" value="on" />
        )}
        <Field label="TMDB film id" htmlFor={`tmdb-id-${String(index)}`}>
          <Input
            id={`tmdb-id-${String(index)}`}
            name="tmdbId"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            placeholder="11631"
            aria-label={`TMDB id for ${entry.name}`}
          />
        </Field>
        <Button type="submit" variant="secondary" className="sm:self-end">
          Use this film
        </Button>
        <a
          href={`/films/search?q=${searchQuery}`}
          className="text-accent flex min-h-11 items-center text-sm font-medium sm:self-end"
        >
          Search TMDB
        </a>
      </Form>
    </li>
  );
}
