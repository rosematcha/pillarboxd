import { Form, Link } from "react-router";

import { Nav } from "~/components/nav";
import { getSession } from "~/lib/auth/auth.server";
import { searchMovies } from "~/lib/tmdb/client.server";
import { releaseYear } from "~/lib/tmdb/schemas";
import type { Route } from "./+types/films.search";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Search films — pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const username = session?.user.username;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const results =
    query.trim() === "" ? [] : (await searchMovies(query.trim())).results;
  return {
    user: username === null || username === undefined ? null : { username },
    query,
    results: results.map((movie) => ({
      tmdbId: movie.id,
      title: movie.title,
      year: releaseYear(movie.release_date),
      posterPath: movie.poster_path ?? null,
      overview: movie.overview ?? "",
    })),
  };
}

export default function FilmsSearch({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Search films</h1>
        <Form method="get" className="mt-4 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={loaderData.query}
            placeholder="Film title…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-white dark:bg-white dark:text-gray-900"
          >
            Search
          </button>
        </Form>
        <ul className="mt-6 flex flex-col gap-4">
          {loaderData.results.map((film) => (
            <li key={film.tmdbId} className="flex gap-4">
              {film.posterPath !== null && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                  alt=""
                  width={46}
                  className="self-start rounded"
                />
              )}
              <div>
                <Link
                  to={`/film/${String(film.tmdbId)}`}
                  className="font-semibold underline"
                >
                  {film.title}
                  {film.year !== null && ` (${String(film.year)})`}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  {film.overview}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {loaderData.query !== "" && loaderData.results.length === 0 && (
          <p className="mt-6 text-gray-600 dark:text-gray-400">No results.</p>
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
