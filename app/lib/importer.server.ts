import {
  extractLetterboxdCsvs,
  mergeImport,
  parseDiaryCsv,
  parseLikedFilmsCsv,
  parseReviewsCsv,
  type ImportedEntry,
  type LetterboxdCsvs,
} from "~/lib/letterboxd";
import { letterboxdRssUrl, parseLetterboxdRss } from "~/lib/letterboxd-rss";
import {
  getOrCreateFilmByTmdbId,
  resolveFilmByNameYear,
  type Film,
} from "~/lib/films.server";
import { createLogEntry, getExistingEntryKeys } from "~/lib/logs.server";

export interface ImportResult {
  imported: number;
  unmatched: { name: string; year: number | null }[];
}

/** An importable entry that may already know its TMDB id (RSS does; CSV does not). */
type ResolvableEntry = ImportedEntry & { tmdbId?: number };

/** Browser-like UA so Letterboxd's RSS endpoint serves the feed. */
const LETTERBOXD_USER_AGENT =
  "Mozilla/5.0 (compatible; pillarboxd/0.1; +https://github.com/rosematcha/pillarboxd)";

function filmKey(name: string, year: number | null): string {
  return `${name.toLowerCase()} ${String(year ?? "")}`;
}

/**
 * Resolve each entry's film (by TMDB id when known, otherwise by name/year
 * search), then create a log entry. Films are resolved once per key and
 * cached; entries duplicating an existing watch (same film + date) or an
 * unresolvable film are skipped rather than written.
 */
async function importEntries(
  userId: string,
  entries: ResolvableEntry[],
): Promise<ImportResult> {
  const seen = await getExistingEntryKeys(userId);
  const filmByTmdb = new Map<number, Film | null>();
  const filmByNameYear = new Map<string, Film | null>();
  const unmatched = new Map<string, { name: string; year: number | null }>();
  let imported = 0;

  for (const entry of entries) {
    let film: Film | null | undefined;
    if (entry.tmdbId !== undefined) {
      film = filmByTmdb.get(entry.tmdbId);
      if (film === undefined) {
        film = await getOrCreateFilmByTmdbId(entry.tmdbId).catch(() => null);
        filmByTmdb.set(entry.tmdbId, film);
      }
    } else {
      const key = filmKey(entry.name, entry.year);
      film = filmByNameYear.get(key);
      if (film === undefined) {
        film = await resolveFilmByNameYear(entry.name, entry.year).catch(
          () => null,
        );
        filmByNameYear.set(key, film);
      }
    }

    if (film === null) {
      unmatched.set(filmKey(entry.name, entry.year), {
        name: entry.name,
        year: entry.year,
      });
      continue;
    }

    const dedupeKey = `${film.id}|${entry.watchedOn ?? ""}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

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

/**
 * Import a Letterboxd export from its diary/reviews/likes CSVs. Each unique
 * (name, year) is resolved against TMDB search once.
 */
async function importLetterboxdCsvs(
  userId: string,
  csvs: LetterboxdCsvs,
): Promise<ImportResult> {
  const entries = mergeImport(
    csvs.diary === undefined ? [] : parseDiaryCsv(csvs.diary),
    csvs.reviews === undefined ? [] : parseReviewsCsv(csvs.reviews),
    csvs.likes === undefined ? [] : parseLikedFilmsCsv(csvs.likes),
  );
  return importEntries(userId, entries);
}

/** Import a full Letterboxd export zip (Settings → Data → Export your data). */
export async function importLetterboxdZip(
  userId: string,
  bytes: Uint8Array,
): Promise<ImportResult> {
  const csvs = extractLetterboxdCsvs(bytes);
  if (csvs.diary === undefined && csvs.reviews === undefined) {
    throw new Error(
      "That zip doesn't contain a diary.csv or reviews.csv — is it a Letterboxd export?",
    );
  }
  return importLetterboxdCsvs(userId, csvs);
}

/**
 * Import a member's recent activity straight from their public Letterboxd RSS
 * feed. Films match exactly by TMDB id; only the ~50 most recent entries are
 * available this way.
 */
export async function importLetterboxdRss(
  userId: string,
  username: string,
): Promise<ImportResult> {
  const trimmed = username.trim().replace(/^@/, "");
  if (trimmed === "") {
    throw new Error("Enter your Letterboxd username.");
  }
  let response: Response;
  try {
    response = await fetch(letterboxdRssUrl(trimmed), {
      headers: {
        "User-Agent": LETTERBOXD_USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
  } catch {
    throw new Error("Couldn't reach Letterboxd. Try again in a moment.");
  }
  if (response.status === 404) {
    throw new Error(`No public Letterboxd profile found for "${trimmed}".`);
  }
  if (!response.ok) {
    throw new Error(
      `Letterboxd returned an error (${String(response.status)}). Try the export zip instead.`,
    );
  }
  const entries = parseLetterboxdRss(await response.text());
  return importEntries(userId, entries);
}
