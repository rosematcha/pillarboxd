import { eq } from "drizzle-orm";
import { Link, data } from "react-router";

import { Nav } from "~/components/nav";
import { getSession } from "~/lib/auth/auth.server";
import { user } from "~/lib/db/auth-schema";
import { db } from "~/lib/db/client.server";
import { ratingToStars } from "~/lib/letterboxd";
import { getUserDiary } from "~/lib/logs.server";
import type { Route } from "./+types/profile";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} — pillarboxd` }];
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">@{loaderData.profile.username}</h1>
        <h2 className="mt-8 text-lg font-semibold">Diary</h2>
        {loaderData.diary.length === 0 ? (
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Nothing logged yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {loaderData.diary.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 border-b border-gray-200 pb-4 dark:border-gray-800"
              >
                {item.film.posterPath !== null && (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${item.film.posterPath}`}
                    alt=""
                    width={46}
                    className="self-start rounded"
                  />
                )}
                <div className="text-sm">
                  <Link
                    to={`/film/${String(item.film.tmdbId)}`}
                    className="font-semibold underline"
                  >
                    {item.film.title}
                    {item.film.year !== null && ` (${String(item.film.year)})`}
                  </Link>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {item.watchedOn ?? "No date"}
                    {item.rating !== null &&
                      ` · ${String(ratingToStars(item.rating))} ★`}
                    {item.liked && " · ♥"}
                    {item.rewatch && " · rewatch"}
                  </p>
                  {item.review !== null && (
                    <p className="mt-2 whitespace-pre-wrap">{item.review}</p>
                  )}
                  {item.tags.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {item.tags.map((tag) => `#${tag}`).join(" ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
