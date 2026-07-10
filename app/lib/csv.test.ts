import { describe, expect, it } from "vitest";

import { parseCsv, parseCsvRecords } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\nd,e,f")).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""')).toEqual([
      ["a", "b, c", 'say "hi"'],
    ]);
  });

  it("handles newlines inside quoted fields", () => {
    expect(parseCsv('a,"line one\nline two",c')).toEqual([
      ["a", "line one\nline two", "c"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseCsvRecords", () => {
  it("keys cells by header names", () => {
    expect(parseCsvRecords("Name,Year\nHeat,1995")).toEqual([
      { Name: "Heat", Year: "1995" },
    ]);
  });

  it("fills missing trailing cells with empty strings", () => {
    expect(parseCsvRecords("a,b,c\n1,2")).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});
