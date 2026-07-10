import { eq } from "drizzle-orm";

import { db } from "~/lib/db/client.server";
import { films, type ImportFilmCandidate } from "~/lib/db/schema";
import { getMovieDetails, searchMovies } from "~/lib/tmdb/client.server";
import { movieDetailsToFilm, releaseYear } from "~/lib/tmdb/schemas";

export type Film = typeof films.$inferSelect;

export interface FilmResolution {
  film: Film | null;
  candidates: ImportFilmCandidate[];
}

async function getFilmByTmdbId(tmdbId: number): Promise<Film | null> {
  const [film] = await db()
    .select()
    .from(films)
    .where(eq(films.tmdbId, tmdbId))
    .limit(1);
  return film ?? null;
}

/**
 * Return the locally cached film for a TMDB id, fetching and caching TMDB
 * metadata on first sight. Refreshes cast/genres when a cached row still has
 * empty credits (pre-parity rows). Race-safe via upsert on tmdb_id.
 */
export async function getOrCreateFilmByTmdbId(tmdbId: number): Promise<Film> {
  const existing = await getFilmByTmdbId(tmdbId);
  const needsCreditsRefresh =
    existing !== null &&
    existing.genres.length === 0 &&
    existing.cast.length === 0;
  if (existing !== null && !needsCreditsRefresh) {
    return existing;
  }
  const values = movieDetailsToFilm(await getMovieDetails(tmdbId));
  const [film] = await db()
    .insert(films)
    .values(values)
    .onConflictDoUpdate({ target: films.tmdbId, set: values })
    .returning();
  if (film === undefined) {
    throw new Error(`Failed to upsert film for TMDB id ${String(tmdbId)}`);
  }
  return film;
}

function toCandidate(result: {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
}): ImportFilmCandidate {
  return {
    tmdbId: result.id,
    title: result.title,
    year: releaseYear(result.release_date),
    posterPath: result.poster_path ?? null,
  };
}

/**
 * Pick a clear TMDB match for a Letterboxd (name, year) pair. Returns null
 * film with candidates when several results look plausible.
 */
export async function resolveFilmByNameYear(
  name: string,
  year: number | null,
): Promise<FilmResolution> {
  const response = await searchMovies(name, {
    year: year ?? undefined,
  });
  const results = response.results;
  if (results.length === 0) {
    return { film: null, candidates: [] };
  }

  const normalized = name.trim().toLowerCase();
  const withYear =
    year === null
      ? results
      : results.filter((result) => releaseYear(result.release_date) === year);
  const pool = withYear.length > 0 ? withYear : results;
  const exactTitle = pool.filter(
    (result) => result.title.trim().toLowerCase() === normalized,
  );

  const chosen = exactTitle.length === 1 ? exactTitle[0] : undefined;

  if (chosen !== undefined) {
    return {
      film: await getOrCreateFilmByTmdbId(chosen.id),
      candidates: [],
    };
  }

  return {
    film: null,
    candidates: pool.slice(0, 5).map(toCandidate),
  };
}
