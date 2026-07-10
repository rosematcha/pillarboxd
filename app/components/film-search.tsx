import { useEffect, useId, useState } from "react";
import { Form, useFetcher, useNavigate, useNavigation } from "react-router";

import {
  canSearchFilms,
  MAXIMUM_FILM_SEARCH_LENGTH,
  normalizeFilmSearchQuery,
} from "~/lib/film-search";
import type { loader as previewLoader } from "~/routes/films.search.preview";

import { Button } from "./button";
import { Input } from "./input";
import { PosterImage } from "./poster-image";

const SEARCH_DEBOUNCE_MS = 200;
const LOADING_FEEDBACK_DELAY_MS = 150;

type PreviewData = Awaited<ReturnType<typeof previewLoader>>;

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
  const { load, reset } = fetcher;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const listboxId = useId();
  const statusId = useId();
  const [previousData, setPreviousData] = useState<PreviewData | undefined>();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
  const normalizedQuery = normalizeFilmSearchQuery(query);
  const canSearch = canSearchFilms(normalizedQuery);
  const dataMatchesQuery = fetcher.data?.query === normalizedQuery;
  const currentData = dataMatchesQuery ? fetcher.data : undefined;
  const displayedData = currentData ?? previousData;
  const results = displayedData?.results ?? [];
  const isLoading = canSearch && fetcher.state !== "idle";
  const isUpdating = canSearch && displayedData?.query !== normalizedQuery;
  const showLoading = isLoading && loadingQuery === normalizedQuery;
  const showPreview =
    open &&
    canSearch &&
    (results.length > 0 || currentData !== undefined || showLoading);
  const isNavigatingToSearch =
    navigation.state !== "idle" &&
    navigation.formAction?.endsWith("/films/search") === true;

  useEffect(() => {
    if (!open || !canSearch || dataMatchesQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void load(
        `/films/search/preview?q=${encodeURIComponent(normalizedQuery)}`,
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [canSearch, dataMatchesQuery, load, normalizedQuery, open]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setLoadingQuery(normalizedQuery);
    }, LOADING_FEEDBACK_DELAY_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLoading, normalizedQuery]);

  const selectFilm = (tmdbId: number): void => {
    setOpen(false);
    void navigate(`/film/${String(tmdbId)}`, { viewTransition: false });
  };

  return (
    <div
      className={["relative min-w-0", className].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <Form
        method="get"
        action="/films/search"
        role="search"
        className="gap-related flex"
        onSubmit={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Input
            type="search"
            role="combobox"
            name="q"
            value={query}
            maxLength={MAXIMUM_FILM_SEARCH_LENGTH}
            placeholder="Search films"
            aria-label="Search films"
            aria-autocomplete="list"
            aria-controls={showPreview ? listboxId : undefined}
            aria-describedby={showPreview ? statusId : undefined}
            aria-expanded={showPreview}
            aria-activedescendant={
              activeIndex >= 0
                ? `${listboxId}-option-${String(activeIndex)}`
                : undefined
            }
            className={["min-w-0", inputClassName].filter(Boolean).join(" ")}
            onChange={(event) => {
              if (fetcher.data !== undefined) {
                setPreviousData(fetcher.data);
              }
              reset({ reason: "Film search query changed" });
              setQuery(event.currentTarget.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
                return;
              }

              if (results.length === 0 || isUpdating) {
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => (index + 1) % results.length);
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) =>
                  index <= 0 ? results.length - 1 : index - 1,
                );
              }

              if (event.key === "Home" && open) {
                event.preventDefault();
                setActiveIndex(0);
              }

              if (event.key === "End" && open) {
                event.preventDefault();
                setActiveIndex(results.length - 1);
              }

              if (event.key === "Enter" && activeIndex >= 0 && open) {
                event.preventDefault();
                const film = results[activeIndex];
                if (film !== undefined) {
                  selectFilm(film.tmdbId);
                }
              }
            }}
          />

          {showPreview && (
            <div
              className="border-border bg-bg mt-tight p-tight absolute z-10 max-h-[min(60dvh,28rem)] w-full overflow-y-auto border"
              aria-busy={isUpdating || undefined}
            >
              <div
                id={listboxId}
                role="listbox"
                aria-label="Film suggestions"
                className={[
                  "ease-feedback transition-opacity duration-[var(--duration-feedback)]",
                  isUpdating ? "opacity-60" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {results.map((film, index) => (
                  <button
                    key={film.tmdbId}
                    id={`${listboxId}-option-${String(index)}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    disabled={isUpdating}
                    aria-selected={activeIndex === index}
                    className={[
                      "gap-related rounded-control hover:bg-bg-subtle focus-visible:bg-bg-subtle px-tight py-related ease-feedback focus-visible:ring-accent/30 flex w-full items-center text-left transition-colors duration-[var(--duration-feedback)] focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait",
                      activeIndex === index ? "bg-bg-subtle" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onMouseMove={() => {
                      if (!isUpdating) {
                        setActiveIndex(index);
                      }
                    }}
                    onClick={() => {
                      selectFilm(film.tmdbId);
                    }}
                  >
                    <PosterImage
                      title={film.title}
                      alt=""
                      loading="eager"
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
              </div>

              {showLoading && results.length === 0 && (
                <div className="gap-related px-tight py-related flex items-center">
                  <span
                    aria-hidden="true"
                    className="bg-bg-subtle rounded-poster block aspect-[2/3] w-8 shrink-0"
                  />
                  <span className="text-muted text-sm">Searching films…</span>
                </div>
              )}

              {!isLoading &&
                currentData?.error !== null &&
                currentData?.error !== undefined && (
                  <p
                    role="alert"
                    className="text-error px-tight py-related text-sm"
                  >
                    {currentData.error}
                  </p>
                )}

              {!isLoading &&
                currentData?.error === null &&
                currentData.results.length === 0 && (
                  <p className="text-muted px-tight py-related text-sm">
                    No films matched “{normalizedQuery}”.
                  </p>
                )}

              {results.length > 0 && (
                <button
                  type="button"
                  className="border-border text-accent hover:text-text mt-tight px-tight py-related ease-feedback focus-visible:ring-accent/30 w-full border-t text-left text-sm font-medium transition-colors duration-[var(--duration-feedback)] focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => {
                    setOpen(false);
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
        {submitLabel !== undefined && (
          <Button
            type="submit"
            loading={isNavigatingToSearch}
            loadingLabel="Searching"
          >
            {submitLabel}
          </Button>
        )}
      </Form>
      <span id={statusId} className="sr-only" aria-live="polite">
        {isLoading
          ? "Searching films"
          : currentData !== undefined
            ? `${String(currentData.results.length)} film suggestions available`
            : ""}
      </span>
    </div>
  );
}
