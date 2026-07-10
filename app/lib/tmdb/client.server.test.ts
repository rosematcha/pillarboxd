import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchMovies } from "./client.server";

const tmdbResponse = {
  page: 1,
  total_pages: 1,
  total_results: 1,
  results: [{ id: 348, title: "Alien", release_date: "1979-05-25" }],
};

describe("TMDB search requests", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://test";
    process.env.BETTER_AUTH_SECRET =
      "test-secret-at-least-thirty-two-characters";
    process.env.APP_URL = "http://localhost:5173";
    process.env.TMDB_ACCESS_TOKEN = "test-token";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("coalesces concurrent searches and caches the result", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(tmdbResponse)));
    vi.stubGlobal("fetch", fetchMock);
    const query = `alien-cache-${crypto.randomUUID()}`;

    const [first, second] = await Promise.all([
      searchMovies(query),
      searchMovies(query),
    ]);
    const cached = await searchMovies(query);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(cached).toEqual(first);
  });

  it("aborts the upstream request after its final consumer cancels", async () => {
    let upstreamSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          upstreamSignal = init?.signal ?? undefined;
          upstreamSignal?.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Canceled", "AbortError"));
            },
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const search = searchMovies(`alien-abort-${crypto.randomUUID()}`, {
      signal: controller.signal,
    });

    controller.abort();

    await expect(search).rejects.toMatchObject({ name: "AbortError" });
    expect(upstreamSignal?.aborted).toBe(true);
  });
});
