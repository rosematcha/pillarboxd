import { eq } from "drizzle-orm";
import { Link, data } from "react-router";

import { buttonStyles } from "~/components/button";
import { DiaryTable } from "~/components/diary-table";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { getSession } from "~/lib/auth/auth.server";
import { user } from "~/lib/db/auth-schema";
import { db } from "~/lib/db/client.server";
import { getUserDiary } from "~/lib/logs.server";
import type { Route } from "./+types/profile";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const viewerUsername = session?.user.username;
  const [profileUser] = await db()
    .select({ id: user.id, username: user.username })
    .from(user)
    .where(eq(user.username, params.username))
    .limit(1);
  const profileUsername = profileUser?.username;
  if (
    profileUser === undefined ||
    profileUsername === null ||
    profileUsername === undefined
  ) {
    throw data("Not found", { status: 404 });
  }
  const diary = await getUserDiary(profileUser.id);
  return {
    user:
      viewerUsername === null || viewerUsername === undefined
        ? null
        : { username: viewerUsername },
    profile: { username: profileUsername },
    diary: diary.map(({ entry, film, tags }) => ({
      id: entry.id,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      review: entry.review,
      liked: entry.liked,
      rewatch: entry.rewatch,
      tags,
      film: {
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterPath: film.posterPath,
      },
    })),
  };
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="gap-step px-block py-step mx-auto flex max-w-[64rem] flex-col sm:py-12">
        <header className="gap-tight border-border pb-section flex flex-col border-b">
          <h1 className="font-heading text-xl">
            @{loaderData.profile.username}
          </h1>
          <p className="text-muted text-sm">
            {String(loaderData.diary.length)}{" "}
            {loaderData.diary.length === 1 ? "entry" : "entries"} in the diary
          </p>
        </header>
        <h2 className="font-heading text-lg">Diary</h2>
        {loaderData.diary.length === 0 ? (
          <EmptyState
            action={
              <Link to="/films/search" className={buttonStyles("primary")}>
                Find a film
              </Link>
            }
          >
            This diary is empty. Search for a film to make the first entry.
          </EmptyState>
        ) : (
          <DiaryTable entries={loaderData.diary} />
        )}
      </main>
    </>
  );
}
