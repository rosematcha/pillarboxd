import { env } from "~/lib/env.server";
import {
  movieDetailsSchema,
  searchResponseSchema,
  type TmdbMovieDetails,
  type TmdbSearchResponse,
} from "./schemas";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TIMEOUT_MS = 15_000;

export class TmdbError extends Error {
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
    signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new TmdbError(
      `TMDB request failed: ${String(response.status)} ${path}`,
      response.status,
    );
  }
  return response.json();
}

export function tmdbErrorMessage(error: unknown): string {
  if (error instanceof TmdbError) {
    if (error.status === 404) {
      return "Film not found.";
    }
    if (error.status === 429) {
      return "TMDB is rate limiting requests. Try again in a minute.";
    }
    if (error.status !== undefined && error.status >= 500) {
      return "Film data is temporarily unavailable. Try again shortly.";
    }
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "Film data took too long to load. Try again.";
  }
  return "Film data could not be loaded.";
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

export async function getSimilarMovies(
  tmdbId: number,
): Promise<TmdbSearchResponse["results"]> {
  const data = await tmdbFetch(`/movie/${String(tmdbId)}/similar`, {
    page: "1",
  });
  const parsed = searchResponseSchema.parse(data);
  return parsed.results.slice(0, 8);
}
