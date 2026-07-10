import { env } from "~/lib/env.server";
import {
  movieDetailsSchema,
  searchResponseSchema,
  type TmdbMovieDetails,
  type TmdbSearchResponse,
} from "./schemas";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

class TmdbError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

async function tmdbFetch(
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env().TMDB_ACCESS_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new TmdbError(
      `TMDB request failed: ${String(response.status)} ${path}`,
      response.status,
    );
  }
  return response.json();
}

export async function searchMovies(
  query: string,
  options: { year?: number; page?: number } = {},
): Promise<TmdbSearchResponse> {
  const params: Record<string, string> = {
    query,
    include_adult: "false",
    page: String(options.page ?? 1),
  };
  if (options.year !== undefined) {
    params.primary_release_year = String(options.year);
  }
  const data = await tmdbFetch("/search/movie", params);
  return searchResponseSchema.parse(data);
}

export async function getMovieDetails(
  tmdbId: number,
): Promise<TmdbMovieDetails> {
  const data = await tmdbFetch(`/movie/${String(tmdbId)}`, {
    append_to_response: "credits",
  });
  return movieDetailsSchema.parse(data);
}
