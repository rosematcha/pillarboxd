import { Form, data } from "react-router";

import { Nav } from "~/components/nav";
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
  return [{ title: `${loaderData.film.title} — pillarboxd` }];
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex gap-6">
          {film.posterPath !== null && (
            <img
              src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
              alt={`Poster for ${film.title}`}
              width={140}
              className="self-start rounded"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {film.title}
              {film.year !== null && (
                <span className="ml-2 font-normal text-gray-500">
                  {String(film.year)}
                </span>
              )}
            </h1>
            {film.directors.length > 0 && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Directed by {film.directors.join(", ")}
              </p>
            )}
            {film.runtimeMinutes !== null && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {String(film.runtimeMinutes)} min
              </p>
            )}
            {film.overview !== null && (
              <p className="mt-3 text-sm">{film.overview}</p>
            )}
          </div>
        </div>

        {user !== null && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Log this film</h2>
            <Form method="post" className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  Watched on
                  <input
                    type="date"
                    name="watchedOn"
                    className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Rating
                  <select
                    name="rating"
                    defaultValue=""
                    className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="">No rating</option>
                    {STAR_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {String(ratingToStars(value))} ★
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                Review
                <textarea
                  name="review"
                  rows={5}
                  className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Tags (comma-separated)
                <input
                  name="tags"
                  className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="liked" /> Liked ♥
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="rewatch" /> Rewatch
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="containsSpoilers" /> Contains
                  spoilers
                </label>
              </div>
              {actionData?.error !== null &&
                actionData?.error !== undefined && (
                  <p role="alert" className="text-sm text-red-600">
                    {actionData.error}
                  </p>
                )}
              <button
                type="submit"
                className="self-start rounded bg-gray-900 px-4 py-2 text-white dark:bg-white dark:text-gray-900"
              >
                Save entry
              </button>
            </Form>
          </section>
        )}

        {entries.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Your entries</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-gray-200 pb-3 text-sm dark:border-gray-800"
                >
                  <p>
                    {entry.watchedOn ?? "No date"}
                    {entry.rating !== null &&
                      ` · ${String(ratingToStars(entry.rating))} ★`}
                    {entry.liked && " · ♥"}
                    {entry.rewatch && " · rewatch"}
                  </p>
                  {entry.review !== null && (
                    <p className="mt-1 whitespace-pre-wrap">{entry.review}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-12 text-xs text-gray-500">
          Film data from{" "}
          <a href="https://www.themoviedb.org/" className="underline">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </main>
    </>
  );
}
