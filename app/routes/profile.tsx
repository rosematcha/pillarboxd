import { Form, Link, data } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { ProfileNav } from "~/components/profile-nav";
import { ReviewPreview } from "~/components/review-preview";
import { StarRating } from "~/components/star-rating";
import { formString } from "~/lib/form";
import { getSession, requireSession } from "~/lib/auth/auth.server";
import { formatShortDate } from "~/lib/dates";
import { follow, isFollowing, unfollow } from "~/lib/follows.server";
import { getUserDiary, getUserReviews } from "~/lib/logs.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const [diary, reviews, following] = await Promise.all([
    getUserDiary(profile.user.id, { limit: 6 }),
    getUserReviews(profile.user.id, { limit: 4 }),
    session === null
      ? Promise.resolve(false)
      : isFollowing(session.user.id, profile.user.id),
  ]);
  const isOwner = session?.user.id === profile.user.id;

  return {
    user: viewerFromSession(session),
    profile: {
      username: profile.user.username,
      name: profile.user.name,
      bio: profile.bio,
      isOwner,
      isFollowing: following,
    },
    counts: profile.counts,
    favorites: profile.favorites.map(({ film }) => ({
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
    })),
    recentDiary: diary.entries.map(({ entry, film }) => ({
      id: entry.id,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      film: {
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterPath: film.posterPath,
      },
    })),
    recentReviews: reviews.entries.flatMap(({ entry, film }) =>
      entry.review === null
        ? []
        : [
            {
              id: entry.id,
              review: entry.review,
              rating: entry.rating,
              containsSpoilers: entry.containsSpoilers,
              watchedOn: entry.watchedOn,
              username: profile.user.username,
              tmdbId: film.tmdbId,
              filmTitle: film.title,
              filmYear: film.year,
            },
          ],
    ),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  const profile = await loadProfileCounts(params.username);
  if (session.user.id === profile.user.id) {
    return data({ error: "You cannot follow yourself." }, { status: 400 });
  }
  const form = await request.formData();
  const intent = formString(form, "intent");
  if (intent === "follow") {
    await follow(session.user.id, profile.user.id);
    return data({ ok: true });
  }
  if (intent === "unfollow") {
    await unfollow(session.user.id, profile.user.id);
    return data({ ok: true });
  }
  return data({ error: "Unknown action." }, { status: 400 });
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const { user, profile, counts, favorites, recentDiary, recentReviews } =
    loaderData;
  const showName =
    profile.name.trim().toLowerCase() !== profile.username.toLowerCase() &&
    profile.name.trim() !== "";

  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <header className="gap-block flex flex-col">
          <div className="gap-tight flex flex-col">
            <h1 className="font-heading text-xl">@{profile.username}</h1>
            {showName && <p className="text-muted text-sm">{profile.name}</p>}
            {profile.bio !== null && profile.bio.trim() !== "" && (
              <p className="text-muted max-w-[70ch] text-sm leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
          <p className="text-muted gap-related flex flex-wrap text-sm tabular-nums">
            <Link
              to={`/u/${profile.username}/films`}
              className="hover:text-accent"
            >
              {String(counts.films)} films
            </Link>
            <Link
              to={`/u/${profile.username}/diary`}
              className="hover:text-accent"
            >
              {String(counts.diary)} diary
            </Link>
            <Link
              to={`/u/${profile.username}/reviews`}
              className="hover:text-accent"
            >
              {String(counts.reviews)} reviews
            </Link>
            <Link
              to={`/u/${profile.username}/lists`}
              className="hover:text-accent"
            >
              {String(counts.lists)} lists
            </Link>
            <Link
              to={`/u/${profile.username}/watchlist`}
              className="hover:text-accent"
            >
              {String(counts.watchlist)} watchlist
            </Link>
            <Link
              to={`/u/${profile.username}/followers`}
              className="hover:text-accent"
            >
              {String(counts.followers)} followers
            </Link>
            <Link
              to={`/u/${profile.username}/following`}
              className="hover:text-accent"
            >
              {String(counts.following)} following
            </Link>
          </p>
          <div className="gap-related flex flex-wrap">
            {profile.isOwner ? (
              <Link
                to="/settings/profile"
                className={buttonStyles("secondary")}
              >
                Edit profile
              </Link>
            ) : user !== null ? (
              <Form method="post">
                <input
                  type="hidden"
                  name="intent"
                  value={profile.isFollowing ? "unfollow" : "follow"}
                />
                <Button
                  type="submit"
                  variant={profile.isFollowing ? "secondary" : "primary"}
                >
                  {profile.isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </Form>
            ) : null}
          </div>
        </header>

        <ProfileNav username={profile.username} counts={counts} />

        {favorites.length > 0 && (
          <section className="gap-block flex flex-col">
            <h2 className="font-heading text-lg">Favorites</h2>
            <ul className="gap-related grid grid-cols-2 sm:grid-cols-4">
              {favorites.map((film) => (
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
          </section>
        )}

        {recentDiary.length > 0 && (
          <section className="gap-block border-border pt-step flex flex-col border-t">
            <div className="gap-tight flex items-baseline justify-between">
              <h2 className="font-heading text-lg">Recent diary</h2>
              <Link
                to={`/u/${profile.username}/diary`}
                className="text-accent text-sm font-medium"
              >
                All diary
              </Link>
            </div>
            <ul className="gap-related grid grid-cols-3 sm:grid-cols-6">
              {recentDiary.map((item) => (
                <li key={item.id} className="gap-tight flex flex-col">
                  <PosterTile
                    to={`/entries/${item.id}`}
                    title={item.film.title}
                    year={item.film.year}
                    posterUrl={
                      item.film.posterPath === null
                        ? null
                        : `https://image.tmdb.org/t/p/w185${item.film.posterPath}`
                    }
                  />
                  <div className="gap-tight text-faint flex flex-col text-xs">
                    <span className="tabular-nums">
                      {formatShortDate(item.watchedOn)}
                    </span>
                    {item.rating !== null && (
                      <StarRating rating={item.rating / 2} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recentReviews.length > 0 && (
          <section className="gap-block border-border pt-step flex max-w-[42rem] flex-col border-t">
            <div className="gap-tight flex items-baseline justify-between">
              <h2 className="font-heading text-lg">Recent reviews</h2>
              <Link
                to={`/u/${profile.username}/reviews`}
                className="text-accent text-sm font-medium"
              >
                All reviews
              </Link>
            </div>
            <div>
              {recentReviews.map((review) => (
                <ReviewPreview key={review.id} {...review} />
              ))}
            </div>
          </section>
        )}

        {favorites.length === 0 &&
          recentDiary.length === 0 &&
          recentReviews.length === 0 && (
            <EmptyState
              action={
                profile.isOwner ? (
                  <Link to="/films/search" className={buttonStyles("primary")}>
                    Find a film
                  </Link>
                ) : (
                  <Link
                    to="/films/search"
                    className={buttonStyles("secondary")}
                  >
                    Search films
                  </Link>
                )
              }
            >
              {profile.isOwner
                ? "Nothing here yet. Log a film to start your diary."
                : "This profile is empty so far."}
            </EmptyState>
          )}
      </PageShell>
    </>
  );
}
