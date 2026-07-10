import { Link } from "react-router";

import { SpoilerText } from "~/components/spoiler-text";
import { StarRating } from "~/components/star-rating";
import { formatShortDate } from "~/lib/dates";

export function ReviewPreview({
  containsSpoilers,
  filmTitle,
  filmYear,
  id,
  rating,
  review,
  tmdbId,
  username,
  watchedOn,
}: {
  containsSpoilers: boolean;
  filmTitle: string;
  filmYear: number | null;
  id?: string;
  rating: number | null;
  review: string;
  tmdbId: number;
  username: string;
  watchedOn: string | null;
}): React.ReactElement {
  const excerpt =
    review.length > 220 ? `${review.slice(0, 220).trimEnd()}…` : review;
  const entryHref = id === undefined ? null : `/entries/${id}`;

  return (
    <article className="gap-block border-border py-block flex flex-col border-b text-sm last:border-0">
      <div className="gap-tight flex flex-col">
        <p>
          <Link to={`/u/${username}`} className="font-medium">
            {username}
          </Link>{" "}
          on{" "}
          <Link to={`/film/${String(tmdbId)}`} className="font-medium">
            {filmTitle}
            {filmYear !== null && (
              <span className="text-faint font-normal">
                {" "}
                ({String(filmYear)})
              </span>
            )}
          </Link>
        </p>
        <div className="gap-related text-faint flex flex-wrap items-center text-xs">
          <span className="tabular-nums">
            {formatShortDate(watchedOn, { includeYear: true })}
          </span>
          {rating !== null && <StarRating rating={rating / 2} />}
        </div>
      </div>
      <p className="text-muted max-w-[70ch] leading-relaxed">
        <SpoilerText containsSpoilers={containsSpoilers}>{excerpt}</SpoilerText>
      </p>
      {entryHref !== null && (
        <Link
          to={entryHref}
          className="text-accent self-start text-xs font-medium"
        >
          Read entry
        </Link>
      )}
    </article>
  );
}
