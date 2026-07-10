import { Link, redirect } from "react-router";

import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { FilmSearch } from "~/components/film-search";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { getSession } from "~/lib/auth/auth.server";
import {
  canSearchFilms,
  MINIMUM_FILM_SEARCH_LENGTH,
  normalizeFilmSearchQuery,
} from "~/lib/film-search";
import { searchMovies, tmdbErrorMessage } from "~/lib/tmdb/client.server";
import { releaseYear } from "~/lib/tmdb/schemas";
import type { Route } from "./+types/films.search";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Search films | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = normalizeFilmSearchQuery(url.searchParams.get("q"));
  const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1
      ? Math.min(parsedPage, 500)
      : 1;
  const sessionPromise = getSession(request);
  const searchPromise = canSearchFilms(query)
    ? searchMovies(query, { page, signal: request.signal }).then(
        ({ results, total_pages: totalPages }) => ({
          results,
          searchError: null,
          totalPages: Math.min(totalPages, 500),
        }),
        (error: unknown) => ({
          results: [],
          searchError: tmdbErrorMessage(error),
          totalPages: 0,
        }),
      )
    : Promise.resolve({ results: [], searchError: null, totalPages: 0 });
  const [session, search] = await Promise.all([sessionPromise, searchPromise]);
  const username = session?.user.username;
  if (
    search.searchError === null &&
    search.totalPages > 0 &&
    page > search.totalPages
  ) {
    throw redirect(
      `/films/search?q=${encodeURIComponent(query)}&page=${String(search.totalPages)}`,
    );
  }

  return {
    user: username === null || username === undefined ? null : { username },
    query,
    page,
    searchError: search.searchError,
    totalPages: search.totalPages,
    results: search.results.map((movie) => ({
      tmdbId: movie.id,
      title: movie.title,
      year: releaseYear(movie.release_date),
      posterPath: movie.poster_path ?? null,
    })),
  };
}

export default function FilmsSearch({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} showSearch={false} />
      <PageShell width="wide">
        <header className="gap-block flex max-w-[42rem] flex-col">
          <h1 className="font-heading text-xl">Search films</h1>
          <FilmSearch
            key={loaderData.query}
            defaultValue={loaderData.query}
            submitLabel="Search"
          />
        </header>
        {loaderData.searchError !== null && (
          <p role="alert" className="text-error text-sm">
            {loaderData.searchError}
          </p>
        )}
        {loaderData.results.length > 0 && (
          <ul className="gap-related grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {loaderData.results.map((film, index) => (
              <li key={film.tmdbId}>
                <PosterTile
                  to={`/film/${String(film.tmdbId)}`}
                  title={film.title}
                  year={film.year}
                  loading={index < 6 ? "eager" : "lazy"}
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
        {loaderData.totalPages > 1 && (
          <nav
            aria-label="Search result pages"
            className="gap-block flex items-center justify-between"
          >
            {loaderData.page > 1 ? (
              <Link
                to={`/films/search?q=${encodeURIComponent(loaderData.query)}&page=${String(loaderData.page - 1)}`}
                className={buttonStyles("secondary")}
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted text-sm tabular-nums">
              Page {String(loaderData.page)} of {String(loaderData.totalPages)}
            </span>
            {loaderData.page < loaderData.totalPages ? (
              <Link
                to={`/films/search?q=${encodeURIComponent(loaderData.query)}&page=${String(loaderData.page + 1)}`}
                className={buttonStyles("secondary")}
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
        {loaderData.query !== "" &&
          !canSearchFilms(loaderData.query) &&
          loaderData.searchError === null && (
            <p className="text-muted text-sm">
              Enter at least {String(MINIMUM_FILM_SEARCH_LENGTH)} characters.
            </p>
          )}
        {canSearchFilms(loaderData.query) &&
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
