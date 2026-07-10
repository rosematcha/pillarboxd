import { Link } from "react-router";

import { StarRating } from "~/components/star-rating";

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
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(createdAt));

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
        </p>
        {rating !== null && <StarRating rating={rating / 2} className="mt-1" />}
      </div>
      <time dateTime={createdAt} className="text-faint shrink-0 text-xs">
        {date}
      </time>
      <Link
        to={`/film/${String(tmdbId)}`}
        tabIndex={-1}
        aria-hidden="true"
        className="rounded-poster bg-bg-subtle aspect-[2/3] w-7 shrink-0 overflow-hidden"
      >
        {posterPath !== null && (
          <img
            src={`https://image.tmdb.org/t/p/w92${posterPath}`}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </Link>
    </article>
  );
}
