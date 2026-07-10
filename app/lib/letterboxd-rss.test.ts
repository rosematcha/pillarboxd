import { describe, expect, it } from "vitest";

import { letterboxdRssUrl, parseLetterboxdRss } from "./letterboxd-rss";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:letterboxd="https://letterboxd.com" xmlns:tmdb="https://themoviedb.org">
<channel>
  <item> <title>Mamma Mia!, 2008 - ★★★★½</title> <link>https://letterboxd.com/rosematcha/film/mamma-mia/1/</link> <guid isPermaLink="false">letterboxd-review-1</guid> <pubDate>Sun, 5 Jul 2026 16:02:41 +1200</pubDate> <letterboxd:watchedDate>2026-07-04</letterboxd:watchedDate> <letterboxd:rewatch>Yes</letterboxd:rewatch> <letterboxd:filmTitle>Mamma Mia!</letterboxd:filmTitle> <letterboxd:filmYear>2008</letterboxd:filmYear> <letterboxd:memberRating>4.5</letterboxd:memberRating> <letterboxd:memberLike>Yes</letterboxd:memberLike> <tmdb:movieId>11631</tmdb:movieId> <description><![CDATA[ <p><img src="https://a.ltrbxd.com/poster.jpg"/></p> <p>awful dancing &amp; great fun.</p><p>second paragraph</p> ]]></description> <dc:creator>reese</dc:creator> </item>
  <item> <title>My Dinner with Andre, 1981 - ★★★½</title> <link>https://letterboxd.com/rosematcha/film/my-dinner-with-andre/</link> <guid isPermaLink="false">letterboxd-watch-2</guid> <pubDate>Wed, 20 May 2026 06:47:13 +1200</pubDate> <letterboxd:watchedDate>2026-05-17</letterboxd:watchedDate> <letterboxd:rewatch>No</letterboxd:rewatch> <letterboxd:filmTitle>My Dinner with Andre</letterboxd:filmTitle> <letterboxd:filmYear>1981</letterboxd:filmYear> <letterboxd:memberRating>3.5</letterboxd:memberRating> <letterboxd:memberLike>Yes</letterboxd:memberLike> <tmdb:movieId>25468</tmdb:movieId> <description><![CDATA[ <p><img src="https://a.ltrbxd.com/poster2.jpg"/></p> ]]></description> <dc:creator>reese</dc:creator> </item>
  <item> <title>2026</title> <link>https://letterboxd.com/rosematcha/list/2026/</link> <guid isPermaLink="false">letterboxd-list-3</guid> <pubDate>Mon, 12 Jan 2026 15:28:12 +1300</pubDate> <description><![CDATA[ <p>a ranked list, not a film</p> ]]></description> </item>
</channel>
</rss>`;

describe("letterboxdRssUrl", () => {
  it("builds the member feed url and escapes the username", () => {
    expect(letterboxdRssUrl("rosematcha")).toBe(
      "https://letterboxd.com/rosematcha/rss/",
    );
    expect(letterboxdRssUrl("a b")).toBe("https://letterboxd.com/a%20b/rss/");
  });
});

describe("parseLetterboxdRss", () => {
  const entries = parseLetterboxdRss(RSS);

  it("skips non-film items (published lists) with no tmdb id", () => {
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.tmdbId)).toEqual([11631, 25468]);
  });

  it("parses a review item with rating, like, rewatch, and decoded review", () => {
    const [review] = entries;
    expect(review).toMatchObject({
      tmdbId: 11631,
      name: "Mamma Mia!",
      year: 2008,
      watchedOn: "2026-07-04",
      rating: 9,
      rewatch: true,
      liked: true,
    });
    expect(review?.review).toBe(
      "awful dancing & great fun.\n\nsecond paragraph",
    );
  });

  it("treats a watch item with only a poster as having no review", () => {
    const watch = entries[1];
    expect(watch?.review).toBeNull();
    expect(watch?.rewatch).toBe(false);
    expect(watch?.rating).toBe(7);
  });
});
