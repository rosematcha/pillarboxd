import { Form, Link, data, redirect } from "react-router";
import { eq } from "drizzle-orm";

import { Button, buttonStyles } from "~/components/button";
import { Field, Input, Textarea } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterTile } from "~/components/poster-tile";
import { formString } from "~/lib/form";
import { requireSession } from "~/lib/auth/auth.server";
import { user } from "~/lib/db/auth-schema";
import { db } from "~/lib/db/client.server";
import { getOrCreateFilmByTmdbId } from "~/lib/films.server";
import {
  getFavorites,
  getUserBio,
  setFavorites,
  setUserBio,
} from "~/lib/profile.server";
import { TmdbError, tmdbErrorMessage } from "~/lib/tmdb/client.server";
import type { Route } from "./+types/settings.profile";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Edit profile | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  const [favorites, bio] = await Promise.all([
    getFavorites(session.user.id),
    getUserBio(session.user.id),
  ]);
  return {
    user: { username: session.user.username ?? "" },
    name: session.user.name,
    bio: bio ?? "",
    favorites: favorites.map(({ film, position }) => ({
      position,
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      filmId: film.id,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireSession(request);
  const form = await request.formData();
  const intent = formString(form, "intent");

  if (intent === "update-profile") {
    const name = formString(form, "name").trim();
    const bio = formString(form, "bio").trim();
    if (name.length < 1 || name.length > 80) {
      return data(
        { error: "Display name must be 1 to 80 characters." },
        { status: 400 },
      );
    }
    if (bio.length > 500) {
      return data(
        { error: "Bio must be 500 characters or fewer." },
        { status: 400 },
      );
    }
    await db()
      .update(user)
      .set({ name, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    await setUserBio(session.user.id, bio === "" ? null : bio);
    return redirect("/settings/profile");
  }

  if (intent === "set-favorites") {
    const rawIds = [
      formString(form, "favorite0"),
      formString(form, "favorite1"),
      formString(form, "favorite2"),
      formString(form, "favorite3"),
    ];
    const filmIds: string[] = [];
    for (const raw of rawIds) {
      if (raw.trim() === "") {
        continue;
      }
      const tmdbId = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
        return data(
          { error: "Favorite slots need valid TMDB film ids." },
          { status: 400 },
        );
      }
      try {
        const film = await getOrCreateFilmByTmdbId(tmdbId);
        if (!filmIds.includes(film.id)) {
          filmIds.push(film.id);
        }
      } catch (error) {
        if (error instanceof TmdbError && error.status === 404) {
          return data(
            { error: `TMDB film ${String(tmdbId)} was not found.` },
            { status: 400 },
          );
        }
        return data({ error: tmdbErrorMessage(error) }, { status: 400 });
      }
    }
    await setFavorites(session.user.id, filmIds);
    return redirect("/settings/profile");
  }

  return data({ error: "Unknown action." }, { status: 400 });
}

export default function SettingsProfile({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { user, name, bio, favorites } = loaderData;
  const favoriteDefaults = [0, 1, 2, 3].map((slot) => {
    const match = favorites.find((item) => item.position === slot);
    return match === undefined ? "" : String(match.tmdbId);
  });

  return (
    <>
      <Nav user={user} />
      <PageShell>
        <div className="gap-related flex flex-wrap items-baseline justify-between">
          <h1 className="font-heading text-xl">Edit profile</h1>
          <Link
            to={`/u/${user.username}`}
            className="text-accent text-sm font-medium"
          >
            View profile
          </Link>
        </div>

        <Form method="post" className="gap-block flex flex-col">
          <input type="hidden" name="intent" value="update-profile" />
          <Field label="Display name" htmlFor="name">
            <Input
              id="name"
              name="name"
              defaultValue={name}
              maxLength={80}
              required
            />
          </Field>
          <Field label="Bio" htmlFor="bio">
            <Textarea
              id="bio"
              name="bio"
              defaultValue={bio}
              maxLength={500}
              rows={4}
            />
          </Field>
          <Button type="submit" variant="secondary" className="self-start">
            Save profile
          </Button>
        </Form>

        <section className="border-border gap-block pt-step flex flex-col border-t">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Favorite films</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              Up to four films. Paste TMDB ids, or{" "}
              <Link to="/films/search" className="text-accent">
                search
              </Link>{" "}
              first.
            </p>
          </div>
          {favorites.length > 0 && (
            <ul className="gap-related grid grid-cols-2 sm:grid-cols-4">
              {favorites.map((film) => (
                <li key={film.filmId}>
                  <PosterTile
                    to={`/film/${String(film.tmdbId)}`}
                    title={film.title}
                    year={film.year}
                    posterUrl={
                      film.posterPath === null
                        ? null
                        : `https://image.tmdb.org/t/p/w185${film.posterPath}`
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          <Form method="post" className="gap-block flex flex-col">
            <input type="hidden" name="intent" value="set-favorites" />
            <div className="gap-block grid sm:grid-cols-2">
              {favoriteDefaults.map((value, index) => (
                <Field
                  key={String(index)}
                  label={`Favorite ${String(index + 1)}`}
                  htmlFor={`favorite-${String(index)}`}
                >
                  <Input
                    id={`favorite-${String(index)}`}
                    name={`favorite${String(index)}`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="TMDB id"
                    defaultValue={value}
                  />
                </Field>
              ))}
            </div>
            <Button type="submit" className="self-start">
              Save favorites
            </Button>
          </Form>
        </section>

        {actionData?.error !== undefined && (
          <p role="alert" className="text-error text-sm">
            {actionData.error}
          </p>
        )}

        <Link
          to="/settings/data"
          className={buttonStyles("secondary", "self-start")}
        >
          Import and export
        </Link>
      </PageShell>
    </>
  );
}
