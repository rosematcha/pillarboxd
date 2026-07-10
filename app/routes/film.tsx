import { Form, Link, data } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { Field, Input, Select, Textarea } from "~/components/input";
import { Nav } from "~/components/nav";
import { StarRating } from "~/components/star-rating";
import { formString } from "~/lib/form";
import { getSession, requireSession } from "~/lib/auth/auth.server";
import { getOrCreateFilmByTmdbId } from "~/lib/films.server";
import { ratingToStars } from "~/lib/letterboxd";
import {
  createLogEntry,
  getFilmEntriesForUser,
  logEntryInputSchema,
} from "~/lib/logs.server";
import type { Route } from "./+types/film";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `${loaderData.film.title} | pillarboxd` }];
}

function parseTmdbId(raw: string): number {
  const tmdbId = Number.parseInt(raw, 10);
  if (Number.isNaN(tmdbId) || tmdbId <= 0) {
    throw data("Not found", { status: 404 });
  }
  return tmdbId;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const tmdbId = parseTmdbId(params.tmdbId);
  const session = await getSession(request);
  const username = session?.user.username;
  const film = await getOrCreateFilmByTmdbId(tmdbId);
  const entries =
    session === null
      ? []
      : await getFilmEntriesForUser(session.user.id, film.id);
  return {
    user: username === null || username === undefined ? null : { username },
    film: {
      id: film.id,
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      overview: film.overview,
      runtimeMinutes: film.runtimeMinutes,
      directors: film.directors,
    },
    entries: entries.map((entry) => ({
      id: entry.id,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      review: entry.review,
      liked: entry.liked,
      rewatch: entry.rewatch,
    })),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  const tmdbId = parseTmdbId(params.tmdbId);
  const film = await getOrCreateFilmByTmdbId(tmdbId);
  const form = await request.formData();

  const ratingRaw = formString(form, "rating");
  const watchedOnRaw = formString(form, "watchedOn");
  const reviewRaw = formString(form, "review").trim();
  const parsed = logEntryInputSchema.safeParse({
    filmId: film.id,
    watchedOn: watchedOnRaw === "" ? null : watchedOnRaw,
    rating: ratingRaw === "" ? null : Number.parseInt(ratingRaw, 10),
    review: reviewRaw === "" ? null : reviewRaw,
    liked: form.get("liked") === "on",
    rewatch: form.get("rewatch") === "on",
    containsSpoilers: form.get("containsSpoilers") === "on",
    tags: formString(form, "tags")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag !== ""),
  });
  if (!parsed.success) {
    return data({ error: "Invalid log entry." }, { status: 400 });
  }
  await createLogEntry(session.user.id, parsed.data);
  return data({ error: null });
}

const STAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function Film({ loaderData, actionData }: Route.ComponentProps) {
  const { film, user, entries } = loaderData;
  return (
    <>
      <Nav user={user} />
      <main className="gap-step px-block py-step mx-auto flex max-w-[64rem] flex-col sm:py-12">
        <section className="gap-section grid sm:grid-cols-[12rem_1fr]">
          <div className="rounded-poster bg-bg-subtle aspect-[2/3] w-full max-w-48 overflow-hidden">
            {film.posterPath !== null && (
              <img
                src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
                alt={`Poster for ${film.title}`}
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="gap-block flex max-w-[42rem] flex-col">
            <div className="gap-tight flex flex-col">
              <h1 className="font-heading text-2xl">
                {film.title}
                {film.year !== null && (
                  <span className="ml-tight text-faint font-normal">
                    {String(film.year)}
                  </span>
                )}
              </h1>
              <p className="text-muted text-sm">
                {film.directors.length > 0 && (
                  <>Directed by {film.directors.join(", ")}</>
                )}
                {film.directors.length > 0 &&
                  film.runtimeMinutes !== null &&
                  " · "}
                {film.runtimeMinutes !== null &&
                  `${String(film.runtimeMinutes)} min`}
              </p>
            </div>
            {film.overview !== null && (
              <p className="text-muted max-w-[70ch] text-sm leading-relaxed">
                {film.overview}
              </p>
            )}
            {user === null && (
              <Link
                to={`/login?redirectTo=/film/${String(film.tmdbId)}`}
                className={buttonStyles("primary", "self-start")}
              >
                Log this film
              </Link>
            )}
          </div>
        </section>

        {user !== null && (
          <section className="gap-block border-border pt-step flex max-w-[42rem] flex-col border-t">
            <h2 className="font-heading text-lg">Log this film</h2>
            <Form method="post" className="gap-block flex flex-col">
              <div className="gap-block grid sm:grid-cols-2">
                <Field label="Watched on" htmlFor="watched-on">
                  <Input id="watched-on" type="date" name="watchedOn" />
                </Field>
                <Field label="Rating" htmlFor="rating">
                  <Select id="rating" name="rating" defaultValue="">
                    <option value="">No rating</option>
                    {STAR_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {String(ratingToStars(value))} ★
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Review" htmlFor="review">
                <Textarea id="review" name="review" rows={5} />
              </Field>
              <Field
                label="Tags"
                htmlFor="tags"
                hint="Separate tags with commas."
              >
                <Input id="tags" name="tags" />
              </Field>
              <div className="gap-section flex flex-wrap text-sm">
                <label className="gap-tight flex items-center">
                  <input type="checkbox" name="liked" /> Liked ♥
                </label>
                <label className="gap-tight flex items-center">
                  <input type="checkbox" name="rewatch" /> Rewatch
                </label>
                <label className="gap-tight flex items-center">
                  <input type="checkbox" name="containsSpoilers" /> Contains
                  spoilers
                </label>
              </div>
              {actionData?.error !== null &&
                actionData?.error !== undefined && (
                  <p role="alert" className="text-error text-sm">
                    {actionData.error}
                  </p>
                )}
              <Button type="submit" className="self-start">
                Save entry
              </Button>
            </Form>
          </section>
        )}

        {entries.length > 0 && (
          <section className="gap-block border-border pt-step flex max-w-[42rem] flex-col border-t">
            <h2 className="font-heading text-lg">Your entries</h2>
            <ul className="flex flex-col">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="gap-tight border-border py-block flex flex-col border-b text-sm"
                >
                  <div className="gap-related text-faint flex flex-wrap items-center">
                    <span className="tabular-nums">
                      {entry.watchedOn ?? "No date"}
                    </span>
                    {entry.rating !== null && (
                      <StarRating rating={entry.rating / 2} />
                    )}
                    {entry.liked && (
                      <span className="text-accent" aria-label="Liked">
                        ♥
                      </span>
                    )}
                    {entry.rewatch && (
                      <span className="gap-tight inline-flex items-center">
                        <span className="bg-sage size-1.5 rounded-full" />
                        Rewatch
                      </span>
                    )}
                  </div>
                  {entry.review !== null && (
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {entry.review}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
