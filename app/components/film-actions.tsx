import { Link, useFetcher } from "react-router";

import { StarRatingInput } from "~/components/star-rating-input";
import { buttonStyles } from "~/components/button";

export interface FilmActionsState {
  watched: boolean;
  liked: boolean;
  watchlisted: boolean;
  rating: number | null;
}

export function FilmActions({
  tmdbId,
  state,
  loggedIn,
}: {
  tmdbId: number;
  state: FilmActionsState;
  loggedIn: boolean;
}): React.ReactElement {
  const fetcher = useFetcher();
  const intentValue = fetcher.formData?.get("intent");
  const pendingIntent =
    fetcher.state !== "idle" && typeof intentValue === "string"
      ? intentValue
      : "";

  const loginTo = `/login?redirectTo=/film/${String(tmdbId)}`;

  if (!loggedIn) {
    return (
      <div className="gap-block flex flex-col">
        <Link to={loginTo} className={buttonStyles("primary", "self-start")}>
          Log this film
        </Link>
        <p className="text-muted text-sm">
          Sign in to mark watched, like, or add to your watchlist.
        </p>
      </div>
    );
  }

  const toggleClass = (active: boolean, activeColor: string): string =>
    [
      "gap-tight inline-flex items-center text-sm font-medium transition-colors duration-[var(--duration-feedback)] ease-feedback focus-visible:ring-accent rounded-control focus-visible:ring-2 focus-visible:outline-none",
      active ? activeColor : "text-muted hover:text-text",
    ].join(" ");

  return (
    <div className="gap-section flex flex-col">
      <div className="gap-block flex flex-col">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="toggle-watched" />
          <button
            type="submit"
            disabled={pendingIntent === "toggle-watched"}
            className={toggleClass(state.watched, "text-sage")}
            aria-pressed={state.watched}
          >
            <span
              aria-hidden="true"
              className={[
                "size-1.5 rounded-full",
                state.watched ? "bg-sage" : "bg-border",
              ].join(" ")}
            />
            {state.watched ? "Watched" : "Mark watched"}
          </button>
        </fetcher.Form>

        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="toggle-liked" />
          <button
            type="submit"
            disabled={pendingIntent === "toggle-liked"}
            className={toggleClass(state.liked, "text-accent")}
            aria-pressed={state.liked}
          >
            <span aria-hidden="true">{state.liked ? "♥" : "♡"}</span>
            {state.liked ? "Liked" : "Like"}
          </button>
        </fetcher.Form>

        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="toggle-watchlist" />
          <button
            type="submit"
            disabled={pendingIntent === "toggle-watchlist"}
            className={toggleClass(state.watchlisted, "text-sage")}
            aria-pressed={state.watchlisted}
          >
            <span
              aria-hidden="true"
              className={[
                "size-1.5 rounded-full",
                state.watchlisted ? "bg-sage" : "bg-border",
              ].join(" ")}
            />
            {state.watchlisted ? "Watchlisted" : "Watchlist"}
          </button>
        </fetcher.Form>
      </div>

      <fetcher.Form method="post" className="gap-tight flex flex-col">
        <input type="hidden" name="intent" value="set-rating" />
        <p className="text-muted text-xs font-medium">Your rating</p>
        <StarRatingInput name="rating" defaultValue={state.rating} />
        <button
          type="submit"
          className={buttonStyles("secondary", "self-start")}
          disabled={pendingIntent === "set-rating"}
        >
          Save rating
        </button>
      </fetcher.Form>

      <Link
        to={`/film/${String(tmdbId)}/log`}
        className={buttonStyles("primary", "self-start")}
      >
        Log / review
      </Link>
    </div>
  );
}
