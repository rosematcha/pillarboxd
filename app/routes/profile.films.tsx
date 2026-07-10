import { Link } from "react-router";

import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { ProfileNav } from "~/components/profile-nav";
import { StarRating } from "~/components/star-rating";
import { getSession } from "~/lib/auth/auth.server";
import { getUserFilms } from "~/lib/film-state.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile.films";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} · Films | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const films = await getUserFilms(profile.user.id);
  return {
    user: viewerFromSession(session),
    profile: { username: profile.user.username },
    counts: profile.counts,
    films: films.map(({ film, state }) => ({
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      rating: state?.rating ?? null,
      liked: state?.liked ?? false,
    })),
  };
}

export default function ProfileFilms({ loaderData }: Route.ComponentProps) {
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
            No films yet.
          </EmptyState>
        ) : (
          <ul className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {films.map((film) => (
              <li key={film.tmdbId} className="gap-tight flex flex-col">
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
                <div className="gap-tight flex items-center text-xs">
                  {film.rating !== null && (
                    <StarRating rating={film.rating / 2} />
                  )}
                  {film.liked && (
                    <span className="text-accent" aria-label="Liked">
                      ♥
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </>
  );
}
