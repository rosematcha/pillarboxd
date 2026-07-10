import { env } from "~/lib/env.server";
import {
  movieDetailsSchema,
  searchResponseSchema,
  type TmdbMovieDetails,
  type TmdbSearchResponse,
} from "./schemas";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TIMEOUT_MS = 15_000;
const SEARCH_CACHE_TTL_MS = 5 * 60_000;
const SEARCH_CACHE_MAX_ENTRIES = 100;

interface SearchCacheEntry {
  expiresAt: number;
  response: TmdbSearchResponse;
}

interface PendingSearch {
  consumers: number;
  controller: AbortController;
  promise: Promise<TmdbSearchResponse>;
}

const searchCache = new Map<string, SearchCacheEntry>();
const pendingSearches = new Map<string, PendingSearch>();

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
  signal?: AbortSignal,
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
    signal:
      signal === undefined
        ? AbortSignal.timeout(TMDB_TIMEOUT_MS)
        : AbortSignal.any([signal, AbortSignal.timeout(TMDB_TIMEOUT_MS)]),
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

function waitForSearch<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  const abortError = (): Error =>
    signal.reason instanceof Error
      ? signal.reason
      : new DOMException("The search was canceled.", "AbortError");

  if (signal.aborted) {
    return Promise.reject(abortError());
  }
  return new Promise<T>((resolve, reject) => {
    const abort = (): void => {
      reject(abortError());
    };
    signal.addEventListener("abort", abort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(
          error instanceof Error
            ? error
            : new Error("TMDB search failed without an error."),
        );
      },
    );
  });
}

export async function searchMovies(
  query: string,
  options: { year?: number; page?: number; signal?: AbortSignal } = {},
): Promise<TmdbSearchResponse> {
  const page = options.page ?? 1;
  const cacheKey = JSON.stringify([
    query.trim().toLocaleLowerCase(),
    options.year ?? null,
    page,
  ]);
  const cached = searchCache.get(cacheKey);
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    return cached.response;
  }
  if (cached !== undefined) {
    searchCache.delete(cacheKey);
  }

  let pending = pendingSearches.get(cacheKey);
  if (pending === undefined) {
    const controller = new AbortController();
    const params: Record<string, string> = {
      query,
      include_adult: "false",
      page: String(page),
    };
    if (options.year !== undefined) {
      params.primary_release_year = String(options.year);
    }
    const promise = tmdbFetch("/search/movie", params, controller.signal)
      .then((data) => searchResponseSchema.parse(data))
      .then((response) => {
        if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
          const oldestKey = searchCache.keys().next().value;
          if (oldestKey !== undefined) {
            searchCache.delete(oldestKey);
          }
        }
        searchCache.set(cacheKey, {
          expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
          response,
        });
        return response;
      })
      .finally(() => {
        if (pendingSearches.get(cacheKey)?.controller === controller) {
          pendingSearches.delete(cacheKey);
        }
      });
    pending = { consumers: 0, controller, promise };
    pendingSearches.set(cacheKey, pending);
  }

  pending.consumers += 1;
  try {
    if (options.signal === undefined) {
      return await pending.promise;
    }
    return await waitForSearch(pending.promise, options.signal);
  } finally {
    pending.consumers -= 1;
    if (pending.consumers === 0 && pendingSearches.get(cacheKey) === pending) {
      pendingSearches.delete(cacheKey);
      pending.controller.abort();
    }
  }
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
