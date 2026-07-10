export const MINIMUM_FILM_SEARCH_LENGTH = 2;
export const MAXIMUM_FILM_SEARCH_LENGTH = 100;

export function normalizeFilmSearchQuery(value: string | null): string {
  return (value ?? "").trim().slice(0, MAXIMUM_FILM_SEARCH_LENGTH);
}

export function canSearchFilms(query: string): boolean {
  return query.length >= MINIMUM_FILM_SEARCH_LENGTH;
}
