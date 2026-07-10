import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db, type DbTransaction } from "~/lib/db/client.server";
import { user } from "~/lib/db/auth-schema";
import {
  filmStates,
  films,
  logEntries,
  logEntryTags,
  tags,
} from "~/lib/db/schema";
import { env } from "~/lib/env.server";
import { setFilmState } from "~/lib/film-state.server";
import { logEntryInputSchema, type LogEntryInput } from "~/lib/log-entry";

export { logEntryInputSchema };
export type { LogEntryInput };
export type LogEntry = typeof logEntries.$inferSelect;

async function attachTags(
  tx: DbTransaction,
  logEntryId: string,
  tagNames: string[],
): Promise<void> {
  if (tagNames.length === 0) {
    return;
  }
  const names = [...new Set(tagNames)];
  await tx
    .insert(tags)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing();
  const tagRows = await tx.select().from(tags).where(inArray(tags.name, names));
  await tx
    .insert(logEntryTags)
    .values(tagRows.map((tag) => ({ logEntryId, tagId: tag.id })))
    .onConflictDoNothing();
}

async function replaceTags(
  tx: DbTransaction,
  logEntryId: string,
  tagNames: string[],
): Promise<void> {
  await tx.delete(logEntryTags).where(eq(logEntryTags.logEntryId, logEntryId));
  await attachTags(tx, logEntryId, tagNames);
}

async function syncFilmStateFromEntry(
  userId: string,
  input: Pick<LogEntryInput, "filmId" | "rating" | "liked">,
): Promise<void> {
  await setFilmState(userId, input.filmId, {
    watched: true,
    ...(input.rating !== null ? { rating: input.rating } : {}),
    ...(input.liked ? { liked: true } : {}),
  });
}

/**
 * Create a diary entry. The entry's ActivityPub object URI is minted here so
 * every entry is federation-addressable from the moment it exists.
 */
export async function createLogEntry(
  userId: string,
  input: LogEntryInput,
): Promise<LogEntry> {
  const id = randomUUID();
  const entry = await db().transaction(async (tx) => {
    const [created] = await tx
      .insert(logEntries)
      .values({
        id,
        uri: `${env().APP_URL}/entries/${id}`,
        userId,
        filmId: input.filmId,
        watchedOn: input.watchedOn,
        rating: input.rating,
        review: input.review,
        liked: input.liked,
        rewatch: input.rewatch,
        containsSpoilers: input.containsSpoilers,
      })
      .returning();
    if (created === undefined) {
      throw new Error("Failed to insert log entry");
    }
    await attachTags(tx, created.id, input.tags);
    return created;
  });
  await syncFilmStateFromEntry(userId, input);
  return entry;
}

export interface LogEntryDetail {
  entry: LogEntry;
  film: typeof films.$inferSelect;
  username: string;
  displayName: string;
  tags: string[];
}

export async function getLogEntryDetail(
  id: string,
): Promise<LogEntryDetail | null> {
  const [row] = await db()
    .select({
      entry: logEntries,
      film: films,
      username: user.username,
      displayName: user.name,
      tagNames: sql<string[]>`coalesce(
        array_agg(${tags.name}) filter (where ${tags.name} is not null),
        '{}'
      )`,
    })
    .from(logEntries)
    .innerJoin(films, eq(logEntries.filmId, films.id))
    .innerJoin(user, eq(logEntries.userId, user.id))
    .leftJoin(logEntryTags, eq(logEntryTags.logEntryId, logEntries.id))
    .leftJoin(tags, eq(tags.id, logEntryTags.tagId))
    .where(eq(logEntries.id, id))
    .groupBy(logEntries.id, films.id, user.id)
    .limit(1);
  if (typeof row?.username !== "string") {
    return null;
  }
  return {
    entry: row.entry,
    film: row.film,
    username: row.username,
    displayName: row.displayName,
    tags: row.tagNames,
  };
}

export async function updateLogEntry(
  userId: string,
  id: string,
  input: LogEntryInput,
): Promise<LogEntry | null> {
  const entry = await db().transaction(async (tx) => {
    const [updated] = await tx
      .update(logEntries)
      .set({
        filmId: input.filmId,
        watchedOn: input.watchedOn,
        rating: input.rating,
        review: input.review,
        liked: input.liked,
        rewatch: input.rewatch,
        containsSpoilers: input.containsSpoilers,
        updatedAt: new Date(),
      })
      .where(and(eq(logEntries.id, id), eq(logEntries.userId, userId)))
      .returning();
    if (updated === undefined) {
      return null;
    }
    await replaceTags(tx, updated.id, input.tags);
    return updated;
  });
  if (entry === null) {
    return null;
  }
  await syncFilmStateFromEntry(userId, input);
  return entry;
}

export async function deleteLogEntry(
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db()
    .delete(logEntries)
    .where(and(eq(logEntries.id, id), eq(logEntries.userId, userId)))
    .returning({ id: logEntries.id });
  return deleted.length > 0;
}

/**
 * Keys (`filmId|watchedOn`) of a user's existing entries, so an import can
 * skip re-adding the same watch — makes imports idempotent and safe to run
 * from more than one source (e.g. RSS then the export zip).
 */
export async function getExistingEntryKeys(
  userId: string,
): Promise<Set<string>> {
  const rows = await db()
    .select({ filmId: logEntries.filmId, watchedOn: logEntries.watchedOn })
    .from(logEntries)
    .where(eq(logEntries.userId, userId));
  return new Set(rows.map((row) => `${row.filmId}|${row.watchedOn ?? ""}`));
}

export interface DiaryEntry {
  entry: LogEntry;
  film: typeof films.$inferSelect;
  tags: string[];
}

interface DiaryCursor {
  watchedOn: string | null;
  createdAt: string;
  id: string;
}

function encodeDiaryCursor(cursor: DiaryCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeDiaryCursor(value: string | null): DiaryCursor | null {
  if (value === null || value === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as { watchedOn?: string | null; createdAt?: string; id?: string };
    if (
      typeof parsed.id !== "string" ||
      !z.uuid().safeParse(parsed.id).success ||
      typeof parsed.createdAt !== "string" ||
      !z.iso.datetime({ offset: true }).safeParse(parsed.createdAt).success ||
      (parsed.watchedOn !== null &&
        parsed.watchedOn !== undefined &&
        (typeof parsed.watchedOn !== "string" ||
          !z.iso.date().safeParse(parsed.watchedOn).success))
    ) {
      return null;
    }
    return {
      watchedOn: typeof parsed.watchedOn === "string" ? parsed.watchedOn : null,
      createdAt: parsed.createdAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

function diaryCursorSql(userId: string, cursor: DiaryCursor) {
  return sql`${logEntries.userId} = ${userId} and (
    ${logEntries.watchedOn} < ${cursor.watchedOn}
    or (${logEntries.watchedOn} = ${cursor.watchedOn} and ${logEntries.createdAt} < ${cursor.createdAt})
    or (${logEntries.watchedOn} = ${cursor.watchedOn} and ${logEntries.createdAt} = ${cursor.createdAt} and ${logEntries.id} < ${cursor.id})
    or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is not null)
    or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is null and ${logEntries.createdAt} < ${cursor.createdAt})
    or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is null and ${logEntries.createdAt} = ${cursor.createdAt} and ${logEntries.id} < ${cursor.id})
  )`;
}

export async function getUserDiary(
  userId: string,
  options: {
    limit?: number;
    cursor?: string | null;
    year?: number | null;
    minRating?: number | null;
    hasReview?: boolean;
  } = {},
): Promise<{ entries: DiaryEntry[]; nextCursor: string | null }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const cursor = decodeDiaryCursor(options.cursor ?? null);
  const filters = [eq(logEntries.userId, userId)];
  if (options.year !== null && options.year !== undefined) {
    filters.push(
      sql`extract(year from ${logEntries.watchedOn}) = ${options.year}`,
    );
  }
  if (options.minRating !== null && options.minRating !== undefined) {
    filters.push(
      sql`${logEntries.rating} is not null and ${logEntries.rating} >= ${options.minRating}`,
    );
  }
  if (options.hasReview === true) {
    filters.push(
      sql`${logEntries.review} is not null and btrim(${logEntries.review}) <> ''`,
    );
  }
  const baseWhere = and(...filters);
  const rows = await db()
    .select({
      entry: logEntries,
      film: films,
      tagNames: sql<string[]>`coalesce(
        array_agg(${tags.name}) filter (where ${tags.name} is not null),
        '{}'
      )`,
    })
    .from(logEntries)
    .innerJoin(films, eq(logEntries.filmId, films.id))
    .leftJoin(logEntryTags, eq(logEntryTags.logEntryId, logEntries.id))
    .leftJoin(tags, eq(tags.id, logEntryTags.tagId))
    .where(
      cursor === null
        ? baseWhere
        : and(baseWhere, diaryCursorSql(userId, cursor)),
    )
    .groupBy(logEntries.id, films.id)
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
      desc(logEntries.id),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    entries: page.map((row) => ({
      entry: row.entry,
      film: row.film,
      tags: row.tagNames,
    })),
    nextCursor:
      hasMore && last !== undefined
        ? encodeDiaryCursor({
            watchedOn: last.entry.watchedOn,
            createdAt: last.entry.createdAt.toISOString(),
            id: last.entry.id,
          })
        : null,
  };
}

/** Load every diary entry for export. Paginates internally. */
export async function getAllUserDiary(userId: string): Promise<DiaryEntry[]> {
  const all: DiaryEntry[] = [];
  let cursor: string | null = null;
  do {
    const page = await getUserDiary(userId, { limit: 100, cursor });
    all.push(...page.entries);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return all;
}

export async function getUserReviews(
  userId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<{ entries: DiaryEntry[]; nextCursor: string | null }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const cursor = decodeDiaryCursor(options.cursor ?? null);
  const reviewFilter = sql`${logEntries.userId} = ${userId}
    and ${logEntries.review} is not null
    and btrim(${logEntries.review}) <> ''`;
  const rows = await db()
    .select({
      entry: logEntries,
      film: films,
      tagNames: sql<string[]>`coalesce(
        array_agg(${tags.name}) filter (where ${tags.name} is not null),
        '{}'
      )`,
    })
    .from(logEntries)
    .innerJoin(films, eq(logEntries.filmId, films.id))
    .leftJoin(logEntryTags, eq(logEntryTags.logEntryId, logEntries.id))
    .leftJoin(tags, eq(tags.id, logEntryTags.tagId))
    .where(
      cursor === null
        ? reviewFilter
        : sql`${reviewFilter} and (
            ${logEntries.watchedOn} < ${cursor.watchedOn}
            or (${logEntries.watchedOn} = ${cursor.watchedOn} and ${logEntries.createdAt} < ${cursor.createdAt})
            or (${logEntries.watchedOn} = ${cursor.watchedOn} and ${logEntries.createdAt} = ${cursor.createdAt} and ${logEntries.id} < ${cursor.id})
            or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is not null)
            or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is null and ${logEntries.createdAt} < ${cursor.createdAt})
            or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is null and ${logEntries.createdAt} = ${cursor.createdAt} and ${logEntries.id} < ${cursor.id})
          )`,
    )
    .groupBy(logEntries.id, films.id)
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
      desc(logEntries.id),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    entries: page.map((row) => ({
      entry: row.entry,
      film: row.film,
      tags: row.tagNames,
    })),
    nextCursor:
      hasMore && last !== undefined
        ? encodeDiaryCursor({
            watchedOn: last.entry.watchedOn,
            createdAt: last.entry.createdAt.toISOString(),
            id: last.entry.id,
          })
        : null,
  };
}

export async function getFilmReviews(filmId: string, limit = 20) {
  const safeLimit = Math.min(50, Math.max(1, limit));
  return db()
    .select({
      id: logEntries.id,
      review: logEntries.review,
      rating: logEntries.rating,
      containsSpoilers: logEntries.containsSpoilers,
      watchedOn: logEntries.watchedOn,
      createdAt: logEntries.createdAt,
      liked: logEntries.liked,
      username: user.username,
    })
    .from(logEntries)
    .innerJoin(user, eq(logEntries.userId, user.id))
    .where(
      sql`${logEntries.filmId} = ${filmId}
        and ${user.username} is not null
        and ${logEntries.review} is not null
        and btrim(${logEntries.review}) <> ''`,
    )
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
      desc(logEntries.id),
    )
    .limit(safeLimit);
}

export async function getFilmEntriesForUser(
  userId: string,
  filmId: string,
): Promise<LogEntry[]> {
  return db()
    .select()
    .from(logEntries)
    .where(
      sql`${logEntries.userId} = ${userId} and ${logEntries.filmId} = ${filmId}`,
    )
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
    );
}

type ActivityCursor = DiaryCursor;

function encodeActivityCursor(cursor: ActivityCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeActivityCursor(value: string | null): ActivityCursor | null {
  return decodeDiaryCursor(value);
}

export async function getRecentActivity(
  options: { limit?: number; cursor?: string | null } = {},
) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const cursor = decodeActivityCursor(options.cursor ?? null);
  const rows = await db()
    .select({
      id: logEntries.id,
      createdAt: logEntries.createdAt,
      watchedOn: logEntries.watchedOn,
      rating: logEntries.rating,
      review: logEntries.review,
      username: user.username,
      tmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      posterPath: films.posterPath,
    })
    .from(logEntries)
    .innerJoin(user, eq(logEntries.userId, user.id))
    .innerJoin(films, eq(logEntries.filmId, films.id))
    .where(
      cursor === null
        ? sql`${user.username} is not null`
        : sql`${user.username} is not null and (
            ${logEntries.watchedOn} < ${cursor.watchedOn}
            or (${logEntries.watchedOn} = ${cursor.watchedOn} and ${logEntries.createdAt} < ${cursor.createdAt})
            or (${logEntries.watchedOn} = ${cursor.watchedOn} and ${logEntries.createdAt} = ${cursor.createdAt} and ${logEntries.id} < ${cursor.id})
            or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is not null)
            or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is null and ${logEntries.createdAt} < ${cursor.createdAt})
            or (${logEntries.watchedOn} is null and ${cursor.watchedOn} is null and ${logEntries.createdAt} = ${cursor.createdAt} and ${logEntries.id} < ${cursor.id})
          )`,
    )
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
      desc(logEntries.id),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    items: page,
    nextCursor:
      hasMore && last !== undefined
        ? encodeActivityCursor({
            watchedOn: last.watchedOn,
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null,
  };
}

export async function getRecentReviews(limit = 4) {
  const safeLimit = Math.min(8, Math.max(1, limit));
  return db()
    .select({
      id: logEntries.id,
      review: logEntries.review,
      rating: logEntries.rating,
      containsSpoilers: logEntries.containsSpoilers,
      watchedOn: logEntries.watchedOn,
      createdAt: logEntries.createdAt,
      username: user.username,
      tmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      posterPath: films.posterPath,
    })
    .from(logEntries)
    .innerJoin(user, eq(logEntries.userId, user.id))
    .innerJoin(films, eq(logEntries.filmId, films.id))
    .where(
      sql`${user.username} is not null
        and ${logEntries.review} is not null
        and btrim(${logEntries.review}) <> ''`,
    )
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
      desc(logEntries.id),
    )
    .limit(safeLimit);
}

export async function getRecentlyWatchedFilms(limit = 12) {
  const safeLimit = Math.min(18, Math.max(1, limit));
  const recent = await getRecentActivity({ limit: 60 });
  const seen = new Set<number>();
  const results: {
    tmdbId: number;
    title: string;
    year: number | null;
    posterPath: string | null;
    watchedOn: string | null;
  }[] = [];
  for (const item of recent.items) {
    if (seen.has(item.tmdbId)) {
      continue;
    }
    seen.add(item.tmdbId);
    results.push({
      tmdbId: item.tmdbId,
      title: item.filmTitle,
      year: item.filmYear,
      posterPath: item.posterPath,
      watchedOn: item.watchedOn,
    });
    if (results.length >= safeLimit) {
      break;
    }
  }
  return results;
}

export async function getFilmInstanceActivity(filmId: string, limit = 12) {
  const safeLimit = Math.min(24, Math.max(1, limit));
  const rows = await db()
    .select({
      id: logEntries.id,
      username: user.username,
      rating: logEntries.rating,
      watchedOn: logEntries.watchedOn,
      review: logEntries.review,
      liked: logEntries.liked,
      containsSpoilers: logEntries.containsSpoilers,
    })
    .from(logEntries)
    .innerJoin(user, eq(logEntries.userId, user.id))
    .where(
      sql`${logEntries.filmId} = ${filmId} and ${user.username} is not null`,
    )
    .orderBy(
      sql`${logEntries.watchedOn} desc nulls last`,
      desc(logEntries.createdAt),
    )
    .limit(safeLimit);
  const loggedViewers = await db()
    .selectDistinct({ userId: logEntries.userId })
    .from(logEntries)
    .where(eq(logEntries.filmId, filmId));
  const stateViewers = await db()
    .select({ userId: filmStates.userId })
    .from(filmStates)
    .where(and(eq(filmStates.filmId, filmId), eq(filmStates.watched, true)));
  const avgRow = await db()
    .select({
      average: sql<number | null>`avg(${filmStates.rating})::float`,
      ratedCount: sql<number>`count(${filmStates.rating})::int`,
    })
    .from(filmStates)
    .where(
      sql`${filmStates.filmId} = ${filmId} and ${filmStates.rating} is not null`,
    );
  const histogramRows = await db()
    .select({
      rating: filmStates.rating,
      count: sql<number>`count(*)::int`,
    })
    .from(filmStates)
    .where(
      sql`${filmStates.filmId} = ${filmId} and ${filmStates.rating} is not null`,
    )
    .groupBy(filmStates.rating)
    .orderBy(filmStates.rating);
  const histogram = Array.from({ length: 10 }, (_, index) => {
    const rating = index + 1;
    return {
      rating,
      count: histogramRows.find((row) => row.rating === rating)?.count ?? 0,
    };
  });
  return {
    rows,
    total: new Set([
      ...loggedViewers.map((row) => row.userId),
      ...stateViewers.map((row) => row.userId),
    ]).size,
    averageRating: avgRow[0]?.average ?? null,
    ratedCount: avgRow[0]?.ratedCount ?? 0,
    histogram,
  };
}
