import { searchMovies, tmdbErrorMessage } from "~/lib/tmdb/client.server";
import { releaseYear } from "~/lib/tmdb/schemas";
import type { Route } from "./+types/films.search.preview";

const MINIMUM_QUERY_LENGTH = 2;
const PREVIEW_LIMIT = 5;

export async function loader({ request }: Route.LoaderArgs) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return { query, error: null, results: [] };
  }

  try {
    const { results } = await searchMovies(query);
    return {
      query,
      error: null,
      results: results.slice(0, PREVIEW_LIMIT).map((movie) => ({
        tmdbId: movie.id,
        title: movie.title,
        year: releaseYear(movie.release_date),
        posterPath: movie.poster_path ?? null,
      })),
    };
  } catch (error) {
    return { query, error: tmdbErrorMessage(error), results: [] };
  }
}
