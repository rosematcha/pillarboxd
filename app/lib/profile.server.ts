import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "~/lib/db/client.server";
import { user } from "~/lib/db/auth-schema";
import {
  filmStates,
  films,
  follows,
  lists,
  logEntries,
  profileFavorites,
  userProfiles,
} from "~/lib/db/schema";

export async function getFavorites(userId: string) {
  return db()
    .select({
      position: profileFavorites.position,
      film: films,
    })
    .from(profileFavorites)
    .innerJoin(films, eq(profileFavorites.filmId, films.id))
    .where(eq(profileFavorites.userId, userId))
    .orderBy(asc(profileFavorites.position));
}

export async function getUserBio(userId: string): Promise<string | null> {
  const [row] = await db()
    .select({ bio: userProfiles.bio })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return row?.bio ?? null;
}

export async function setUserBio(
  userId: string,
  bio: string | null,
): Promise<void> {
  await db()
    .insert(userProfiles)
    .values({ userId, bio, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { bio, updatedAt: new Date() },
    });
}

/** Replace the user's favorite films (max 4). Positions are 0–3 in order. */
export async function setFavorites(
  userId: string,
  filmIds: string[],
): Promise<void> {
  const ids = filmIds.slice(0, 4);
  await db().transaction(async (tx) => {
    await tx
      .delete(profileFavorites)
      .where(eq(profileFavorites.userId, userId));
    if (ids.length > 0) {
      await tx.insert(profileFavorites).values(
        ids.map((filmId, position) => ({
          userId,
          filmId,
          position,
        })),
      );
    }
  });
}

export async function getProfile(username: string) {
  const [profileUser] = await db()
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (profileUser === undefined) {
    return null;
  }

  const userId = profileUser.id;
  const watchedStateFilms = await db()
    .select({ filmId: filmStates.filmId })
    .from(filmStates)
    .where(and(eq(filmStates.userId, userId), eq(filmStates.watched, true)));
  const loggedFilms = await db()
    .selectDistinct({ filmId: logEntries.filmId })
    .from(logEntries)
    .where(eq(logEntries.userId, userId));
  const [reviewsRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(logEntries)
    .where(
      sql`${logEntries.userId} = ${userId}
        and ${logEntries.review} is not null
        and btrim(${logEntries.review}) <> ''`,
    );
  const [listsRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.public, true)));
  const [followersRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, userId));
  const [followingRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followerId, userId));
  const [watchlistRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(filmStates)
    .where(
      and(eq(filmStates.userId, userId), eq(filmStates.watchlisted, true)),
    );
  const [likedRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(filmStates)
    .where(and(eq(filmStates.userId, userId), eq(filmStates.liked, true)));
  const [diaryRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(logEntries)
    .where(eq(logEntries.userId, userId));

  const favorites = await getFavorites(userId);
  const bio = await getUserBio(userId);

  return {
    user: profileUser,
    bio,
    favorites,
    counts: {
      watched: new Set([
        ...watchedStateFilms.map((row) => row.filmId),
        ...loggedFilms.map((row) => row.filmId),
      ]).size,
      films: loggedFilms.length,
      diary: diaryRow?.count ?? 0,
      reviews: reviewsRow?.count ?? 0,
      lists: listsRow?.count ?? 0,
      followers: followersRow?.count ?? 0,
      following: followingRow?.count ?? 0,
      watchlist: watchlistRow?.count ?? 0,
      liked: likedRow?.count ?? 0,
    },
  };
}
