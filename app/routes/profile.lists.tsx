import { Link } from "react-router";
import { eq, sql } from "drizzle-orm";

import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { ProfileNav } from "~/components/profile-nav";
import { getSession } from "~/lib/auth/auth.server";
import { db } from "~/lib/db/client.server";
import { listEntries, lists } from "~/lib/db/schema";
import { getUserLists } from "~/lib/lists.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile.lists";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} · Lists | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const userLists = await getUserLists(profile.user.id);
  const isOwner = session?.user.id === profile.user.id;
  const visible = isOwner ? userLists : userLists.filter((list) => list.public);

  const countsByList = new Map<string, number>();
  if (visible.length > 0) {
    const rows = await db()
      .select({
        listId: listEntries.listId,
        count: sql<number>`count(*)::int`,
      })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(eq(lists.userId, profile.user.id))
      .groupBy(listEntries.listId);
    for (const row of rows) {
      countsByList.set(row.listId, row.count);
    }
  }

  return {
    user: viewerFromSession(session),
    profile: { username: profile.user.username, isOwner },
    counts: { ...profile.counts, lists: visible.length },
    lists: visible.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      ranked: list.ranked,
      public: list.public,
      filmCount: countsByList.get(list.id) ?? 0,
    })),
  };
}

export default function ProfileLists({ loaderData }: Route.ComponentProps) {
  const { user, profile, counts, lists: userLists } = loaderData;
  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <div className="gap-block flex flex-wrap items-baseline justify-between">
          <h1 className="font-heading text-xl">@{profile.username}</h1>
          {profile.isOwner && (
            <Link to="/lists/new" className={buttonStyles("primary")}>
              New list
            </Link>
          )}
        </div>
        <ProfileNav username={profile.username} counts={counts} />
        {userLists.length === 0 ? (
          <EmptyState
            action={
              profile.isOwner ? (
                <Link to="/lists/new" className={buttonStyles("primary")}>
                  Create a list
                </Link>
              ) : (
                <Link to="/films/search" className={buttonStyles("secondary")}>
                  Search films
                </Link>
              )
            }
          >
            {profile.isOwner
              ? "No lists yet. Create one to group films."
              : "No public lists."}
          </EmptyState>
        ) : (
          <ul className="flex max-w-[42rem] flex-col">
            {userLists.map((list) => (
              <li
                key={list.id}
                className="border-border gap-tight py-block flex flex-col border-b"
              >
                <Link
                  to={`/lists/${list.id}`}
                  className="hover:text-accent font-medium"
                >
                  {list.name}
                </Link>
                <p className="text-muted text-sm tabular-nums">
                  {String(list.filmCount)}{" "}
                  {list.filmCount === 1 ? "film" : "films"}
                  {!list.public && " · private"}
                </p>
                {list.description !== null && list.description !== "" && (
                  <p className="text-muted max-w-[70ch] text-sm">
                    {list.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </>
  );
}
