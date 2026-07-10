import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "~/lib/db/client.server";
import { filmStates, films, logEntries } from "~/lib/db/schema";

export type FilmState = typeof filmStates.$inferSelect;

export async function getFilmState(
  userId: string,
  filmId: string,
): Promise<FilmState | null> {
  const [row] = await db()
    .select()
    .from(filmStates)
    .where(and(eq(filmStates.userId, userId), eq(filmStates.filmId, filmId)))
    .limit(1);
  return row ?? null;
}

export async function setFilmState(
  userId: string,
  filmId: string,
  partial: {
    watched?: boolean;
    liked?: boolean;
    watchlisted?: boolean;
    rating?: number | null;
  },
): Promise<FilmState> {
  const rated = partial.rating !== undefined && partial.rating !== null;
  const clearsWatchlist =
    partial.watched === true || partial.liked === true || rated;

  const patch: {
    watched?: boolean;
    liked?: boolean;
    watchlisted?: boolean;
    rating?: number | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };
  if (partial.watched !== undefined) {
    patch.watched = partial.watched;
  }
  if (partial.liked !== undefined) {
    patch.liked = partial.liked;
  }
  if (partial.rating !== undefined) {
    patch.rating = partial.rating;
  }
  if (rated) {
    patch.watched = true;
  }
  if (partial.liked === true) {
    patch.watched = true;
  }
  if (clearsWatchlist) {
    patch.watchlisted = false;
  } else if (partial.watchlisted !== undefined) {
    patch.watchlisted = partial.watchlisted;
  }

  const [row] = await db()
    .insert(filmStates)
    .values({
      userId,
      filmId,
      watched: patch.watched ?? false,
      liked: patch.liked ?? false,
      watchlisted: patch.watchlisted ?? false,
      rating: patch.rating ?? null,
    })
    .onConflictDoUpdate({
      target: [filmStates.userId, filmStates.filmId],
      set: patch,
    })
    .returning();
  if (row === undefined) {
    throw new Error("Failed to upsert film state");
  }
  return row;
}

export async function getUserWatchlist(userId: string) {
  return db()
    .select({
      state: filmStates,
      film: films,
    })
    .from(filmStates)
    .innerJoin(films, eq(filmStates.filmId, films.id))
    .where(and(eq(filmStates.userId, userId), eq(filmStates.watchlisted, true)))
    .orderBy(desc(filmStates.updatedAt));
}

export async function getUserLikedFilms(userId: string) {
  return db()
    .select({
      state: filmStates,
      film: films,
    })
    .from(filmStates)
    .innerJoin(films, eq(filmStates.filmId, films.id))
    .where(and(eq(filmStates.userId, userId), eq(filmStates.liked, true)))
    .orderBy(desc(filmStates.updatedAt));
}

/**
 * Films the user has marked watched or logged at least once, with state.
 */
export async function getUserFilms(userId: string) {
  const logged = await db()
    .selectDistinct({ filmId: logEntries.filmId })
    .from(logEntries)
    .where(eq(logEntries.userId, userId));
  const loggedIds = logged.map((row) => row.filmId);

  return db()
    .select({
      state: filmStates,
      film: films,
    })
    .from(films)
    .leftJoin(
      filmStates,
      and(eq(filmStates.filmId, films.id), eq(filmStates.userId, userId)),
    )
    .where(
      or(
        and(eq(filmStates.userId, userId), eq(filmStates.watched, true)),
        loggedIds.length > 0 ? inArray(films.id, loggedIds) : sql`false`,
      ),
    )
    .orderBy(desc(sql`coalesce(${filmStates.updatedAt}, ${films.fetchedAt})`));
}
