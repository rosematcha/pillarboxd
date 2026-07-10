import { Link } from "react-router";

import { StarRating } from "~/components/star-rating";
import { PosterImage } from "~/components/poster-image";
import { formatRelativeTime } from "~/lib/dates";

export function ActivityItem({
  createdAt,
  filmTitle,
  posterPath,
  rating,
  reviewed,
  tmdbId,
  username,
}: {
  createdAt: string;
  filmTitle: string;
  posterPath: string | null;
  rating: number | null;
  reviewed: boolean;
  tmdbId: number;
  username: string;
}): React.ReactElement {
  const initial = username.slice(0, 1).toLowerCase();
  const timestamp = formatRelativeTime(createdAt);

  return (
    <article className="gap-block border-border py-block flex items-center border-b">
      <Link
        to={`/u/${username}`}
        aria-label={`View @${username}'s profile`}
        className="size-step border-accent/25 bg-accent/10 text-accent flex shrink-0 items-center justify-center rounded-full border text-xs font-medium"
      >
        {initial}
      </Link>
      <div className="min-w-0 flex-1 text-sm">
        <p>
          <Link to={`/u/${username}`} className="font-medium">
            {username}
          </Link>{" "}
          {reviewed ? "reviewed" : "logged"}{" "}
          <Link to={`/film/${String(tmdbId)}`} className="font-medium">
            {filmTitle}
          </Link>
          {rating !== null && (
            <>
              {" "}
              <StarRating rating={rating / 2} className="inline-flex" />
            </>
          )}
        </p>
      </div>
      <time dateTime={createdAt} className="text-faint shrink-0 text-xs">
        {timestamp}
      </time>
      <Link
        to={`/film/${String(tmdbId)}`}
        tabIndex={-1}
        aria-hidden="true"
        className="rounded-poster w-7 shrink-0 overflow-hidden"
      >
        <PosterImage
          title={filmTitle}
          alt=""
          url={
            posterPath === null
              ? null
              : `https://image.tmdb.org/t/p/w92${posterPath}`
          }
          className="aspect-[2/3]"
        />
      </Link>
    </article>
  );
}
