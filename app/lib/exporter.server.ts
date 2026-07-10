import { ratingToStars } from "~/lib/letterboxd";
import { getUserDiary } from "~/lib/logs.server";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Full-fidelity JSON export of a user's diary. */
export async function exportJson(userId: string): Promise<string> {
  const diary = await getUserDiary(userId, Number.MAX_SAFE_INTEGER);
  return JSON.stringify(
    {
      format: "pillarboxd-export",
      version: 1,
      entries: diary.map(({ entry, film, tags }) => ({
        uri: entry.uri,
        film: {
          tmdbId: film.tmdbId,
          imdbId: film.imdbId,
          title: film.title,
          year: film.year,
        },
        watchedOn: entry.watchedOn,
        rating: entry.rating,
        stars: entry.rating === null ? null : ratingToStars(entry.rating),
        review: entry.review,
        liked: entry.liked,
        rewatch: entry.rewatch,
        containsSpoilers: entry.containsSpoilers,
        tags,
        createdAt: entry.createdAt.toISOString(),
      })),
    },
    null,
    2,
  );
}

/** Letterboxd-compatible diary CSV so exports import cleanly elsewhere. */
export async function exportDiaryCsv(userId: string): Promise<string> {
  const diary = await getUserDiary(userId, Number.MAX_SAFE_INTEGER);
  const header = "Date,Name,Year,Rating,Rewatch,Tags,Watched Date,Review";
  const rows = diary.map(({ entry, film, tags }) =>
    [
      entry.createdAt.toISOString().slice(0, 10),
      csvEscape(film.title),
      String(film.year ?? ""),
      entry.rating === null ? "" : String(ratingToStars(entry.rating)),
      entry.rewatch ? "Yes" : "",
      csvEscape(tags.join(", ")),
      entry.watchedOn ?? "",
      csvEscape(entry.review ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
