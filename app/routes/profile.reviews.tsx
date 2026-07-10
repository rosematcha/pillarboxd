import { Link } from "react-router";

import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { ProfileNav } from "~/components/profile-nav";
import { ReviewPreview } from "~/components/review-preview";
import { getSession } from "~/lib/auth/auth.server";
import { getUserReviews } from "~/lib/logs.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile.reviews";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} · Reviews | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const reviews = await getUserReviews(profile.user.id, {
    cursor: url.searchParams.get("cursor"),
  });
  return {
    user: viewerFromSession(session),
    profile: { username: profile.user.username },
    counts: profile.counts,
    reviews: reviews.entries.flatMap(({ entry, film }) =>
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
    nextCursor: reviews.nextCursor,
  };
}

export default function ProfileReviews({ loaderData }: Route.ComponentProps) {
  const { user, profile, counts, reviews, nextCursor } = loaderData;
  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <h1 className="font-heading text-xl">@{profile.username}</h1>
        <ProfileNav username={profile.username} counts={counts} />
        {reviews.length === 0 ? (
          <EmptyState
            action={
              <Link to="/films/search" className={buttonStyles("primary")}>
                Find a film
              </Link>
            }
          >
            No reviews yet.
          </EmptyState>
        ) : (
          <div className="max-w-[42rem]">
            {reviews.map((review) => (
              <ReviewPreview key={review.id} {...review} />
            ))}
            {nextCursor !== null && (
              <Link
                to={`/u/${profile.username}/reviews?cursor=${encodeURIComponent(nextCursor)}`}
                className={buttonStyles("secondary", "self-start")}
              >
                Older reviews
              </Link>
            )}
          </div>
        )}
      </PageShell>
    </>
  );
}
