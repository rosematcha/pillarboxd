import { Link, data } from "react-router";

import { FilmActions } from "~/components/film-actions";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterImage } from "~/components/poster-image";
import { PosterTile } from "~/components/poster-tile";
import { ReviewPreview } from "~/components/review-preview";
import { SpoilerText } from "~/components/spoiler-text";
import { StarRating } from "~/components/star-rating";
import { formString } from "~/lib/form";
import { getSession, requireSession } from "~/lib/auth/auth.server";
import { getFilmState, setFilmState } from "~/lib/film-state.server";
import { getOrCreateFilmByTmdbId } from "~/lib/films.server";
import { getListsContainingFilm } from "~/lib/lists.server";
import {
  getFilmEntriesForUser,
  getFilmInstanceActivity,
  getFilmReviews,
} from "~/lib/logs.server";
import { formatShortDate } from "~/lib/dates";
import { ratingToStars } from "~/lib/letterboxd";
import {
  getSimilarMovies,
  TmdbError,
  tmdbErrorMessage,
} from "~/lib/tmdb/client.server";
import type { Route } from "./+types/film";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `${loaderData.film.title} | pillarboxd` }];
}

function parseTmdbId(raw: string): number {
  const tmdbId = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    throw data("Not found", { status: 404 });
  }
  return tmdbId;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const tmdbId = parseTmdbId(params.tmdbId);
  const session = await getSession(request);
  const username = session?.user.username;
  let film;
  try {
    film = await getOrCreateFilmByTmdbId(tmdbId);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) {
      throw data("Film not found", { status: 404 });
    }
    throw data(tmdbErrorMessage(error), { status: 503 });
  }
  const [entries, instanceActivity, reviews, filmState, containingLists] =
    await Promise.all([
      session === null
        ? Promise.resolve([])
        : getFilmEntriesForUser(session.user.id, film.id),
      getFilmInstanceActivity(film.id),
      getFilmReviews(film.id, 8),
      session === null
        ? Promise.resolve(null)
        : getFilmState(session.user.id, film.id),
      getListsContainingFilm(film.id, {
        viewerUserId: session?.user.id ?? null,
      }),
    ]);

  const similar = await getSimilarMovies(tmdbId).catch(() => []);

  return {
    user: username === null || username === undefined ? null : { username },
    film: {
      id: film.id,
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      overview: film.overview,
      runtimeMinutes: film.runtimeMinutes,
      directors: film.directors,
      genres: film.genres,
      cast: film.cast,
      imdbId: film.imdbId,
    },
    state: {
      watched: filmState?.watched ?? false,
      liked: filmState?.liked ?? false,
      watchlisted: filmState?.watchlisted ?? false,
      rating: filmState?.rating ?? null,
    },
    averageRating: instanceActivity.averageRating,
    ratedCount: instanceActivity.ratedCount,
    histogram: instanceActivity.histogram,
    instanceActivity: {
      total: instanceActivity.total,
      rows: instanceActivity.rows.flatMap((row) =>
        row.username === null
          ? []
          : [
              {
                id: row.id,
                username: row.username,
                rating: row.rating,
                watchedOn: row.watchedOn,
                review: row.review,
                liked: row.liked,
                containsSpoilers: row.containsSpoilers,
              },
            ],
      ),
    },
    lists: containingLists.flatMap((list) =>
      list.username === null
        ? []
        : [
            {
              id: list.id,
              name: list.name,
              ranked: list.ranked,
              username: list.username,
            },
          ],
    ),
    similar: similar.map((movie) => {
      const yearRaw = movie.release_date?.slice(0, 4);
      const year =
        yearRaw === undefined || yearRaw === ""
          ? null
          : Number.parseInt(yearRaw, 10);
      return {
        tmdbId: movie.id,
        title: movie.title,
        year: year === null || Number.isNaN(year) ? null : year,
        posterPath: movie.poster_path ?? null,
      };
    }),
    reviews: reviews.flatMap((item) =>
      item.username === null || item.review === null
        ? []
        : [
            {
              id: item.id,
              review: item.review,
              rating: item.rating,
              containsSpoilers: item.containsSpoilers,
              watchedOn: item.watchedOn,
              username: item.username,
              liked: item.liked,
            },
          ],
    ),
    entries: entries.map((entry) => ({
      id: entry.id,
      watchedOn: entry.watchedOn,
      rating: entry.rating,
      review: entry.review,
      liked: entry.liked,
      rewatch: entry.rewatch,
      containsSpoilers: entry.containsSpoilers,
    })),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  const tmdbId = parseTmdbId(params.tmdbId);
  let film;
  try {
    film = await getOrCreateFilmByTmdbId(tmdbId);
  } catch (error) {
    return data({ error: tmdbErrorMessage(error) }, { status: 400 });
  }
  const form = await request.formData();
  const intent = formString(form, "intent");
  const current = await getFilmState(session.user.id, film.id);

  if (intent === "toggle-watched") {
    await setFilmState(session.user.id, film.id, {
      watched: !(current?.watched ?? false),
    });
    return data({ ok: true });
  }
  if (intent === "toggle-liked") {
    await setFilmState(session.user.id, film.id, {
      liked: !(current?.liked ?? false),
    });
    return data({ ok: true });
  }
  if (intent === "toggle-watchlist") {
    await setFilmState(session.user.id, film.id, {
      watchlisted: !(current?.watchlisted ?? false),
    });
    return data({ ok: true });
  }
  if (intent === "set-rating") {
    const ratingRaw = formString(form, "rating");
    const rating = ratingRaw === "" ? null : Number(ratingRaw);
    if (
      rating !== null &&
      (!Number.isInteger(rating) || rating < 1 || rating > 10)
    ) {
      return data({ error: "Invalid rating." }, { status: 400 });
    }
    await setFilmState(session.user.id, film.id, { rating });
    return data({ ok: true });
  }
  return data({ error: "Unknown action." }, { status: 400 });
}

export default function Film({ loaderData }: Route.ComponentProps) {
  const {
    film,
    user,
    entries,
    reviews,
    state,
    averageRating,
    ratedCount,
    histogram,
    instanceActivity,
    lists,
    similar,
  } = loaderData;
  const maxHistogram = Math.max(1, ...histogram.map((bucket) => bucket.count));

  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <section className="gap-section grid lg:grid-cols-[12rem_1fr_14rem]">
          <div className="gap-block flex flex-col sm:flex-row lg:flex-col">
            <div className="rounded-poster w-full max-w-48 overflow-hidden">
              <PosterImage
                title={film.title}
                alt={`Poster for ${film.title}`}
                url={
                  film.posterPath === null
                    ? null
                    : `https://image.tmdb.org/t/p/w342${film.posterPath}`
                }
                className="aspect-[2/3]"
              />
            </div>
            <div className="gap-tight flex flex-col lg:hidden">
              <h1 className="font-heading text-2xl">
                {film.title}
                {film.year !== null && (
                  <span className="ml-tight text-faint font-normal">
                    {String(film.year)}
                  </span>
                )}
              </h1>
              <p className="text-muted text-sm">
                {film.directors.length > 0 && (
                  <>Directed by {film.directors.join(", ")}</>
                )}
                {film.directors.length > 0 &&
                  film.runtimeMinutes !== null &&
                  " · "}
                {film.runtimeMinutes !== null &&
                  `${String(film.runtimeMinutes)} min`}
              </p>
              {film.genres.length > 0 && (
                <p className="text-faint text-sm">{film.genres.join(" · ")}</p>
              )}
            </div>
          </div>

          <div className="gap-block order-3 flex max-w-[42rem] flex-col lg:order-none">
            <div className="gap-tight hidden flex-col lg:flex">
              <h1 className="font-heading text-2xl">
                {film.title}
                {film.year !== null && (
                  <span className="ml-tight text-faint font-normal">
                    {String(film.year)}
                  </span>
                )}
              </h1>
              <p className="text-muted text-sm">
                {film.directors.length > 0 && (
                  <>Directed by {film.directors.join(", ")}</>
                )}
                {film.directors.length > 0 &&
                  film.runtimeMinutes !== null &&
                  " · "}
                {film.runtimeMinutes !== null &&
                  `${String(film.runtimeMinutes)} min`}
              </p>
              {film.genres.length > 0 && (
                <p className="text-faint text-sm">{film.genres.join(" · ")}</p>
              )}
            </div>
            {film.overview !== null && (
              <p className="text-muted max-w-[70ch] text-sm leading-relaxed">
                {film.overview}
              </p>
            )}
            {averageRating !== null && ratedCount > 0 && (
              <div className="gap-related flex flex-col">
                <p className="text-muted text-sm">
                  Average rating on this instance:{" "}
                  <span className="text-gold tabular-nums">
                    {ratingToStars(averageRating).toFixed(1)}
                  </span>{" "}
                  from {String(ratedCount)}{" "}
                  {ratedCount === 1 ? "rating" : "ratings"}
                </p>
                <div
                  className="flex h-8 items-end gap-px"
                  aria-label="Rating distribution"
                >
                  {histogram.map((bucket) => (
                    <div
                      key={bucket.rating}
                      title={`${String(ratingToStars(bucket.rating))}★ · ${String(bucket.count)}`}
                      className="bg-gold/70 min-w-0 flex-1"
                      style={{
                        height: `${String(Math.max(8, Math.round((bucket.count / maxHistogram) * 100)))}%`,
                        opacity: bucket.count === 0 ? 0.15 : 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {film.cast.length > 0 && (
              <section className="gap-tight flex flex-col">
                <h2 className="font-heading text-base">Cast</h2>
                <ul className="text-muted gap-tight flex flex-col text-sm">
                  {film.cast.slice(0, 8).map((member) => (
                    <li key={`${member.name}-${member.character ?? ""}`}>
                      <span className="text-text">{member.name}</span>
                      {member.character !== null && (
                        <span className="text-faint">
                          {" "}
                          as {member.character}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(film.imdbId !== null || film.tmdbId > 0) && (
              <p className="text-faint gap-related flex flex-wrap text-xs">
                <a
                  href={`https://www.themoviedb.org/movie/${String(film.tmdbId)}`}
                  className="hover:text-accent"
                >
                  TMDB
                </a>
                {film.imdbId !== null && (
                  <a
                    href={`https://www.imdb.com/title/${film.imdbId}/`}
                    className="hover:text-accent"
                  >
                    IMDb
                  </a>
                )}
              </p>
            )}

            {instanceActivity.rows.length > 0 && (
              <section className="gap-block border-border pt-section flex flex-col border-t">
                <h2 className="font-heading text-lg">Logged by</h2>
                <p className="text-muted text-sm">
                  {String(instanceActivity.total)}{" "}
                  {instanceActivity.total === 1 ? "person has" : "people have"}{" "}
                  logged this film on this instance.
                </p>
                <ul className="flex flex-col">
                  {instanceActivity.rows.map((row) => {
                    const initial = row.username.slice(0, 1).toLowerCase();
                    const excerpt =
                      row.review === null
                        ? null
                        : row.review.length > 160
                          ? `${row.review.slice(0, 160).trimEnd()}…`
                          : row.review;
                    return (
                      <li
                        key={row.id}
                        className="gap-block border-border py-block flex items-start border-b text-sm last:border-0"
                      >
                        <Link
                          to={`/u/${row.username}`}
                          aria-label={`View @${row.username}'s profile`}
                          className="size-step border-accent/25 bg-accent/10 text-accent flex shrink-0 items-center justify-center rounded-full border text-xs font-medium"
                        >
                          {initial}
                        </Link>
                        <div className="gap-tight flex min-w-0 flex-1 flex-col">
                          <p>
                            <Link
                              to={`/u/${row.username}`}
                              className="font-medium"
                            >
                              {row.username}
                            </Link>
                            {row.rating !== null && (
                              <>
                                {" "}
                                <StarRating
                                  rating={row.rating / 2}
                                  className="inline-flex"
                                />
                              </>
                            )}
                            {row.liked && (
                              <span
                                className="text-accent ml-tight"
                                aria-label="Liked"
                              >
                                ♥
                              </span>
                            )}
                            <Link
                              to={`/entries/${row.id}`}
                              className="text-faint hover:text-accent ml-related text-xs tabular-nums"
                            >
                              {formatShortDate(row.watchedOn, {
                                includeYear: true,
                              })}
                            </Link>
                          </p>
                          {excerpt !== null && (
                            <p className="text-muted leading-relaxed">
                              <SpoilerText
                                containsSpoilers={row.containsSpoilers}
                              >
                                {excerpt}
                              </SpoilerText>
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {reviews.length > 0 && (
              <section className="gap-block border-border pt-section flex flex-col border-t">
                <h2 className="font-heading text-lg">Recent reviews</h2>
                <div>
                  {reviews.map((review) => (
                    <ReviewPreview
                      key={review.id}
                      id={review.id}
                      username={review.username}
                      tmdbId={film.tmdbId}
                      filmTitle={film.title}
                      filmYear={film.year}
                      rating={review.rating}
                      review={review.review}
                      containsSpoilers={review.containsSpoilers}
                      watchedOn={review.watchedOn}
                    />
                  ))}
                </div>
              </section>
            )}

            {lists.length > 0 && (
              <section className="gap-block border-border pt-section flex flex-col border-t">
                <h2 className="font-heading text-lg">Appears on lists</h2>
                <ul className="gap-tight flex flex-col text-sm">
                  {lists.map((list) => (
                    <li key={list.id}>
                      <Link
                        to={`/lists/${list.id}`}
                        className="text-accent font-medium"
                      >
                        {list.name}
                      </Link>
                      <span className="text-faint">
                        {" "}
                        by{" "}
                        <Link
                          to={`/u/${list.username}`}
                          className="hover:text-accent"
                        >
                          @{list.username}
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {similar.length > 0 && (
              <section className="gap-block border-border pt-section flex flex-col border-t">
                <h2 className="font-heading text-lg">Similar films</h2>
                <div className="gap-block grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8">
                  {similar.map((movie) => (
                    <PosterTile
                      key={movie.tmdbId}
                      to={`/film/${String(movie.tmdbId)}`}
                      title={movie.title}
                      year={movie.year}
                      posterUrl={
                        movie.posterPath === null
                          ? null
                          : `https://image.tmdb.org/t/p/w185${movie.posterPath}`
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {entries.length > 0 && (
              <section className="gap-block border-border pt-section flex flex-col border-t">
                <h2 className="font-heading text-lg">Your diary entries</h2>
                <ul className="flex flex-col">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="gap-tight border-border py-block flex flex-col border-b text-sm"
                    >
                      <div className="gap-related text-faint flex flex-wrap items-center">
                        <Link
                          to={`/entries/${entry.id}`}
                          className="text-accent tabular-nums"
                        >
                          {formatShortDate(entry.watchedOn, {
                            includeYear: true,
                          })}
                        </Link>
                        {entry.rating !== null && (
                          <StarRating rating={entry.rating / 2} />
                        )}
                        {entry.liked && (
                          <span className="text-accent" aria-label="Liked">
                            ♥
                          </span>
                        )}
                        {entry.rewatch && (
                          <span className="gap-tight inline-flex items-center">
                            <span className="bg-sage size-1.5 rounded-full" />
                            Rewatch
                          </span>
                        )}
                        <Link
                          to={`/entries/${entry.id}`}
                          className="text-muted hover:text-accent text-xs"
                        >
                          Edit
                        </Link>
                      </div>
                      {entry.review !== null && (
                        <p className="leading-relaxed">
                          <SpoilerText
                            containsSpoilers={entry.containsSpoilers}
                          >
                            {entry.review}
                          </SpoilerText>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="border-border lg:border-border py-block lg:pl-block order-2 lg:order-none lg:border-l lg:py-0">
            <FilmActions
              tmdbId={film.tmdbId}
              state={state}
              loggedIn={user !== null}
            />
          </aside>
        </section>
      </PageShell>
    </>
  );
}
