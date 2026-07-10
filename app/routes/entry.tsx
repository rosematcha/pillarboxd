import { Form, Link, data, redirect } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { Field, Input, Textarea } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterImage } from "~/components/poster-image";
import { SpoilerText } from "~/components/spoiler-text";
import { StarRating } from "~/components/star-rating";
import { StarRatingInput } from "~/components/star-rating-input";
import { formString } from "~/lib/form";
import { getSession, requireSession } from "~/lib/auth/auth.server";
import { formatShortDate } from "~/lib/dates";
import {
  deleteLogEntry,
  getLogEntryDetail,
  logEntryInputSchema,
  updateLogEntry,
} from "~/lib/logs.server";
import type { Route } from "./+types/entry";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [
    {
      title: `${loaderData.film.title} · @${loaderData.username} | pillarboxd`,
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const detail = await getLogEntryDetail(params.entryId);
  if (detail === null) {
    throw data("Not found", { status: 404 });
  }
  const session = await getSession(request);
  const viewerUsername = session?.user.username;
  const isOwner = session?.user.id === detail.entry.userId;
  return {
    user:
      viewerUsername === null || viewerUsername === undefined
        ? null
        : { username: viewerUsername },
    isOwner,
    entry: {
      id: detail.entry.id,
      watchedOn: detail.entry.watchedOn,
      rating: detail.entry.rating,
      review: detail.entry.review,
      liked: detail.entry.liked,
      rewatch: detail.entry.rewatch,
      containsSpoilers: detail.entry.containsSpoilers,
      filmId: detail.entry.filmId,
    },
    film: {
      tmdbId: detail.film.tmdbId,
      title: detail.film.title,
      year: detail.film.year,
      posterPath: detail.film.posterPath,
    },
    username: detail.username,
    displayName: detail.displayName,
    tags: detail.tags,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  const detail = await getLogEntryDetail(params.entryId);
  if (detail?.entry.userId !== session.user.id) {
    throw data("Not found", { status: 404 });
  }
  const form = await request.formData();
  const intent = formString(form, "intent");

  if (intent === "delete") {
    await deleteLogEntry(session.user.id, detail.entry.id);
    return redirect(`/film/${String(detail.film.tmdbId)}`);
  }

  if (intent === "update") {
    const ratingRaw = formString(form, "rating");
    const watchedOnRaw = formString(form, "watchedOn");
    const reviewRaw = formString(form, "review").trim();
    const parsed = logEntryInputSchema.safeParse({
      filmId: detail.entry.filmId,
      watchedOn: watchedOnRaw === "" ? null : watchedOnRaw,
      rating: ratingRaw === "" ? null : Number.parseInt(ratingRaw, 10),
      review: reviewRaw === "" ? null : reviewRaw,
      liked: form.get("liked") === "on",
      rewatch: form.get("rewatch") === "on",
      containsSpoilers: form.get("containsSpoilers") === "on",
      tags: formString(form, "tags")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag !== ""),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in fieldErrors)) {
          fieldErrors[key] = issue.message;
        }
      }
      return data(
        {
          error: "Fix the highlighted fields and try again.",
          fieldErrors,
        },
        { status: 400 },
      );
    }
    await updateLogEntry(session.user.id, detail.entry.id, parsed.data);
    return redirect(`/entries/${detail.entry.id}`);
  }

  return data({ error: "Unknown action.", fieldErrors: null }, { status: 400 });
}

export default function Entry({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { entry, film, username, tags, user, isOwner } = loaderData;

  return (
    <>
      <Nav user={user} />
      <PageShell>
        <article className="gap-section flex flex-col">
          <div className="gap-block flex items-start">
            <Link
              to={`/film/${String(film.tmdbId)}`}
              className="rounded-poster w-24 shrink-0 overflow-hidden"
            >
              <PosterImage
                title={film.title}
                alt={`Poster for ${film.title}`}
                url={
                  film.posterPath === null
                    ? null
                    : `https://image.tmdb.org/t/p/w185${film.posterPath}`
                }
                className="aspect-[2/3]"
              />
            </Link>
            <div className="gap-tight flex min-w-0 flex-col">
              <h1 className="font-heading text-xl">
                <Link
                  to={`/film/${String(film.tmdbId)}`}
                  className="hover:text-accent"
                >
                  {film.title}
                </Link>
                {film.year !== null && (
                  <span className="text-faint ml-tight font-normal">
                    {String(film.year)}
                  </span>
                )}
              </h1>
              <p className="text-muted text-sm">
                Logged by{" "}
                <Link to={`/u/${username}`} className="text-accent font-medium">
                  @{username}
                </Link>
                {" · "}
                <span className="tabular-nums">
                  {formatShortDate(entry.watchedOn, { includeYear: true })}
                </span>
              </p>
              <div className="gap-related flex flex-wrap items-center text-sm">
                {entry.rating !== null && (
                  <StarRating rating={entry.rating / 2} />
                )}
                {entry.liked && (
                  <span className="text-accent" aria-label="Liked">
                    ♥
                  </span>
                )}
                {entry.rewatch && (
                  <span className="gap-tight text-muted inline-flex items-center">
                    <span className="bg-sage size-1.5 rounded-full" />
                    Rewatch
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <p className="text-faint text-xs">{tags.join(", ")}</p>
              )}
            </div>
          </div>

          {entry.review !== null && entry.review !== "" && (
            <div className="border-border gap-tight pt-section flex flex-col border-t">
              <h2 className="font-heading text-lg">Review</h2>
              <p className="max-w-[70ch] text-sm leading-relaxed whitespace-pre-wrap">
                <SpoilerText
                  key={entry.id}
                  containsSpoilers={entry.containsSpoilers}
                >
                  {entry.review}
                </SpoilerText>
              </p>
            </div>
          )}

          {isOwner && (
            <section className="border-border gap-block pt-section flex flex-col border-t">
              <h2 className="font-heading text-lg">Edit entry</h2>
              <Form method="post" className="gap-block flex flex-col">
                <input type="hidden" name="intent" value="update" />
                <div className="gap-block grid sm:grid-cols-2">
                  <Field
                    label="Watched on"
                    htmlFor="watched-on"
                    error={actionData?.fieldErrors?.watchedOn}
                  >
                    <Input
                      id="watched-on"
                      type="date"
                      name="watchedOn"
                      defaultValue={entry.watchedOn ?? ""}
                    />
                  </Field>
                  <Field
                    label="Rating"
                    htmlFor="rating"
                    error={actionData?.fieldErrors?.rating}
                  >
                    <StarRatingInput
                      name="rating"
                      defaultValue={entry.rating}
                    />
                  </Field>
                </div>
                <Field
                  label="Review"
                  htmlFor="review"
                  error={actionData?.fieldErrors?.review}
                >
                  <Textarea
                    id="review"
                    name="review"
                    rows={6}
                    defaultValue={entry.review ?? ""}
                  />
                </Field>
                <Field
                  label="Tags"
                  htmlFor="tags"
                  hint="Separate tags with commas."
                  error={actionData?.fieldErrors?.tags}
                >
                  <Input id="tags" name="tags" defaultValue={tags.join(", ")} />
                </Field>
                <div className="gap-section flex flex-wrap text-sm">
                  <label className="gap-tight flex items-center">
                    <input
                      type="checkbox"
                      name="liked"
                      defaultChecked={entry.liked}
                    />{" "}
                    Liked ♥
                  </label>
                  <label className="gap-tight flex items-center">
                    <input
                      type="checkbox"
                      name="rewatch"
                      defaultChecked={entry.rewatch}
                    />{" "}
                    Rewatch
                  </label>
                  <label className="gap-tight flex items-center">
                    <input
                      type="checkbox"
                      name="containsSpoilers"
                      defaultChecked={entry.containsSpoilers}
                    />{" "}
                    Contains spoilers
                  </label>
                </div>
                {actionData?.error !== undefined && actionData.error !== "" && (
                  <p role="alert" className="text-error text-sm">
                    {actionData.error}
                  </p>
                )}
                <Button type="submit" className="self-start">
                  Save changes
                </Button>
              </Form>

              <Form method="post" className="pt-block">
                <input type="hidden" name="intent" value="delete" />
                <Button
                  type="submit"
                  variant="destructive"
                  name="confirm"
                  value="1"
                  onClick={(event) => {
                    if (
                      !window.confirm(
                        "Delete this diary entry? This cannot be undone.",
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  Delete entry
                </Button>
              </Form>
            </section>
          )}

          {!isOwner && (
            <p className="text-muted text-sm">
              <Link
                to={`/film/${String(film.tmdbId)}`}
                className={buttonStyles("secondary", "self-start")}
              >
                View film
              </Link>
            </p>
          )}
        </article>
      </PageShell>
    </>
  );
}
