import { Link, data } from "react-router";
import { eq } from "drizzle-orm";

import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { getSession } from "~/lib/auth/auth.server";
import { user } from "~/lib/db/auth-schema";
import { db } from "~/lib/db/client.server";
import { getListById, getPublicList } from "~/lib/lists.server";
import { viewerFromSession } from "~/lib/profile-route.server";
import type { Route } from "./+types/list";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `${loaderData.list.name} | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const owned = await getListById(params.listId);
  const isOwner = owned !== null && session?.user.id === owned.list.userId;
  const result = isOwner ? owned : await getPublicList(params.listId);
  if (result === null) {
    throw data("Not found", { status: 404 });
  }
  const [owner] = await db()
    .select({ username: user.username, name: user.name })
    .from(user)
    .where(eq(user.id, result.list.userId))
    .limit(1);
  if (typeof owner?.username !== "string") {
    throw data("Not found", { status: 404 });
  }
  return {
    user: viewerFromSession(session),
    isOwner,
    list: {
      id: result.list.id,
      name: result.list.name,
      description: result.list.description,
      ranked: result.list.ranked,
      public: result.list.public,
    },
    owner: { username: owner.username, name: owner.name },
    entries: result.entries.map(({ entry, film }, index) => ({
      position: entry.position,
      rank: index + 1,
      notes: entry.notes,
      film: {
        id: film.id,
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterPath: film.posterPath,
      },
    })),
  };
}

export default function ListPage({ loaderData }: Route.ComponentProps) {
  const { user, list, owner, entries, isOwner } = loaderData;
  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <header className="gap-block flex max-w-[42rem] flex-col">
          <div className="gap-tight flex flex-col">
            <h1 className="font-heading text-xl">{list.name}</h1>
            <p className="text-muted text-sm">
              A list by{" "}
              <Link to={`/u/${owner.username}`} className="text-accent">
                @{owner.username}
              </Link>
              {!list.public && " · private"}
            </p>
            {list.description !== null && list.description !== "" && (
              <p className="text-muted max-w-[70ch] text-sm leading-relaxed">
                {list.description}
              </p>
            )}
          </div>
          {isOwner && (
            <Link
              to={`/lists/${list.id}/edit`}
              className={buttonStyles("secondary", "self-start")}
            >
              Edit list
            </Link>
          )}
        </header>

        {entries.length === 0 ? (
          <EmptyState
            action={
              isOwner ? (
                <Link
                  to={`/lists/${list.id}/edit`}
                  className={buttonStyles("primary")}
                >
                  Add films
                </Link>
              ) : (
                <Link
                  to={`/u/${owner.username}/lists`}
                  className={buttonStyles("secondary")}
                >
                  More lists
                </Link>
              )
            }
          >
            This list has no films yet.
          </EmptyState>
        ) : (
          <ol className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {entries.map((item) => (
              <li key={item.film.id} className="gap-tight flex flex-col">
                {list.ranked && (
                  <span className="text-faint text-xs tabular-nums">
                    {String(item.rank)}
                  </span>
                )}
                <PosterTile
                  to={`/film/${String(item.film.tmdbId)}`}
                  title={item.film.title}
                  year={item.film.year}
                  posterUrl={
                    item.film.posterPath === null
                      ? null
                      : `https://image.tmdb.org/t/p/w342${item.film.posterPath}`
                  }
                />
              </li>
            ))}
          </ol>
        )}
      </PageShell>
    </>
  );
}
