import { Form, Link } from "react-router";

import { Button } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Input } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { getSession } from "~/lib/auth/auth.server";
import { searchMovies, tmdbErrorMessage } from "~/lib/tmdb/client.server";
import { releaseYear } from "~/lib/tmdb/schemas";
import type { Route } from "./+types/films.search";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Search films | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const username = session?.user.username;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  let results: Awaited<ReturnType<typeof searchMovies>>["results"] = [];
  let searchError: string | null = null;
  if (query.trim() !== "") {
    try {
      results = (await searchMovies(query.trim())).results;
    } catch (error) {
      searchError = tmdbErrorMessage(error);
    }
  }
  return {
    user: username === null || username === undefined ? null : { username },
    query,
    searchError,
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
      <PageShell width="wide">
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
        {loaderData.searchError !== null && (
          <p role="alert" className="text-error text-sm">
            {loaderData.searchError}
          </p>
        )}
        {loaderData.results.length > 0 && (
          <ul className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {loaderData.results.map((film) => (
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
        {loaderData.query !== "" &&
          loaderData.searchError === null &&
          loaderData.results.length === 0 && (
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
      </PageShell>
    </>
  );
}
