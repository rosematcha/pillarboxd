import {
  mergeImport,
  parseDiaryCsv,
  parseLikedFilmsCsv,
  parseReviewsCsv,
} from "~/lib/letterboxd";
import { resolveFilmByNameYear, type Film } from "~/lib/films.server";
import { createLogEntry } from "~/lib/logs.server";

export interface ImportResult {
  imported: number;
  unmatched: { name: string; year: number | null }[];
}

function filmKey(name: string, year: number | null): string {
  return `${name.toLowerCase()} ${String(year ?? "")}`;
}

/**
 * Import a Letterboxd export for a user. Each unique (name, year) is
 * resolved against TMDB once; entries whose film cannot be resolved are
 * reported back rather than silently dropped.
 */
export async function importLetterboxdCsvs(
  userId: string,
  csvs: { diary?: string; reviews?: string; likes?: string },
): Promise<ImportResult> {
  const entries = mergeImport(
    csvs.diary === undefined ? [] : parseDiaryCsv(csvs.diary),
    csvs.reviews === undefined ? [] : parseReviewsCsv(csvs.reviews),
    csvs.likes === undefined ? [] : parseLikedFilmsCsv(csvs.likes),
  );

  const filmCache = new Map<string, Film | null>();
  const unmatched = new Map<string, { name: string; year: number | null }>();
  let imported = 0;

  for (const entry of entries) {
    const key = filmKey(entry.name, entry.year);
    let film = filmCache.get(key);
    if (film === undefined) {
      film = await resolveFilmByNameYear(entry.name, entry.year);
      filmCache.set(key, film);
    }
    if (film === null) {
      unmatched.set(key, { name: entry.name, year: entry.year });
      continue;
    }
    await createLogEntry(userId, {
      filmId: film.id,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      review: entry.review,
      liked: entry.liked,
      rewatch: entry.rewatch,
      containsSpoilers: false,
      tags: entry.tags,
    });
    imported += 1;
  }

  return { imported, unmatched: [...unmatched.values()] };
}
