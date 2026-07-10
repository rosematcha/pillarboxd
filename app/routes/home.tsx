import { Link } from "react-router";

import { ActivityItem } from "~/components/activity-item";
import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { ReviewPreview } from "~/components/review-preview";
import { getSession } from "~/lib/auth/auth.server";
import { getFollowingActivity } from "~/lib/follows.server";
import {
  getRecentActivity,
  getRecentReviews,
  getRecentlyWatchedFilms,
} from "~/lib/logs.server";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [
    { title: "pillarboxd" },
    {
      name: "description",
      content: "A free, open film diary. Your data stays yours.",
    },
  ];
}

function mapActivity(
  items: Awaited<ReturnType<typeof getRecentActivity>>["items"],
) {
  return items.flatMap((item) =>
    item.username === null
      ? []
      : [
          {
            ...item,
            createdAt: item.createdAt.toISOString(),
            username: item.username,
            reviewed: item.review !== null,
          },
        ],
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const [recentlyWatched, reviews, activity] = await Promise.all([
    getRecentlyWatchedFilms(12),
    getRecentReviews(4),
    getRecentActivity({ limit: 5 }),
  ]);

  let followingActivity: ReturnType<typeof mapActivity> = [];
  if (session !== null) {
    const following = await getFollowingActivity(session.user.id, {
      limit: 8,
    });
    followingActivity = mapActivity(following.items);
  }

  const username = session?.user.username;
  return {
    user: username === null || username === undefined ? null : { username },
    recentlyWatched,
    followingActivity,
    reviews: reviews.flatMap((item) =>
      item.username === null || item.review === null
        ? []
        : [
            {
              id: item.id,
              review: item.review,
              rating: item.rating,
              containsSpoilers: item.containsSpoilers,
              watchedOn: item.watchedOn,
              username: item.username,
              tmdbId: item.tmdbId,
              filmTitle: item.filmTitle,
              filmYear: item.filmYear,
            },
          ],
    ),
    activity: mapActivity(activity.items),
    hasContent:
      recentlyWatched.length > 0 ||
      reviews.length > 0 ||
      activity.items.length > 0 ||
      followingActivity.length > 0,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;
  const isLoggedIn = user !== null;

  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <header className="gap-block flex max-w-[42rem] flex-col">
          <div className="gap-tight flex flex-col">
            <h1 className="font-heading text-2xl">
              A film diary that stays yours
            </h1>
            <p className="text-muted max-w-[70ch] leading-relaxed">
              {isLoggedIn
                ? "Log what you watch, keep your history, and read what everyone on this instance is writing. Your data exports anytime."
                : "Browse films and reviews from this instance without an account. Start a diary, or bring your Letterboxd history with you."}
            </p>
          </div>
          <div className="gap-related flex flex-wrap">
            {isLoggedIn ? (
              <>
                <Link to="/films/search" className={buttonStyles("primary")}>
                  Log a film
                </Link>
                <Link
                  to={`/u/${user.username}`}
                  className={buttonStyles("secondary")}
                >
                  Your profile
                </Link>
                <Link to="/import" className={buttonStyles("secondary")}>
                  Import
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className={buttonStyles("primary")}>
                  Create an account
                </Link>
                <Link to="/import" className={buttonStyles("secondary")}>
                  Import from Letterboxd
                </Link>
                <Link to="/films/search" className={buttonStyles("secondary")}>
                  Search films
                </Link>
              </>
            )}
          </div>
        </header>

        {!loaderData.hasContent ? (
          <EmptyState
            action={
              <div className="gap-related flex flex-wrap justify-center">
                <Link to="/films/search" className={buttonStyles("primary")}>
                  Find a film
                </Link>
                <Link to="/import" className={buttonStyles("secondary")}>
                  Import from Letterboxd
                </Link>
              </div>
            }
          >
            This instance is quiet so far. Log a film or import a diary to get
            started.
          </EmptyState>
        ) : (
          <>
            {loaderData.followingActivity.length > 0 && (
              <section className="gap-block flex max-w-[42rem] flex-col">
                <div className="gap-tight flex flex-col">
                  <h2 className="font-heading text-lg">
                    From people you follow
                  </h2>
                  <p className="text-muted text-sm">
                    Recent logs from accounts you follow on this instance.
                  </p>
                </div>
                <div>
                  {loaderData.followingActivity.map((item) => (
                    <ActivityItem key={item.id} {...item} />
                  ))}
                </div>
              </section>
            )}

            {loaderData.recentlyWatched.length > 0 && (
              <section className="gap-block border-border pt-step flex flex-col border-t">
                <div className="gap-tight flex flex-col">
                  <h2 className="font-heading text-lg">Recently watched</h2>
                  <p className="text-muted max-w-[70ch] text-sm">
                    Films people here logged lately.
                  </p>
                </div>
                <ul className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
                  {loaderData.recentlyWatched.map((film) => (
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

            {loaderData.reviews.length > 0 && (
              <section className="gap-block border-border pt-step flex max-w-[42rem] flex-col border-t">
                <div className="gap-tight flex flex-col">
                  <h2 className="font-heading text-lg">Recent reviews</h2>
                  <p className="text-muted text-sm">
                    Longer thoughts from this instance.
                  </p>
                </div>
                <div>
                  {loaderData.reviews.map((review) => (
                    <ReviewPreview key={review.id} {...review} />
                  ))}
                </div>
              </section>
            )}

            {loaderData.activity.length > 0 && (
              <section className="gap-block border-border pt-step flex max-w-[42rem] flex-col border-t">
                <div className="gap-tight gap-block flex items-baseline justify-between">
                  <div className="gap-tight flex flex-col">
                    <h2 className="font-heading text-lg">Latest activity</h2>
                    <p className="text-muted text-sm">
                      A quick slice of what happened here.
                    </p>
                  </div>
                  <Link
                    to="/activity"
                    className="text-accent shrink-0 text-sm font-medium"
                  >
                    All activity
                  </Link>
                </div>
                <div>
                  {loaderData.activity.map((item) => (
                    <ActivityItem key={item.id} {...item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </PageShell>
    </>
  );
}
