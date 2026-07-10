import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./concurrency";
import { formatRelativeTime, formatShortDate } from "./dates";

describe("formatShortDate", () => {
  it("formats ISO dates in short month style", () => {
    expect(formatShortDate("2026-07-04")).toBe("Jul 4");
    expect(formatShortDate("2026-07-04", { includeYear: true })).toBe(
      "Jul 4, 2026",
    );
  });
});

describe("formatRelativeTime", () => {
  it("returns relative labels for recent timestamps", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toMatch(/hour/);
  });
});

describe("mapWithConcurrency", () => {
  it("preserves result order", async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, (value) =>
      Promise.resolve(value * 2),
    );
    expect(results).toEqual([2, 4, 6]);
  });
});
