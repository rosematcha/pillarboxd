import { randomUUID } from "node:crypto";

import { and, asc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/lib/db/client.server";
import { user } from "~/lib/db/auth-schema";
import { films, listEntries, lists } from "~/lib/db/schema";
import { env } from "~/lib/env.server";

export type List = typeof lists.$inferSelect;
export type ListEntry = typeof listEntries.$inferSelect;

export const createListInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).nullable().optional(),
  ranked: z.boolean().optional(),
  public: z.boolean().optional(),
});

export type CreateListInput = z.infer<typeof createListInputSchema>;

export const updateListInputSchema = createListInputSchema.partial();

export type UpdateListInput = z.infer<typeof updateListInputSchema>;

export async function createList(
  userId: string,
  input: CreateListInput,
): Promise<List> {
  const id = randomUUID();
  const [list] = await db()
    .insert(lists)
    .values({
      id,
      userId,
      name: input.name,
      description: input.description ?? null,
      ranked: input.ranked ?? true,
      public: input.public ?? true,
      uri: `${env().APP_URL}/lists/${id}`,
    })
    .returning();
  if (list === undefined) {
    throw new Error("Failed to create list");
  }
  return list;
}

export async function updateList(
  userId: string,
  listId: string,
  input: UpdateListInput,
): Promise<List | null> {
  const patch: {
    name?: string;
    description?: string | null;
    ranked?: boolean;
    public?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (input.name !== undefined) {
    patch.name = input.name;
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.ranked !== undefined) {
    patch.ranked = input.ranked;
  }
  if (input.public !== undefined) {
    patch.public = input.public;
  }
  const [list] = await db()
    .update(lists)
    .set(patch)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .returning();
  return list ?? null;
}

export async function deleteList(
  userId: string,
  listId: string,
): Promise<boolean> {
  const deleted = await db()
    .delete(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .returning({ id: lists.id });
  return deleted.length > 0;
}

export async function getUserLists(userId: string): Promise<List[]> {
  return db()
    .select()
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(asc(lists.name));
}

export async function getListById(listId: string) {
  const [list] = await db()
    .select()
    .from(lists)
    .where(eq(lists.id, listId))
    .limit(1);
  if (list === undefined) {
    return null;
  }
  const entries = await db()
    .select({
      entry: listEntries,
      film: films,
    })
    .from(listEntries)
    .innerJoin(films, eq(listEntries.filmId, films.id))
    .where(eq(listEntries.listId, listId))
    .orderBy(asc(listEntries.position));
  return { list, entries };
}

export async function getPublicList(listId: string) {
  const result = await getListById(listId);
  if (result === null) {
    return null;
  }
  if (!result.list.public) {
    return null;
  }
  return result;
}

export async function getListsContainingFilm(
  filmId: string,
  options: { viewerUserId?: string | null; limit?: number } = {},
) {
  const limit = Math.min(24, Math.max(1, options.limit ?? 8));
  const viewerUserId = options.viewerUserId ?? null;
  return db()
    .select({
      id: lists.id,
      name: lists.name,
      ranked: lists.ranked,
      username: user.username,
    })
    .from(listEntries)
    .innerJoin(lists, eq(listEntries.listId, lists.id))
    .innerJoin(user, eq(lists.userId, user.id))
    .where(
      viewerUserId === null
        ? and(eq(listEntries.filmId, filmId), eq(lists.public, true))
        : and(
            eq(listEntries.filmId, filmId),
            or(eq(lists.public, true), eq(lists.userId, viewerUserId)),
          ),
    )
    .orderBy(asc(lists.name))
    .limit(limit);
}

export async function addFilmToList(
  userId: string,
  listId: string,
  filmId: string,
  notes: string | null = null,
): Promise<ListEntry | null> {
  const [list] = await db()
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .limit(1);
  if (list === undefined) {
    return null;
  }
  const [maxRow] = await db()
    .select({
      maxPosition: sql<number | null>`max(${listEntries.position})`,
    })
    .from(listEntries)
    .where(eq(listEntries.listId, listId));
  const position = (maxRow?.maxPosition ?? -1) + 1;
  const [entry] = await db()
    .insert(listEntries)
    .values({ listId, filmId, position, notes })
    .onConflictDoNothing()
    .returning();
  if (entry === undefined) {
    const [existing] = await db()
      .select()
      .from(listEntries)
      .where(
        and(eq(listEntries.listId, listId), eq(listEntries.filmId, filmId)),
      )
      .limit(1);
    return existing ?? null;
  }
  await db()
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, listId));
  return entry;
}

export async function removeFilmFromList(
  userId: string,
  listId: string,
  filmId: string,
): Promise<boolean> {
  const [list] = await db()
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .limit(1);
  if (list === undefined) {
    return false;
  }
  const deleted = await db()
    .delete(listEntries)
    .where(and(eq(listEntries.listId, listId), eq(listEntries.filmId, filmId)))
    .returning({ filmId: listEntries.filmId });
  if (deleted.length === 0) {
    return false;
  }
  const remaining = await db()
    .select()
    .from(listEntries)
    .where(eq(listEntries.listId, listId))
    .orderBy(asc(listEntries.position));
  for (const [index, entry] of remaining.entries()) {
    if (entry.position !== index) {
      await db()
        .update(listEntries)
        .set({ position: index })
        .where(
          and(
            eq(listEntries.listId, listId),
            eq(listEntries.filmId, entry.filmId),
          ),
        );
    }
  }
  await db()
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, listId));
  return true;
}

/** Reorder list entries to match the given film id order. */
export async function reorderList(
  userId: string,
  listId: string,
  filmIds: string[],
): Promise<boolean> {
  const [list] = await db()
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .limit(1);
  if (list === undefined) {
    return false;
  }
  const existing = await db()
    .select()
    .from(listEntries)
    .where(eq(listEntries.listId, listId));
  if (existing.length !== filmIds.length) {
    return false;
  }
  const existingIds = new Set(existing.map((entry) => entry.filmId));
  if (
    new Set(filmIds).size !== filmIds.length ||
    filmIds.some((id) => !existingIds.has(id))
  ) {
    return false;
  }
  for (const [index, filmId] of filmIds.entries()) {
    await db()
      .update(listEntries)
      .set({ position: index })
      .where(
        and(eq(listEntries.listId, listId), eq(listEntries.filmId, filmId)),
      );
  }
  await db()
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, listId));
  return true;
}
