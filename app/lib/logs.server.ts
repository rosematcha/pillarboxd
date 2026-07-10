import { randomUUID } from "node:crypto";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/lib/db/client.server";
import { films, logEntries, logEntryTags, tags } from "~/lib/db/schema";
import { env } from "~/lib/env.server";

export const logEntryInputSchema = z.object({
  filmId: z.uuid(),
  watchedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  review: z.string().trim().max(100_000).nullable(),
  liked: z.boolean(),
  rewatch: z.boolean(),
  containsSpoilers: z.boolean(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(80)).max(50),
});

export type LogEntryInput = z.infer<typeof logEntryInputSchema>;
export type LogEntry = typeof logEntries.$inferSelect;

async function attachTags(
  logEntryId: string,
  tagNames: string[],
): Promise<void> {
  if (tagNames.length === 0) {
    return;
  }
  const names = [...new Set(tagNames)];
  await db()
    .insert(tags)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing();
  const tagRows = await db()
    .select()
    .from(tags)
    .where(inArray(tags.name, names));
  await db()
    .insert(logEntryTags)
    .values(tagRows.map((tag) => ({ logEntryId, tagId: tag.id })))
    .onConflictDoNothing();
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
  const [entry] = await db()
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
  if (entry === undefined) {
    throw new Error("Failed to insert log entry");
  }
  await attachTags(entry.id, input.tags);
  return entry;
}

export interface DiaryEntry {
  entry: LogEntry;
  film: typeof films.$inferSelect;
  tags: string[];
}

export async function getUserDiary(
  userId: string,
  limit = 100,
): Promise<DiaryEntry[]> {
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
    .where(eq(logEntries.userId, userId))
    .groupBy(logEntries.id, films.id)
    .orderBy(desc(logEntries.watchedOn), desc(logEntries.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    entry: row.entry,
    film: row.film,
    tags: row.tagNames,
  }));
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
    .orderBy(desc(logEntries.watchedOn), desc(logEntries.createdAt));
}
