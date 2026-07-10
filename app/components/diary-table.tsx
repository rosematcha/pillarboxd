import { Link } from "react-router";

import { StarRating } from "~/components/star-rating";

export interface DiaryTableEntry {
  id: string;
  liked: boolean;
  rating: number | null;
  rewatch: boolean;
  watchedOn: string | null;
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
    <div className="overflow-x-auto">
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
          {entries.map((item) => (
            <tr
              key={item.id}
              className="border-border hover:bg-accent/4 border-b transition-colors duration-[var(--duration-feedback)]"
            >
              <td className="px-block py-block text-faint whitespace-nowrap">
                {item.watchedOn ?? "No date"}
              </td>
              <td className="px-tight py-block">
                <Link
                  to={`/film/${String(item.film.tmdbId)}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="w-step rounded-poster bg-bg-subtle block aspect-[2/3] overflow-hidden"
                >
                  {item.film.posterPath !== null && (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${item.film.posterPath}`}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </Link>
              </td>
              <td className="px-block py-block">
                <Link
                  to={`/film/${String(item.film.tmdbId)}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {item.film.title}
                </Link>{" "}
                {item.film.year !== null && (
                  <span className="text-faint">{String(item.film.year)}</span>
                )}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
