import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  extractLetterboxdCsvs,
  mergeImport,
  parseDiaryCsv,
  parseLikedFilmsCsv,
  parseListCsv,
  parseRatingsCsv,
  parseReviewsCsv,
  parseWatchlistCsv,
  ratingToStars,
  starsToRating,
} from "./letterboxd";

const DIARY_CSV = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2026-01-05,Heat,1995,https://boxd.it/abc,4.5,,crime,2026-01-04
2026-02-01,Heat,1995,https://boxd.it/def,5,Yes,"crime, rewatch club",2026-01-31
2026-03-10,Playtime,1967,https://boxd.it/ghi,,,,2026-03-09
`;

const REVIEWS_CSV = `Date,Name,Year,Letterboxd URI,Rating,Review,Tags,Watched Date
2026-01-05,Heat,1995,https://boxd.it/abc,4.5,"Pacino and De Niro, finally.

""You want to be making moves on the street?""",crime,2026-01-04
2026-04-01,Alien,1979,https://boxd.it/jkl,4,Still perfect.,,2026-03-30
`;

const LIKES_CSV = `Date,Name,Year,Letterboxd URI
2026-01-05,Heat,1995,https://boxd.it/film/heat
`;

const RATINGS_CSV = `Date,Name,Year,Letterboxd URI,Rating
2026-01-05,Heat,1995,https://boxd.it/film/heat,4.5
2026-02-01,Mulholland Drive,2001,https://boxd.it/film/mulholland-drive,5
`;

const WATCHLIST_CSV = `Date,Name,Year,Letterboxd URI
2026-03-01,Stalker,1979,https://boxd.it/film/stalker
`;

describe("starsToRating", () => {
  it("converts half-star values to 1-10", () => {
    expect(starsToRating(0.5)).toBe(1);
    expect(starsToRating(4.5)).toBe(9);
    expect(starsToRating(5)).toBe(10);
  });

  it("rejects out-of-range and non-half-step values", () => {
    expect(starsToRating(0)).toBeNull();
    expect(starsToRating(5.5)).toBeNull();
    expect(starsToRating(3.7)).toBeNull();
  });

  it("round-trips with ratingToStars", () => {
    expect(ratingToStars(9)).toBe(4.5);
    expect(starsToRating(ratingToStars(7))).toBe(7);
  });
});

describe("extractLetterboxdCsvs", () => {
  it("pulls diary, reviews, likes, ratings, and watchlist out of an export zip", () => {
    const zip = zipSync({
      "diary.csv": strToU8(DIARY_CSV),
      "reviews.csv": strToU8(REVIEWS_CSV),
      "likes/films.csv": strToU8(LIKES_CSV),
      "ratings.csv": strToU8(RATINGS_CSV),
      "watchlist.csv": strToU8(WATCHLIST_CSV),
    });
    const csvs = extractLetterboxdCsvs(zip);
    expect(csvs.diary).toBe(DIARY_CSV);
    expect(csvs.reviews).toBe(REVIEWS_CSV);
    expect(csvs.likes).toBe(LIKES_CSV);
    expect(csvs.ratings).toBe(RATINGS_CSV);
    expect(csvs.watchlist).toBe(WATCHLIST_CSV);
    expect(csvs.lists).toEqual([]);
  });

  it("returns undefined for files the export omits", () => {
    const zip = zipSync({ "diary.csv": strToU8(DIARY_CSV) });
    const csvs = extractLetterboxdCsvs(zip);
    expect(csvs.diary).toBe(DIARY_CSV);
    expect(csvs.reviews).toBeUndefined();
    expect(csvs.likes).toBeUndefined();
    expect(csvs.ratings).toBeUndefined();
    expect(csvs.watchlist).toBeUndefined();
    expect(csvs.lists).toEqual([]);
  });

  it("extracts list CSVs from the lists folder", () => {
    const listCsv = `Position,Name,Year,URI,Description
1,Heat,1995,https://boxd.it/film/heat,
2,Alien,1979,https://boxd.it/film/alien,Still perfect
`;
    const zip = zipSync({
      "diary.csv": strToU8(DIARY_CSV),
      "lists/favorites.csv": strToU8(listCsv),
    });
    const csvs = extractLetterboxdCsvs(zip);
    expect(csvs.lists).toHaveLength(1);
    expect(csvs.lists[0]?.name).toBe("favorites");
    expect(csvs.lists[0]?.csv).toBe(listCsv);
  });
});

describe("parseListCsv", () => {
  it("parses ranked list rows", () => {
    expect(
      parseListCsv(`Position,Name,Year,URI,Description
1,Heat,1995,https://boxd.it/film/heat,
2,Alien,1979,https://boxd.it/film/alien,Note
`),
    ).toEqual([
      { name: "Heat", year: 1995, notes: null, position: 1 },
      { name: "Alien", year: 1979, notes: "Note", position: 2 },
    ]);
  });
});

describe("parseDiaryCsv", () => {
  it("parses entries with ratings, rewatch, and tags", () => {
    const entries = parseDiaryCsv(DIARY_CSV);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      name: "Heat",
      year: 1995,
      watchedOn: "2026-01-04",
      rating: 9,
      review: null,
      rewatch: false,
      tags: ["crime"],
      liked: false,
      containsSpoilers: false,
    });
    expect(entries[1]?.rewatch).toBe(true);
    expect(entries[1]?.tags).toEqual(["crime", "rewatch club"]);
    expect(entries[2]?.rating).toBeNull();
  });
});

describe("parseReviewsCsv", () => {
  it("preserves multi-line review text with embedded quotes", () => {
    const entries = parseReviewsCsv(REVIEWS_CSV);
    expect(entries[0]?.review).toContain('"You want to be making moves');
    expect(entries[0]?.review).toContain("\n");
  });
});

describe("parseRatingsCsv", () => {
  it("parses standing ratings", () => {
    const ratings = parseRatingsCsv(RATINGS_CSV);
    expect(ratings).toEqual([
      { name: "Heat", year: 1995, rating: 9 },
      { name: "Mulholland Drive", year: 2001, rating: 10 },
    ]);
  });
});

describe("parseWatchlistCsv", () => {
  it("parses watchlist films", () => {
    expect(parseWatchlistCsv(WATCHLIST_CSV)).toEqual([
      { name: "Stalker", year: 1979 },
    ]);
  });
});

describe("mergeImport", () => {
  it("folds reviews into matching diary entries and applies likes", () => {
    const merged = mergeImport(
      parseDiaryCsv(DIARY_CSV),
      parseReviewsCsv(REVIEWS_CSV),
      parseLikedFilmsCsv(LIKES_CSV),
    );
    const heatFirst = merged.find((entry) => entry.watchedOn === "2026-01-04");
    expect(heatFirst?.review).toContain("Pacino and De Niro");
    expect(heatFirst?.liked).toBe(true);

    const alien = merged.find((entry) => entry.name === "Alien");
    expect(alien?.review).toBe("Still perfect.");
    expect(alien?.liked).toBe(false);

    expect(merged).toHaveLength(4);
  });
});
