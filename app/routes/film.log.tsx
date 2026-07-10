import { Form, Link, data, redirect, useNavigation } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { Field, Input, Textarea } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterImage } from "~/components/poster-image";
import { StarRatingInput } from "~/components/star-rating-input";
import { formString } from "~/lib/form";
import { requireSession } from "~/lib/auth/auth.server";
import { getOrCreateFilmByTmdbId } from "~/lib/films.server";
import { createLogEntry, logEntryInputSchema } from "~/lib/logs.server";
import { TmdbError, tmdbErrorMessage } from "~/lib/tmdb/client.server";
import type { Route } from "./+types/film.log";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `Log ${loaderData.film.title} | pillarboxd` }];
}

function parseTmdbId(raw: string): number {
  const tmdbId = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    throw data("Not found", { status: 404 });
  }
  return tmdbId;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireSession(request);
  const tmdbId = parseTmdbId(params.tmdbId);
  let film;
  try {
    film = await getOrCreateFilmByTmdbId(tmdbId);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) {
      throw data("Film not found", { status: 404 });
    }
    throw data(tmdbErrorMessage(error), { status: 503 });
  }
  const username = session.user.username;
  return {
    user: { username: username ?? "" },
    film: {
      id: film.id,
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  const tmdbId = parseTmdbId(params.tmdbId);
  let film;
  try {
    film = await getOrCreateFilmByTmdbId(tmdbId);
  } catch (error) {
    return data(
      { error: tmdbErrorMessage(error), fieldErrors: null },
      { status: 400 },
    );
  }
  const form = await request.formData();
  const ratingRaw = formString(form, "rating");
  const watchedOnRaw = formString(form, "watchedOn");
  const reviewRaw = formString(form, "review").trim();
  const parsed = logEntryInputSchema.safeParse({
    filmId: film.id,
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
  const entry = await createLogEntry(session.user.id, parsed.data);
  return redirect(`/entries/${entry.id}`);
}

export default function FilmLog({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { film, user } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return (
    <>
      <Nav user={user} />
      <PageShell>
        <div className="gap-block flex items-start">
          <Link
            to={`/film/${String(film.tmdbId)}`}
            className="rounded-poster w-16 shrink-0 overflow-hidden"
          >
            <PosterImage
              title={film.title}
              alt=""
              url={
                film.posterPath === null
                  ? null
                  : `https://image.tmdb.org/t/p/w92${film.posterPath}`
              }
              className="aspect-[2/3]"
            />
          </Link>
          <div className="gap-tight flex flex-col">
            <h1 className="font-heading text-xl">Log {film.title}</h1>
            <p className="text-muted text-sm">
              {film.year !== null && `${String(film.year)} · `}
              <Link to={`/film/${String(film.tmdbId)}`} className="text-accent">
                Back to film
              </Link>
            </p>
          </div>
        </div>

        <Form method="post" className="gap-block flex flex-col">
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
                aria-invalid={actionData?.fieldErrors?.watchedOn !== undefined}
              />
            </Field>
            <Field
              label="Rating"
              htmlFor="rating"
              error={actionData?.fieldErrors?.rating}
            >
              <StarRatingInput name="rating" />
            </Field>
          </div>
          <Field
            label="Review"
            htmlFor="review"
            error={actionData?.fieldErrors?.review}
          >
            <Textarea id="review" name="review" rows={6} />
          </Field>
          <Field
            label="Tags"
            htmlFor="tags"
            hint="Separate tags with commas."
            error={actionData?.fieldErrors?.tags}
          >
            <Input id="tags" name="tags" />
          </Field>
          <div className="gap-section flex flex-wrap text-sm">
            <label className="gap-tight flex items-center">
              <input type="checkbox" name="liked" /> Liked ♥
            </label>
            <label className="gap-tight flex items-center">
              <input type="checkbox" name="rewatch" /> Rewatch
            </label>
            <label className="gap-tight flex items-center">
              <input type="checkbox" name="containsSpoilers" /> Contains
              spoilers
            </label>
          </div>
          {actionData?.error !== undefined && actionData.error !== "" && (
            <p role="alert" className="text-error text-sm">
              {actionData.error}
            </p>
          )}
          <div className="gap-related flex flex-wrap">
            <Button
              type="submit"
              loading={isSubmitting}
              loadingLabel="Saving entry"
            >
              Save entry
            </Button>
            <Link
              to={`/film/${String(film.tmdbId)}`}
              className={buttonStyles("secondary")}
            >
              Cancel
            </Link>
          </div>
        </Form>
      </PageShell>
    </>
  );
}
