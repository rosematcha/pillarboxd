import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/lib/db/client.server";
import { user } from "~/lib/db/auth-schema";
import { films, follows, logEntries } from "~/lib/db/schema";

export type Follow = typeof follows.$inferSelect;

export async function follow(
  followerId: string,
  followingId: string,
): Promise<Follow | null> {
  if (followerId === followingId) {
    return null;
  }
  const [row] = await db()
    .insert(follows)
    .values({ followerId, followingId })
    .onConflictDoNothing()
    .returning();
  if (row !== undefined) {
    return row;
  }
  const [existing] = await db()
    .select()
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    )
    .limit(1);
  return existing ?? null;
}

export async function unfollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const deleted = await db()
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    )
    .returning({ followerId: follows.followerId });
  return deleted.length > 0;
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const [row] = await db()
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function getFollowers(userId: string) {
  return db()
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(user, eq(follows.followerId, user.id))
    .where(eq(follows.followingId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function getFollowing(userId: string) {
  return db()
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(user, eq(follows.followingId, user.id))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
}

function encodeActivityCursor(cursor: {
  watchedOn: string | null;
  createdAt: string;
  id: string;
}): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeActivityCursor(
  value: string | null,
): { watchedOn: string | null; createdAt: string; id: string } | null {
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

/** Recent diary activity from accounts the user follows. */
export async function getFollowingActivity(
  userId: string,
  options: { limit?: number; cursor?: string | null } = {},
) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const cursor = decodeActivityCursor(options.cursor ?? null);
  const followingIds = db()
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const rows = await db()
    .select({
      id: logEntries.id,
      createdAt: logEntries.createdAt,
      watchedOn: logEntries.watchedOn,
      rating: logEntries.rating,
      review: logEntries.review,
      liked: logEntries.liked,
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
        ? sql`${logEntries.userId} in ${followingIds} and ${user.username} is not null`
        : sql`${logEntries.userId} in ${followingIds} and ${user.username} is not null and (
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
