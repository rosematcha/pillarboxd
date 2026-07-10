import { useEffect, useId, useState } from "react";
import { Form, useFetcher, useNavigate } from "react-router";

import type { loader as previewLoader } from "~/routes/films.search.preview";

import { Button } from "./button";
import { Input } from "./input";
import { PosterImage } from "./poster-image";

const MINIMUM_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

export function FilmSearch({
  className,
  defaultValue = "",
  inputClassName,
  submitLabel,
}: {
  className?: string;
  defaultValue?: string;
  inputClassName?: string;
  submitLabel?: string;
}): React.ReactElement {
  const fetcher = useFetcher<typeof previewLoader>();
  const navigate = useNavigate();
  const listboxId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= MINIMUM_QUERY_LENGTH;
  const dataMatchesQuery = fetcher.data?.query === normalizedQuery;
  const previewData = dataMatchesQuery ? fetcher.data : undefined;
  const results = previewData?.results ?? [];
  const isLoading = canSearch && fetcher.state !== "idle";
  const showPreview = focused && canSearch && (isLoading || dataMatchesQuery);

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetcher.load(
        `/films/search/preview?q=${encodeURIComponent(normalizedQuery)}`,
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [canSearch, fetcher, normalizedQuery]);

  const selectFilm = (tmdbId: number): void => {
    setFocused(false);
    void navigate(`/film/${String(tmdbId)}`, { viewTransition: false });
  };

  return (
    <div
      className={["relative min-w-0", className].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
          setActiveIndex(-1);
        }
      }}
    >
      <Form
        method="get"
        action="/films/search"
        role="search"
        className="gap-related flex"
      >
        <Input
          type="search"
          name="q"
          value={query}
          placeholder="Search films"
          aria-label="Search films"
          aria-autocomplete="list"
          aria-controls={showPreview ? listboxId : undefined}
          aria-expanded={showPreview}
          aria-activedescendant={
            activeIndex >= 0
              ? `${listboxId}-option-${String(activeIndex)}`
              : undefined
          }
          className={["min-w-0 flex-1", inputClassName]
            .filter(Boolean)
            .join(" ")}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setFocused(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setFocused(false);
              setActiveIndex(-1);
              return;
            }

            if (results.length === 0) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % results.length);
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) =>
                index <= 0 ? results.length - 1 : index - 1,
              );
            }

            if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              const film = results[activeIndex];
              if (film !== undefined) {
                selectFilm(film.tmdbId);
              }
            }
          }}
        />
        {submitLabel !== undefined && (
          <Button type="submit">{submitLabel}</Button>
        )}
      </Form>

      {showPreview && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Film suggestions"
          className="border-border bg-bg gap-tight mt-tight p-tight absolute z-10 max-h-[min(60dvh,28rem)] w-full overflow-y-auto border"
        >
          {isLoading && (
            <p role="status" className="text-muted px-tight py-related text-sm">
              Searching films…
            </p>
          )}
          {!isLoading &&
            previewData?.error !== null &&
            previewData?.error !== undefined && (
              <p
                role="alert"
                className="text-error px-tight py-related text-sm"
              >
                {previewData.error}
              </p>
            )}
          {!isLoading &&
            dataMatchesQuery &&
            previewData?.error === null &&
            results.length === 0 && (
              <p className="text-muted px-tight py-related text-sm">
                No films matched “{normalizedQuery}”.
              </p>
            )}
          {!isLoading &&
            results.map((film, index) => (
              <button
                key={film.tmdbId}
                id={`${listboxId}-option-${String(index)}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={[
                  "gap-related rounded-control hover:bg-bg-subtle focus-visible:bg-bg-subtle px-tight py-related ease-feedback focus-visible:ring-accent/30 flex w-full items-center text-left transition-colors duration-[var(--duration-feedback)] focus-visible:ring-2 focus-visible:outline-none",
                  activeIndex === index ? "bg-bg-subtle" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseMove={() => {
                  setActiveIndex(index);
                }}
                onClick={() => {
                  selectFilm(film.tmdbId);
                }}
              >
                <PosterImage
                  title={film.title}
                  alt=""
                  url={
                    film.posterPath === null
                      ? null
                      : `https://image.tmdb.org/t/p/w92${film.posterPath}`
                  }
                  className="rounded-poster aspect-[2/3] w-8 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {film.title}
                  </span>
                  {film.year !== null && (
                    <span className="text-faint block text-xs">
                      {String(film.year)}
                    </span>
                  )}
                </span>
              </button>
            ))}
          {!isLoading && results.length > 0 && (
            <button
              type="button"
              className="text-accent hover:text-text px-tight py-related ease-feedback focus-visible:ring-accent/30 w-full text-left text-sm font-medium transition-colors duration-[var(--duration-feedback)] focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => {
                setFocused(false);
                void navigate(
                  `/films/search?q=${encodeURIComponent(normalizedQuery)}`,
                  { viewTransition: false },
                );
              }}
            >
              See all results for “{normalizedQuery}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
