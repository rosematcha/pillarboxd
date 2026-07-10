import { Link } from "react-router";

import { PosterImage } from "~/components/poster-image";
import { SpoilerText } from "~/components/spoiler-text";
import { StarRating } from "~/components/star-rating";
import { formatShortDate } from "~/lib/dates";

export interface DiaryTableEntry {
  id: string;
  liked: boolean;
  rating: number | null;
  rewatch: boolean;
  review: string | null;
  containsSpoilers: boolean;
  watchedOn: string | null;
  tags?: string[];
  entryHref?: string;
  film: {
    posterPath: string | null;
    title: string;
    tmdbId: number;
    year: number | null;
  };
}

export function DiaryTable({
  entries,
}: {
  entries: DiaryTableEntry[];
}): React.ReactElement {
  return (
    <>
      <ul className="flex flex-col sm:hidden">
        {entries.map((item) => {
          const filmHref = `/film/${String(item.film.tmdbId)}`;
          const titleHref = item.entryHref ?? filmHref;
          return (
            <li
              key={item.id}
              className="gap-related border-border py-block flex border-b"
            >
              <Link
                to={filmHref}
                tabIndex={-1}
                aria-hidden="true"
                className="rounded-poster w-12 shrink-0 overflow-hidden"
              >
                <PosterImage
                  title={item.film.title}
                  alt=""
                  url={
                    item.film.posterPath === null
                      ? null
                      : `https://image.tmdb.org/t/p/w92${item.film.posterPath}`
                  }
                  className="aspect-[2/3]"
                />
              </Link>
              <div className="gap-tight flex min-w-0 flex-1 flex-col text-sm">
                <div className="gap-related flex flex-wrap items-baseline">
                  <Link
                    to={titleHref}
                    className="text-text hover:text-accent font-medium"
                  >
                    {item.film.title}
                  </Link>
                  {item.film.year !== null && (
                    <span className="text-faint">{String(item.film.year)}</span>
                  )}
                </div>
                <div className="gap-related text-faint flex flex-wrap items-center text-xs tabular-nums">
                  <span>
                    {formatShortDate(item.watchedOn, { includeYear: true })}
                  </span>
                  {item.rating !== null && (
                    <StarRating rating={item.rating / 2} />
                  )}
                  {item.rewatch && (
                    <span className="gap-tight inline-flex items-center">
                      <span className="bg-sage size-1.5 rounded-full" />
                      Rewatch
                    </span>
                  )}
                  {item.liked && (
                    <span className="text-accent" aria-label="Liked">
                      ♥
                    </span>
                  )}
                </div>
                {item.review !== null && (
                  <p className="text-muted text-xs leading-relaxed">
                    <SpoilerText containsSpoilers={item.containsSpoilers}>
                      {item.review}
                    </SpoilerText>
                  </p>
                )}
                {item.tags !== undefined && item.tags.length > 0 && (
                  <p className="text-faint text-xs">{item.tags.join(", ")}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[34rem] border-collapse text-sm tabular-nums">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-block py-related font-medium">Date</th>
              <th className="px-tight py-related w-12">
                <span className="sr-only">Poster</span>
              </th>
              <th className="px-block py-related font-medium">Film</th>
              <th className="px-block py-related font-medium">Rating</th>
              <th className="px-block py-related">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((item) => {
              const filmHref = `/film/${String(item.film.tmdbId)}`;
              const titleHref = item.entryHref ?? filmHref;
              return (
                <tr
                  key={item.id}
                  className="border-border hover:bg-accent/4 border-b transition-colors duration-[var(--duration-feedback)]"
                >
                  <td className="px-block py-block text-faint whitespace-nowrap">
                    {formatShortDate(item.watchedOn, { includeYear: true })}
                  </td>
                  <td className="px-tight py-block">
                    <Link
                      to={filmHref}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="w-step rounded-poster block overflow-hidden"
                    >
                      <PosterImage
                        title={item.film.title}
                        alt=""
                        url={
                          item.film.posterPath === null
                            ? null
                            : `https://image.tmdb.org/t/p/w92${item.film.posterPath}`
                        }
                        className="aspect-[2/3]"
                      />
                    </Link>
                  </td>
                  <td className="px-block py-block">
                    <div className="gap-tight flex flex-col">
                      <div>
                        <Link
                          to={titleHref}
                          className="text-text hover:text-accent font-medium"
                        >
                          {item.film.title}
                        </Link>{" "}
                        {item.film.year !== null && (
                          <span className="text-faint">
                            {String(item.film.year)}
                          </span>
                        )}
                      </div>
                      {item.review !== null && (
                        <p className="text-muted max-w-[50ch] text-xs leading-relaxed">
                          <SpoilerText containsSpoilers={item.containsSpoilers}>
                            {item.review}
                          </SpoilerText>
                        </p>
                      )}
                      {item.tags !== undefined && item.tags.length > 0 && (
                        <p className="text-faint text-xs">
                          {item.tags.join(", ")}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-block py-block">
                    {item.rating !== null && (
                      <StarRating rating={item.rating / 2} />
                    )}
                  </td>
                  <td className="px-block py-block">
                    <span className="gap-related flex items-center justify-end">
                      {item.rewatch && (
                        <span
                          title="Rewatch"
                          aria-label="Rewatch"
                          className="bg-sage size-1.5 rounded-full"
                        />
                      )}
                      {item.liked && (
                        <span aria-label="Liked" className="text-accent">
                          ♥
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
