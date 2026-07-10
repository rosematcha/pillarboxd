import { eq } from "drizzle-orm";

import { db } from "~/lib/db/client.server";
import { films } from "~/lib/db/schema";
import { getMovieDetails, searchMovies } from "~/lib/tmdb/client.server";
import { movieDetailsToFilm } from "~/lib/tmdb/schemas";

export type Film = typeof films.$inferSelect;

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
 * metadata on first sight. Race-safe via upsert on the tmdb_id unique index.
 */
export async function getOrCreateFilmByTmdbId(tmdbId: number): Promise<Film> {
  const existing = await getFilmByTmdbId(tmdbId);
  if (existing !== null) {
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

/**
 * Resolve a film by title and year via TMDB search — used by the Letterboxd
 * importer, whose CSVs carry no TMDB ids. Returns null when nothing matches.
 */
export async function resolveFilmByNameYear(
  name: string,
  year: number | null,
): Promise<Film | null> {
  const response = await searchMovies(name, {
    year: year ?? undefined,
  });
  const match = response.results[0];
  if (match === undefined) {
    return null;
  }
  return getOrCreateFilmByTmdbId(match.id);
}
