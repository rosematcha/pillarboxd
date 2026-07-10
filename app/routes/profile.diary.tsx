import { Form, Link } from "react-router";

import { buttonStyles } from "~/components/button";
import { DiaryTable } from "~/components/diary-table";
import { EmptyState } from "~/components/empty-state";
import { Field, Input } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { ProfileNav } from "~/components/profile-nav";
import { getSession } from "~/lib/auth/auth.server";
import { getUserDiary } from "~/lib/logs.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile.diary";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} · Diary | pillarboxd` }];
}

function parseYear(raw: string | null): number | null {
  if (raw === null || raw === "") {
    return null;
  }
  const year = Number.parseInt(raw, 10);
  if (Number.isNaN(year) || year < 1900 || year > 2100) {
    return null;
  }
  return year;
}

function parseMinRating(raw: string | null): number | null {
  if (raw === null || raw === "") {
    return null;
  }
  const stars = Number.parseFloat(raw);
  if (Number.isNaN(stars) || stars < 0.5 || stars > 5) {
    return null;
  }
  return Math.round(stars * 2);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const year = parseYear(url.searchParams.get("year"));
  const minRating = parseMinRating(url.searchParams.get("minRating"));
  const hasReview = url.searchParams.get("hasReview") === "1";
  const diary = await getUserDiary(profile.user.id, {
    cursor: url.searchParams.get("cursor"),
    year,
    minRating,
    hasReview: hasReview ? true : undefined,
  });
  return {
    user: viewerFromSession(session),
    profile: { username: profile.user.username },
    counts: profile.counts,
    filters: {
      year: year === null ? "" : String(year),
      minRating: minRating === null ? "" : String(minRating / 2),
      hasReview,
    },
    diary: diary.entries.map(({ entry, film, tags }) => ({
      id: entry.id,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      review: entry.review,
      liked: entry.liked,
      rewatch: entry.rewatch,
      containsSpoilers: entry.containsSpoilers,
      tags,
      entryHref: `/entries/${entry.id}`,
      film: {
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterPath: film.posterPath,
      },
    })),
    nextCursor: diary.nextCursor,
  };
}

function diaryQuery(filters: {
  year: string;
  minRating: string;
  hasReview: boolean;
}): string {
  const params = new URLSearchParams();
  if (filters.year !== "") {
    params.set("year", filters.year);
  }
  if (filters.minRating !== "") {
    params.set("minRating", filters.minRating);
  }
  if (filters.hasReview) {
    params.set("hasReview", "1");
  }
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

export default function ProfileDiary({ loaderData }: Route.ComponentProps) {
  const { user, profile, counts, diary, nextCursor, filters } = loaderData;
  const filterQuery = diaryQuery(filters);
  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <h1 className="font-heading text-xl">@{profile.username}</h1>
        <ProfileNav username={profile.username} counts={counts} />
        <Form
          method="get"
          className="gap-block border-border pb-block flex flex-wrap items-end border-b"
        >
          <Field label="Year" htmlFor="diary-year">
            <Input
              id="diary-year"
              name="year"
              inputMode="numeric"
              pattern="[0-9]{4}"
              placeholder="2024"
              defaultValue={filters.year}
            />
          </Field>
          <Field label="Min rating" htmlFor="diary-min-rating">
            <Input
              id="diary-min-rating"
              name="minRating"
              inputMode="decimal"
              placeholder="3.5"
              defaultValue={filters.minRating}
            />
          </Field>
          <label className="gap-tight text-muted flex items-center text-sm">
            <input
              type="checkbox"
              name="hasReview"
              value="1"
              defaultChecked={filters.hasReview}
              className="accent-accent"
            />
            Has review
          </label>
          <button type="submit" className={buttonStyles("secondary")}>
            Filter
          </button>
        </Form>
        {diary.length === 0 ? (
          <EmptyState
            action={
              <Link to="/films/search" className={buttonStyles("primary")}>
                Find a film
              </Link>
            }
          >
            {filterQuery === ""
              ? "This diary is empty."
              : "No diary entries match these filters."}
          </EmptyState>
        ) : (
          <>
            <DiaryTable entries={diary} />
            {nextCursor !== null && (
              <Link
                to={`/u/${profile.username}/diary${filterQuery}${filterQuery === "" ? "?" : "&"}cursor=${encodeURIComponent(nextCursor)}`}
                className={buttonStyles("secondary", "self-start")}
              >
                Older entries
              </Link>
            )}
          </>
        )}
      </PageShell>
    </>
  );
}
