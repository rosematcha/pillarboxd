import { Form, Link } from "react-router";

import { Button } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Input } from "~/components/input";
import { Nav } from "~/components/nav";
import { PosterTile } from "~/components/poster-tile";
import { getSession } from "~/lib/auth/auth.server";
import { searchMovies } from "~/lib/tmdb/client.server";
import { releaseYear } from "~/lib/tmdb/schemas";
import type { Route } from "./+types/films.search";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Search films | pillarboxd" }];
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
      <main className="gap-step px-block py-step mx-auto flex max-w-[64rem] flex-col sm:py-12">
        <header className="gap-block flex max-w-[42rem] flex-col">
          <h1 className="font-heading text-xl">Search films</h1>
          <Form method="get" className="gap-related flex">
            <Input
              type="search"
              name="q"
              defaultValue={loaderData.query}
              placeholder="Film title"
              aria-label="Film title"
              className="flex-1"
            />
            <Button type="submit">Search</Button>
          </Form>
        </header>
        {loaderData.results.length > 0 && (
          <ul className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {loaderData.results.map((film) => (
              <li key={film.tmdbId} className="gap-tight flex min-w-0 flex-col">
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
                <Link
                  to={`/film/${String(film.tmdbId)}`}
                  className="text-text hover:text-accent truncate text-sm font-medium"
                >
                  {film.title}
                </Link>
                {film.year !== null && (
                  <span className="text-faint text-xs">
                    {String(film.year)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {loaderData.query !== "" && loaderData.results.length === 0 && (
          <EmptyState
            action={
              <Link to="/films/search" className="text-sm font-medium">
                Clear search
              </Link>
            }
          >
            No films matched “{loaderData.query}”. Try another title.
          </EmptyState>
        )}
      </main>
    </>
  );
}
