import { describe, expect, it } from "vitest";

import {
  canSearchFilms,
  MAXIMUM_FILM_SEARCH_LENGTH,
  normalizeFilmSearchQuery,
} from "./film-search";

describe("film search queries", () => {
  it("trims and limits queries", () => {
    expect(normalizeFilmSearchQuery("  Alien  ")).toBe("Alien");
    expect(normalizeFilmSearchQuery("a".repeat(200))).toHaveLength(
      MAXIMUM_FILM_SEARCH_LENGTH,
    );
  });

  it("requires two normalized characters", () => {
    expect(canSearchFilms(normalizeFilmSearchQuery(" a "))).toBe(false);
    expect(canSearchFilms(normalizeFilmSearchQuery(" al "))).toBe(true);
  });
});
