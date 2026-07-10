import { describe, expect, it } from "vitest";

import {
  movieDetailsSchema,
  movieDetailsToFilm,
  releaseYear,
  searchResponseSchema,
} from "./schemas";

describe("releaseYear", () => {
  it("extracts the year from a release date", () => {
    expect(releaseYear("1995-12-15")).toBe(1995);
  });

  it("returns null for missing or malformed dates", () => {
    expect(releaseYear(undefined)).toBeNull();
    expect(releaseYear("")).toBeNull();
    expect(releaseYear("soon")).toBeNull();
  });
});

describe("movieDetailsToFilm", () => {
  it("maps a TMDB details payload to film values", () => {
    const details = movieDetailsSchema.parse({
      id: 949,
      imdb_id: "tt0113277",
      title: "Heat",
      original_title: "Heat",
      release_date: "1995-12-15",
      poster_path: "/poster.jpg",
      backdrop_path: null,
      overview: "A crew of thieves.",
      runtime: 170,
      credits: {
        crew: [
          { name: "Michael Mann", job: "Director" },
          { name: "Dante Spinotti", job: "Director of Photography" },
        ],
      },
    });
    expect(movieDetailsToFilm(details)).toEqual({
      tmdbId: 949,
      imdbId: "tt0113277",
      title: "Heat",
      originalTitle: "Heat",
      year: 1995,
      posterPath: "/poster.jpg",
      backdropPath: null,
      overview: "A crew of thieves.",
      runtimeMinutes: 170,
      directors: ["Michael Mann"],
    });
  });

  it("tolerates sparse payloads", () => {
    const details = movieDetailsSchema.parse({ id: 1, title: "Untitled" });
    const film = movieDetailsToFilm(details);
    expect(film.year).toBeNull();
    expect(film.directors).toEqual([]);
    expect(film.imdbId).toBeNull();
  });
});

describe("searchResponseSchema", () => {
  it("parses a search response", () => {
    const parsed = searchResponseSchema.parse({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [{ id: 949, title: "Heat", release_date: "1995-12-15" }],
    });
    expect(parsed.results[0]?.id).toBe(949);
  });
});
