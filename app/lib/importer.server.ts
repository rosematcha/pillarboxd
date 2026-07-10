import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { mapWithConcurrency } from "~/lib/concurrency";
import { db } from "~/lib/db/client.server";
import {
  importJobs,
  importUnmatched,
  type ImportFilmCandidate,
  type ImportUnmatchedKind,
} from "~/lib/db/schema";
import { setFilmState } from "~/lib/film-state.server";
import {
  extractLetterboxdCsvs,
  mergeImport,
  parseDiaryCsv,
  parseLikedFilmsCsv,
  parseListCsv,
  parseRatingsCsv,
  parseReviewsCsv,
  parseWatchlistCsv,
  type ImportedEntry,
  type LetterboxdCsvs,
} from "~/lib/letterboxd";
import { letterboxdRssUrl, parseLetterboxdRss } from "~/lib/letterboxd-rss";
import {
  getOrCreateFilmByTmdbId,
  resolveFilmByNameYear,
  type FilmResolution,
} from "~/lib/films.server";
import { TmdbError } from "~/lib/tmdb/client.server";
import { createList, addFilmToList } from "~/lib/lists.server";
import {
  createLogEntry,
  getExistingEntryKeys,
  logEntryInputSchema,
} from "~/lib/logs.server";

const FILM_RESOLVE_CONCURRENCY = 6;
const LETTERBOXD_FETCH_TIMEOUT_MS = 20_000;

export interface UnmatchedEntry {
  id?: string;
  name: string;
  year: number | null;
  watchedOn: string | null;
  rating: number | null;
  review: string | null;
  rewatch: boolean;
  tags: string[];
  liked: boolean;
  containsSpoilers: boolean;
  candidates: ImportFilmCandidate[];
  kind: ImportUnmatchedKind;
  listId: string | null;
}

export interface ImportResult {
  imported: number;
  unmatched: UnmatchedEntry[];
  jobId?: string;
}

/** An importable entry that may already know its TMDB id (RSS does; CSV does not). */
type ResolvableEntry = ImportedEntry & { tmdbId?: number };

type FilmResolutionKey =
  | { kind: "tmdb"; tmdbId: number }
  | { kind: "nameYear"; name: string; year: number | null; key: string };

/** Browser-like UA so Letterboxd's RSS endpoint serves the feed. */
const LETTERBOXD_USER_AGENT =
  "Mozilla/5.0 (compatible; pillarboxd/0.1; +https://github.com/rosematcha/pillarboxd)";

function filmKey(name: string, year: number | null): string {
  return `${name.toLowerCase().replaceAll("\0", "")}|${String(year ?? "")}`;
}

function entryKey(
  entry: Pick<ImportedEntry, "name" | "year" | "watchedOn">,
): string {
  return `${filmKey(entry.name, entry.year)}|${entry.watchedOn ?? ""}`;
}

function unmatchedKey(entry: UnmatchedEntry): string {
  return `${entry.kind}|${entry.listId ?? ""}|${entryKey(entry)}`;
}

function resolutionKey(entry: ResolvableEntry): FilmResolutionKey {
  if (entry.tmdbId !== undefined) {
    return { kind: "tmdb", tmdbId: entry.tmdbId };
  }
  const key = filmKey(entry.name, entry.year);
  return { kind: "nameYear", name: entry.name, year: entry.year, key };
}

function resolutionMapKey(key: FilmResolutionKey): string {
  return key.kind === "tmdb" ? `tmdb:${String(key.tmdbId)}` : `name:${key.key}`;
}

async function resolveFilm(key: FilmResolutionKey): Promise<FilmResolution> {
  try {
    if (key.kind === "tmdb") {
      return {
        film: await getOrCreateFilmByTmdbId(key.tmdbId),
        candidates: [],
      };
    }
    return await resolveFilmByNameYear(key.name, key.year);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) {
      return { film: null, candidates: [] };
    }
    throw error;
  }
}

async function resolveFilms(
  keys: FilmResolutionKey[],
): Promise<Map<string, FilmResolution>> {
  const unique = new Map<string, FilmResolutionKey>();
  for (const key of keys) {
    unique.set(resolutionMapKey(key), key);
  }
  const resolved = new Map<string, FilmResolution>();
  const items = [...unique.entries()];
  const results = await mapWithConcurrency(
    items,
    FILM_RESOLVE_CONCURRENCY,
    async ([mapKey, filmResolutionKey]) =>
      [mapKey, await resolveFilm(filmResolutionKey)] as const,
  );
  for (const [mapKey, film] of results) {
    resolved.set(mapKey, film);
  }
  return resolved;
}

function toUnmatched(
  entry: ResolvableEntry,
  candidates: ImportFilmCandidate[] = [],
): UnmatchedEntry {
  return {
    name: entry.name,
    year: entry.year,
    watchedOn: entry.watchedOn,
    rating: entry.rating,
    review: entry.review,
    rewatch: entry.rewatch,
    tags: entry.tags,
    liked: entry.liked,
    containsSpoilers: entry.containsSpoilers,
    candidates,
    kind: "diary",
    listId: null,
  };
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
  const films = await resolveFilms(entries.map(resolutionKey));
  const unmatched = new Map<string, UnmatchedEntry>();
  let imported = 0;

  for (const entry of entries) {
    const resolution = films.get(resolutionMapKey(resolutionKey(entry))) ?? {
      film: null,
      candidates: [],
    };
    const film = resolution.film;

    if (film === null) {
      unmatched.set(entryKey(entry), toUnmatched(entry, resolution.candidates));
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
      containsSpoilers: entry.containsSpoilers,
      tags: entry.tags,
    });
    imported += 1;
  }

  return { imported, unmatched: [...unmatched.values()] };
}

async function importFilmStates(
  userId: string,
  items: {
    name: string;
    year: number | null;
    rating?: number | null;
    liked?: boolean;
    watchlisted?: boolean;
    kind: "rating" | "liked" | "watchlist";
  }[],
): Promise<{ applied: number; unmatched: UnmatchedEntry[] }> {
  const films = await resolveFilms(
    items.map((item) => ({
      kind: "nameYear" as const,
      name: item.name,
      year: item.year,
      key: filmKey(item.name, item.year),
    })),
  );
  const unmatched: UnmatchedEntry[] = [];
  let applied = 0;

  for (const item of items) {
    const key: FilmResolutionKey = {
      kind: "nameYear",
      name: item.name,
      year: item.year,
      key: filmKey(item.name, item.year),
    };
    const resolution = films.get(resolutionMapKey(key)) ?? {
      film: null,
      candidates: [],
    };
    const film = resolution.film;
    if (film === null) {
      unmatched.push({
        name: item.name,
        year: item.year,
        watchedOn: null,
        rating: item.rating ?? null,
        review: null,
        rewatch: false,
        tags: [],
        liked: item.liked ?? false,
        containsSpoilers: false,
        candidates: resolution.candidates,
        kind: item.kind,
        listId: null,
      });
      continue;
    }
    await setFilmState(userId, film.id, {
      ...(item.rating !== undefined && item.rating !== null
        ? { rating: item.rating, watched: true }
        : {}),
      ...(item.liked === true ? { liked: true } : {}),
      ...(item.watchlisted === true ? { watchlisted: true } : {}),
    });
    applied += 1;
  }

  return { applied, unmatched };
}

async function importLists(
  userId: string,
  listCsvs: LetterboxdCsvs["lists"],
): Promise<{ applied: number; unmatched: UnmatchedEntry[] }> {
  let applied = 0;
  const unmatched: UnmatchedEntry[] = [];

  for (const listCsv of listCsvs) {
    const films = parseListCsv(listCsv.csv);
    if (films.length === 0) {
      continue;
    }
    const list = await createList(userId, {
      name: listCsv.name,
      ranked: films.some((film) => film.position !== null),
      public: true,
    });
    const resolutions = await resolveFilms(
      films.map((film) => ({
        kind: "nameYear" as const,
        name: film.name,
        year: film.year,
        key: filmKey(film.name, film.year),
      })),
    );
    const ordered = [...films].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    for (const filmRow of ordered) {
      const key: FilmResolutionKey = {
        kind: "nameYear",
        name: filmRow.name,
        year: filmRow.year,
        key: filmKey(filmRow.name, filmRow.year),
      };
      const resolution = resolutions.get(resolutionMapKey(key)) ?? {
        film: null,
        candidates: [],
      };
      if (resolution.film === null) {
        unmatched.push({
          name: filmRow.name,
          year: filmRow.year,
          watchedOn: null,
          rating: null,
          review: filmRow.notes,
          rewatch: false,
          tags: [],
          liked: false,
          containsSpoilers: false,
          candidates: resolution.candidates,
          kind: "list",
          listId: list.id,
        });
        continue;
      }
      await addFilmToList(userId, list.id, resolution.film.id, filmRow.notes);
      applied += 1;
    }
  }

  return { applied, unmatched };
}

async function persistUnmatched(
  jobId: string,
  unmatched: UnmatchedEntry[],
): Promise<UnmatchedEntry[]> {
  if (unmatched.length === 0) {
    return [];
  }
  const rows = await db()
    .insert(importUnmatched)
    .values(
      unmatched.map((entry) => ({
        jobId,
        name: entry.name,
        year: entry.year,
        watchedOn: entry.watchedOn,
        rating: entry.rating,
        review: entry.review,
        rewatch: entry.rewatch,
        liked: entry.liked,
        containsSpoilers: entry.containsSpoilers,
        tags: entry.tags,
        candidates: entry.candidates,
        kind: entry.kind,
        listId: entry.listId,
      })),
    )
    .returning();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    year: row.year,
    watchedOn: row.watchedOn,
    rating: row.rating,
    review: row.review,
    rewatch: row.rewatch,
    liked: row.liked,
    containsSpoilers: row.containsSpoilers,
    tags: row.tags,
    candidates: row.candidates,
    kind: row.kind,
    listId: row.listId,
  }));
}

async function getUnresolvedUnmatched(
  userId: string,
  jobId: string,
): Promise<UnmatchedEntry[]> {
  const rows = await db()
    .select({ unmatched: importUnmatched })
    .from(importUnmatched)
    .innerJoin(importJobs, eq(importUnmatched.jobId, importJobs.id))
    .where(
      and(
        eq(importUnmatched.jobId, jobId),
        eq(importUnmatched.resolved, false),
        eq(importJobs.userId, userId),
      ),
    );
  return rows.map(({ unmatched }) => ({
    id: unmatched.id,
    name: unmatched.name,
    year: unmatched.year,
    watchedOn: unmatched.watchedOn,
    rating: unmatched.rating,
    review: unmatched.review,
    rewatch: unmatched.rewatch,
    liked: unmatched.liked,
    containsSpoilers: unmatched.containsSpoilers,
    tags: unmatched.tags,
    candidates: unmatched.candidates,
    kind: unmatched.kind,
    listId: unmatched.listId,
  }));
}

async function getOwnedUnmatched(
  userId: string,
  jobId: string,
  entryId: string,
): Promise<UnmatchedEntry | null> {
  const [row] = await db()
    .select({ unmatched: importUnmatched })
    .from(importUnmatched)
    .innerJoin(importJobs, eq(importUnmatched.jobId, importJobs.id))
    .where(
      and(
        eq(importUnmatched.id, entryId),
        eq(importUnmatched.jobId, jobId),
        eq(importUnmatched.resolved, false),
        eq(importJobs.userId, userId),
      ),
    )
    .limit(1);
  if (row === undefined) {
    return null;
  }
  return {
    id: row.unmatched.id,
    name: row.unmatched.name,
    year: row.unmatched.year,
    watchedOn: row.unmatched.watchedOn,
    rating: row.unmatched.rating,
    review: row.unmatched.review,
    rewatch: row.unmatched.rewatch,
    liked: row.unmatched.liked,
    containsSpoilers: row.unmatched.containsSpoilers,
    tags: row.unmatched.tags,
    candidates: row.unmatched.candidates,
    kind: row.unmatched.kind,
    listId: row.unmatched.listId,
  };
}

/** Import one previously unmatched entry after the user picks a TMDB film. */
export async function importManualEntry(
  userId: string,
  tmdbId: number,
  entry: UnmatchedEntry,
  jobId?: string,
): Promise<{
  imported: boolean;
  reason?: "duplicate" | "invalid";
  unmatched?: UnmatchedEntry[];
  importedCount?: number;
}> {
  if (Number.isNaN(tmdbId) || tmdbId <= 0) {
    return { imported: false, reason: "invalid" };
  }
  let sourceEntry = entry;
  if (jobId !== undefined) {
    if (entry.id === undefined) {
      return { imported: false, reason: "invalid" };
    }
    const persisted = await getOwnedUnmatched(userId, jobId, entry.id);
    if (persisted === null) {
      return { imported: false, reason: "invalid" };
    }
    sourceEntry = persisted;
  }
  const film = await getOrCreateFilmByTmdbId(tmdbId).catch(() => null);
  if (film === null) {
    return { imported: false, reason: "invalid" };
  }
  if (sourceEntry.kind === "diary") {
    const seen = await getExistingEntryKeys(userId);
    const dedupeKey = `${film.id}|${sourceEntry.watchedOn ?? ""}`;
    if (seen.has(dedupeKey)) {
      if (jobId !== undefined && sourceEntry.id !== undefined) {
        await db()
          .update(importUnmatched)
          .set({ resolved: true })
          .where(
            and(
              eq(importUnmatched.id, sourceEntry.id),
              eq(importUnmatched.jobId, jobId),
            ),
          );
        return {
          imported: false,
          reason: "duplicate",
          unmatched: await getUnresolvedUnmatched(userId, jobId),
        };
      }
      return { imported: false, reason: "duplicate" };
    }
    const parsedEntry = logEntryInputSchema.safeParse({
      filmId: film.id,
      watchedOn: sourceEntry.watchedOn,
      rating: sourceEntry.rating,
      review: sourceEntry.review,
      rewatch: sourceEntry.rewatch,
      liked: sourceEntry.liked,
      containsSpoilers: sourceEntry.containsSpoilers,
      tags: sourceEntry.tags,
    });
    if (!parsedEntry.success) {
      return { imported: false, reason: "invalid" };
    }
    await createLogEntry(userId, parsedEntry.data);
  } else if (sourceEntry.kind === "rating") {
    if (
      sourceEntry.rating === null ||
      !Number.isInteger(sourceEntry.rating) ||
      sourceEntry.rating < 1 ||
      sourceEntry.rating > 10
    ) {
      return { imported: false, reason: "invalid" };
    }
    await setFilmState(userId, film.id, {
      rating: sourceEntry.rating,
      watched: true,
    });
  } else if (sourceEntry.kind === "watchlist") {
    await setFilmState(userId, film.id, { watchlisted: true });
  } else if (sourceEntry.kind === "liked") {
    await setFilmState(userId, film.id, { liked: true });
  } else {
    if (sourceEntry.listId === null) {
      return { imported: false, reason: "invalid" };
    }
    const added = await addFilmToList(
      userId,
      sourceEntry.listId,
      film.id,
      sourceEntry.review,
    );
    if (added === null) {
      return { imported: false, reason: "invalid" };
    }
  }

  if (jobId !== undefined) {
    if (sourceEntry.id !== undefined) {
      await db()
        .update(importUnmatched)
        .set({ resolved: true })
        .where(
          and(
            eq(importUnmatched.id, sourceEntry.id),
            eq(importUnmatched.jobId, jobId),
          ),
        );
    }
    const remaining = await getUnresolvedUnmatched(userId, jobId);
    const [updatedJob] = await db()
      .update(importJobs)
      .set({ importedCount: sql`${importJobs.importedCount} + 1` })
      .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)))
      .returning({ importedCount: importJobs.importedCount });
    if (updatedJob === undefined) {
      return { imported: false, reason: "invalid" };
    }
    if (remaining.length === 0) {
      await db()
        .update(importJobs)
        .set({ status: "complete" })
        .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)));
    }
    return {
      imported: true,
      unmatched: remaining,
      importedCount: updatedJob.importedCount,
    };
  }

  return { imported: true };
}

/**
 * Import a Letterboxd export from its diary/reviews/likes CSVs. Each unique
 * (name, year) is resolved against TMDB search once.
 */
async function importLetterboxdCsvs(
  userId: string,
  csvs: LetterboxdCsvs,
  jobId: string,
): Promise<ImportResult> {
  const likes = csvs.likes === undefined ? [] : parseLikedFilmsCsv(csvs.likes);
  const entries = mergeImport(
    csvs.diary === undefined ? [] : parseDiaryCsv(csvs.diary),
    csvs.reviews === undefined ? [] : parseReviewsCsv(csvs.reviews),
    likes,
  );
  const diaryResult = await importEntries(userId, entries);
  const diaryFilms = new Set(
    entries.map((entry) => filmKey(entry.name, entry.year)),
  );
  const likesResult = await importFilmStates(
    userId,
    likes
      .filter((entry) => !diaryFilms.has(filmKey(entry.name, entry.year)))
      .map((entry) => ({
        name: entry.name,
        year: entry.year,
        liked: true,
        kind: "liked",
      })),
  );

  const ratings =
    csvs.ratings === undefined ? [] : parseRatingsCsv(csvs.ratings);
  const watchlist =
    csvs.watchlist === undefined ? [] : parseWatchlistCsv(csvs.watchlist);

  const ratingsResult = await importFilmStates(
    userId,
    ratings.map((row) => ({
      name: row.name,
      year: row.year,
      rating: row.rating,
      kind: "rating",
    })),
  );
  const watchlistResult = await importFilmStates(
    userId,
    watchlist.map((row) => ({
      name: row.name,
      year: row.year,
      watchlisted: true,
      kind: "watchlist",
    })),
  );
  const listsResult = await importLists(userId, csvs.lists);

  const unmatchedByKey = new Map<string, UnmatchedEntry>();
  for (const entry of [
    ...diaryResult.unmatched,
    ...likesResult.unmatched,
    ...ratingsResult.unmatched,
    ...watchlistResult.unmatched,
    ...listsResult.unmatched,
  ]) {
    const key = unmatchedKey(entry);
    const existing = unmatchedByKey.get(key);
    if (existing === undefined) {
      unmatchedByKey.set(key, entry);
    } else if (
      existing.candidates.length === 0 &&
      entry.candidates.length > 0
    ) {
      existing.candidates = entry.candidates;
    }
  }

  const imported =
    diaryResult.imported +
    likesResult.applied +
    ratingsResult.applied +
    watchlistResult.applied +
    listsResult.applied;
  const unmatched = await persistUnmatched(jobId, [...unmatchedByKey.values()]);

  await db()
    .update(importJobs)
    .set({
      importedCount: imported,
      status: unmatched.length === 0 ? "complete" : "pending",
    })
    .where(eq(importJobs.id, jobId));

  return { imported, unmatched, jobId };
}

/** Import a full Letterboxd export zip (Settings → Data → Export your data). */
export async function importLetterboxdZip(
  userId: string,
  bytes: Uint8Array,
): Promise<ImportResult> {
  const csvs = extractLetterboxdCsvs(bytes);
  if (
    csvs.diary === undefined &&
    csvs.reviews === undefined &&
    csvs.ratings === undefined &&
    csvs.watchlist === undefined &&
    csvs.lists.length === 0
  ) {
    throw new Error(
      "That zip doesn't contain diary, reviews, ratings, watchlist, or lists. Is it a Letterboxd export?",
    );
  }

  const [job] = await db()
    .insert(importJobs)
    .values({ userId, status: "pending", importedCount: 0 })
    .returning();
  if (job === undefined) {
    throw new Error("Failed to create import job");
  }

  return importLetterboxdCsvs(userId, csvs, job.id);
}

const pillarboxdExportSchema = z.object({
  format: z.literal("pillarboxd-export"),
  version: z.literal(1),
  entries: z.array(
    z.object({
      film: z.object({
        tmdbId: z.number().int().positive(),
      }),
      watchedOn: z.string().nullable(),
      rating: z.number().int().min(1).max(10).nullable(),
      review: z.string().nullable(),
      liked: z.boolean(),
      rewatch: z.boolean(),
      containsSpoilers: z.boolean(),
      tags: z.array(z.string()),
    }),
  ),
});

/** Restore diary entries from a pillarboxd JSON export. */
export async function importPillarboxdJson(
  userId: string,
  raw: string,
): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const exportData = pillarboxdExportSchema.safeParse(parsed);
  if (!exportData.success) {
    throw new Error(
      "That JSON is not a pillarboxd export (format pillarboxd-export, version 1).",
    );
  }

  const entries: ResolvableEntry[] = exportData.data.entries.map((entry) => ({
    name: `TMDB ${String(entry.film.tmdbId)}`,
    year: null,
    watchedOn: entry.watchedOn,
    rating: entry.rating,
    review: entry.review,
    rewatch: entry.rewatch,
    tags: entry.tags,
    liked: entry.liked,
    containsSpoilers: entry.containsSpoilers,
    tmdbId: entry.film.tmdbId,
  }));

  return importEntries(userId, entries);
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
      signal: AbortSignal.timeout(LETTERBOXD_FETCH_TIMEOUT_MS),
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
