import { describe, expect, it } from "vitest";

import { logEntryInputSchema } from "./log-entry";

const validEntry = {
  filmId: "4d3de2c7-b98c-4db4-8466-a1d75189c88e",
  watchedOn: "2024-02-29",
  rating: 8,
  review: null,
  liked: false,
  rewatch: false,
  containsSpoilers: false,
  tags: [],
};

describe("logEntryInputSchema", () => {
  it("accepts real ISO calendar dates", () => {
    expect(logEntryInputSchema.safeParse(validEntry).success).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(
      logEntryInputSchema.safeParse({
        ...validEntry,
        watchedOn: "2023-02-29",
      }).success,
    ).toBe(false);
  });
});
