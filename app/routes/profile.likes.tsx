import { Link } from "react-router";

import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { ProfileNav } from "~/components/profile-nav";
import { getSession } from "~/lib/auth/auth.server";
import { getUserLikedFilms } from "~/lib/film-state.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile.likes";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} · Likes | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const liked = await getUserLikedFilms(profile.user.id);
  return {
    user: viewerFromSession(session),
    profile: { username: profile.user.username },
    counts: profile.counts,
    films: liked.map(({ film }) => ({
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
    })),
  };
}

export default function ProfileLikes({ loaderData }: Route.ComponentProps) {
  const { user, profile, counts, films } = loaderData;
  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <h1 className="font-heading text-xl">@{profile.username}</h1>
        <ProfileNav username={profile.username} counts={counts} />
        {films.length === 0 ? (
          <EmptyState
            action={
              <Link to="/films/search" className={buttonStyles("primary")}>
                Find a film
              </Link>
            }
          >
            No liked films yet.
          </EmptyState>
        ) : (
          <ul className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {films.map((film) => (
              <li key={film.tmdbId}>
                <PosterTile
                  to={`/film/${String(film.tmdbId)}`}
                  title={film.title}
                  year={film.year}
                  posterUrl={
                    film.posterPath === null
                      ? null
                      : `https://image.tmdb.org/t/p/w342${film.posterPath}`
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </>
  );
}
