import { type ImportedEntry, starsToRating } from "./letterboxd";

/**
 * Parsing for a Letterboxd member's public RSS feed
 * (`https://letterboxd.com/<username>/rss/`). Unlike the CSV export, RSS items
 * carry the TMDB id directly, so films match exactly without a name/year
 * search. The feed only holds the ~50 most recent diary entries and reviews —
 * full history still needs the export zip.
 */

/** Max entries Letterboxd includes in a member RSS feed. */
export const LETTERBOXD_RSS_MAX_ENTRIES = 50;

/** An imported entry that already knows its TMDB id (from the RSS feed). */
export interface RssImportedEntry extends ImportedEntry {
  tmdbId: number;
}

export function letterboxdRssUrl(username: string): string {
  return `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
}

function firstMatch(source: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(source);
  return match === null ? null : (match[1] ?? null);
}

function cdata(source: string, tag: string): string | null {
  const match = new RegExp(
    `<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
  ).exec(source);
  return match === null ? null : (match[1] ?? null);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Turn an RSS item's HTML description into plain review text. The description
 * leads with a poster `<img>` paragraph (dropped here); paragraphs become
 * blank-line-separated text. Returns null when there is no review body.
 */
function reviewText(description: string | null): string | null {
  if (description === null) {
    return null;
  }
  const body = description
    .replace(/<p>\s*<img[\s\S]*?<\/p>/gi, "")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const text = decodeEntities(body).trim();
  return text === "" ? null : text;
}

function parseYear(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const year = Number.parseInt(value, 10);
  return Number.isNaN(year) ? null : year;
}

function parseRating(value: string | null): number | null {
  if (value === null || value === "") {
    return null;
  }
  const stars = Number.parseFloat(value);
  return Number.isNaN(stars) ? null : starsToRating(stars);
}

function parseDate(value: string | null): string | null {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Parse a Letterboxd member RSS feed into importable entries. Non-film items
 * (published lists, which carry no `tmdb:movieId`) are skipped.
 */
export function parseLetterboxdRss(xml: string): RssImportedEntry[] {
  const entries: RssImportedEntry[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = match[1] ?? "";
    const tmdbRaw = firstMatch(item, "tmdb:movieId");
    if (tmdbRaw === null) {
      continue;
    }
    const tmdbId = Number.parseInt(tmdbRaw, 10);
    if (Number.isNaN(tmdbId)) {
      continue;
    }
    entries.push({
      tmdbId,
      name: decodeEntities(firstMatch(item, "letterboxd:filmTitle") ?? ""),
      year: parseYear(firstMatch(item, "letterboxd:filmYear")),
      watchedOn: parseDate(firstMatch(item, "letterboxd:watchedDate")),
      rating: parseRating(firstMatch(item, "letterboxd:memberRating")),
      review: reviewText(cdata(item, "description")),
      rewatch: firstMatch(item, "letterboxd:rewatch") === "Yes",
      tags: [],
      liked: firstMatch(item, "letterboxd:memberLike") === "Yes",
      containsSpoilers: false,
    });
  }
  return entries;
}
