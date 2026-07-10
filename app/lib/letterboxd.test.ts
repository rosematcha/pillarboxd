import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  extractLetterboxdCsvs,
  mergeImport,
  parseDiaryCsv,
  parseLikedFilmsCsv,
  parseReviewsCsv,
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
  it("pulls diary, reviews, and likes out of an export zip", () => {
    const zip = zipSync({
      "diary.csv": strToU8(DIARY_CSV),
      "reviews.csv": strToU8(REVIEWS_CSV),
      "likes/films.csv": strToU8(LIKES_CSV),
      "watchlist.csv": strToU8("Date,Name,Year\n"),
    });
    const csvs = extractLetterboxdCsvs(zip);
    expect(csvs.diary).toBe(DIARY_CSV);
    expect(csvs.reviews).toBe(REVIEWS_CSV);
    expect(csvs.likes).toBe(LIKES_CSV);
  });

  it("returns undefined for files the export omits", () => {
    const zip = zipSync({ "diary.csv": strToU8(DIARY_CSV) });
    const csvs = extractLetterboxdCsvs(zip);
    expect(csvs.diary).toBe(DIARY_CSV);
    expect(csvs.reviews).toBeUndefined();
    expect(csvs.likes).toBeUndefined();
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
