import { z } from "zod";

const searchResultSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  original_title: z.string().optional(),
  release_date: z.string().optional(),
  poster_path: z.string().nullish(),
  overview: z.string().optional(),
});

export const searchResponseSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  total_results: z.number().int(),
  results: z.array(searchResultSchema),
});

export const movieDetailsSchema = z.object({
  id: z.number().int(),
  imdb_id: z.string().nullish(),
  title: z.string(),
  original_title: z.string().optional(),
  release_date: z.string().optional(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  overview: z.string().optional(),
  runtime: z.number().int().nullish(),
  genres: z
    .array(z.object({ id: z.number().int(), name: z.string() }))
    .optional(),
  credits: z
    .object({
      cast: z
        .array(
          z.object({
            name: z.string(),
            character: z.string().nullish(),
            order: z.number().int().optional(),
          }),
        )
        .optional(),
      crew: z.array(
        z.object({
          name: z.string(),
          job: z.string(),
        }),
      ),
    })
    .optional(),
});

export type TmdbSearchResponse = z.infer<typeof searchResponseSchema>;
export type TmdbMovieDetails = z.infer<typeof movieDetailsSchema>;

export interface FilmValues {
  tmdbId: number;
  imdbId: string | null;
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  runtimeMinutes: number | null;
  directors: string[];
  genres: string[];
  cast: { name: string; character: string | null }[];
}

export function releaseYear(releaseDate: string | undefined): number | null {
  if (releaseDate === undefined || releaseDate === "") {
    return null;
  }
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

export function movieDetailsToFilm(details: TmdbMovieDetails): FilmValues {
  const directors = (details.credits?.crew ?? [])
    .filter((member) => member.job === "Director")
    .map((member) => member.name);
  const cast = [...(details.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 12)
    .map((member) => ({
      name: member.name,
      character: member.character ?? null,
    }));
  return {
    tmdbId: details.id,
    imdbId: details.imdb_id ?? null,
    title: details.title,
    originalTitle: details.original_title ?? null,
    year: releaseYear(details.release_date),
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    overview: details.overview ?? null,
    runtimeMinutes: details.runtime ?? null,
    directors,
    genres: (details.genres ?? []).map((genre) => genre.name),
    cast,
  };
}
