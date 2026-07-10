import { Form, Link, data, redirect } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { Field, Input, Textarea } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { PosterImage } from "~/components/poster-image";
import { formString } from "~/lib/form";
import { requireSession } from "~/lib/auth/auth.server";
import { getOrCreateFilmByTmdbId } from "~/lib/films.server";
import {
  addFilmToList,
  deleteList,
  getListById,
  removeFilmFromList,
  reorderList,
  updateList,
  updateListInputSchema,
} from "~/lib/lists.server";
import { TmdbError, tmdbErrorMessage } from "~/lib/tmdb/client.server";
import type { Route } from "./+types/list.edit";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `Edit ${loaderData.list.name} | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireSession(request);
  const result = await getListById(params.listId);
  if (result?.list.userId !== session.user.id) {
    throw data("Not found", { status: 404 });
  }
  return {
    user: { username: session.user.username ?? "" },
    list: {
      id: result.list.id,
      name: result.list.name,
      description: result.list.description,
      ranked: result.list.ranked,
      public: result.list.public,
    },
    entries: result.entries.map(({ entry, film }) => ({
      filmId: film.id,
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      notes: entry.notes,
      position: entry.position,
    })),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  const result = await getListById(params.listId);
  if (result?.list.userId !== session.user.id) {
    throw data("Not found", { status: 404 });
  }
  const form = await request.formData();
  const intent = formString(form, "intent");

  if (intent === "update-meta") {
    const parsed = updateListInputSchema.safeParse({
      name: formString(form, "name"),
      description: (() => {
        const value = formString(form, "description").trim();
        return value === "" ? null : value;
      })(),
      ranked: form.get("ranked") === "on",
      public: form.get("public") === "on",
    });
    if (!parsed.success) {
      return data(
        { error: "Fix the list details and try again." },
        { status: 400 },
      );
    }
    await updateList(session.user.id, result.list.id, parsed.data);
    return redirect(`/lists/${result.list.id}/edit`);
  }

  if (intent === "add-film") {
    const tmdbIdRaw = formString(form, "tmdbId");
    const tmdbId = Number(tmdbIdRaw);
    if (
      !/^\d+$/.test(tmdbIdRaw) ||
      !Number.isSafeInteger(tmdbId) ||
      tmdbId <= 0
    ) {
      return data({ error: "Enter a valid TMDB film id." }, { status: 400 });
    }
    try {
      const film = await getOrCreateFilmByTmdbId(tmdbId);
      await addFilmToList(session.user.id, result.list.id, film.id);
    } catch (error) {
      if (error instanceof TmdbError && error.status === 404) {
        return data({ error: "Film not found on TMDB." }, { status: 400 });
      }
      return data({ error: tmdbErrorMessage(error) }, { status: 400 });
    }
    return redirect(`/lists/${result.list.id}/edit`);
  }

  if (intent === "remove-film") {
    const filmId = formString(form, "filmId");
    await removeFilmFromList(session.user.id, result.list.id, filmId);
    return redirect(`/lists/${result.list.id}/edit`);
  }

  if (intent === "move-up" || intent === "move-down") {
    const filmId = formString(form, "filmId");
    const ids = result.entries.map(({ film }) => film.id);
    const index = ids.indexOf(filmId);
    if (index === -1) {
      return data({ error: "Film not on this list." }, { status: 400 });
    }
    const swapWith = intent === "move-up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= ids.length) {
      return redirect(`/lists/${result.list.id}/edit`);
    }
    const next = [...ids];
    const current = next[index];
    const other = next[swapWith];
    if (current === undefined || other === undefined) {
      return redirect(`/lists/${result.list.id}/edit`);
    }
    next[index] = other;
    next[swapWith] = current;
    await reorderList(session.user.id, result.list.id, next);
    return redirect(`/lists/${result.list.id}/edit`);
  }

  if (intent === "delete") {
    await deleteList(session.user.id, result.list.id);
    const username = session.user.username;
    return redirect(
      username === null || username === undefined || username === ""
        ? "/"
        : `/u/${username}/lists`,
    );
  }

  return data({ error: "Unknown action." }, { status: 400 });
}

export default function ListEdit({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { user, list, entries } = loaderData;
  return (
    <>
      <Nav user={user} />
      <PageShell>
        <div className="gap-related flex flex-wrap items-baseline justify-between">
          <h1 className="font-heading text-xl">Edit list</h1>
          <Link to={`/lists/${list.id}`} className="text-accent text-sm">
            View list
          </Link>
        </div>

        <Form method="post" className="gap-block flex flex-col">
          <input type="hidden" name="intent" value="update-meta" />
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={list.name}
            />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={list.description ?? ""}
            />
          </Field>
          <div className="gap-section flex flex-wrap text-sm">
            <label className="gap-tight flex items-center">
              <input
                type="checkbox"
                name="ranked"
                defaultChecked={list.ranked}
              />{" "}
              Ranked
            </label>
            <label className="gap-tight flex items-center">
              <input
                type="checkbox"
                name="public"
                defaultChecked={list.public}
              />{" "}
              Public
            </label>
          </div>
          <Button type="submit" variant="secondary" className="self-start">
            Save details
          </Button>
        </Form>

        <section className="border-border gap-block pt-step flex flex-col border-t">
          <h2 className="font-heading text-lg">Add a film</h2>
          <Form method="post" className="gap-related flex flex-wrap items-end">
            <input type="hidden" name="intent" value="add-film" />
            <Field label="TMDB film id" htmlFor="tmdb-id">
              <Input
                id="tmdb-id"
                name="tmdbId"
                inputMode="numeric"
                pattern="[0-9]+"
                required
                placeholder="11631"
              />
            </Field>
            <Button type="submit" variant="secondary">
              Add
            </Button>
            <Link
              to="/films/search"
              className="text-accent self-end text-sm font-medium"
            >
              Search TMDB
            </Link>
          </Form>
        </section>

        {actionData?.error !== undefined && (
          <p role="alert" className="text-error text-sm">
            {actionData.error}
          </p>
        )}

        <section className="border-border gap-block pt-step flex flex-col border-t">
          <h2 className="font-heading text-lg">Films</h2>
          {entries.length === 0 ? (
            <p className="text-muted text-sm">No films on this list yet.</p>
          ) : (
            <ul className="flex flex-col">
              {entries.map((item, index) => (
                <li
                  key={item.filmId}
                  className="border-border gap-block py-related flex items-center border-b"
                >
                  <span className="text-faint w-6 shrink-0 text-sm tabular-nums">
                    {String(index + 1)}
                  </span>
                  <Link
                    to={`/film/${String(item.tmdbId)}`}
                    className="rounded-poster w-10 shrink-0 overflow-hidden"
                  >
                    <PosterImage
                      title={item.title}
                      alt=""
                      url={
                        item.posterPath === null
                          ? null
                          : `https://image.tmdb.org/t/p/w92${item.posterPath}`
                      }
                      className="aspect-[2/3]"
                    />
                  </Link>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link
                      to={`/film/${String(item.tmdbId)}`}
                      className="hover:text-accent font-medium"
                    >
                      {item.title}
                    </Link>
                    {item.year !== null && (
                      <span className="text-faint"> {String(item.year)}</span>
                    )}
                  </div>
                  <div className="gap-tight flex shrink-0">
                    <Form method="post">
                      <input type="hidden" name="intent" value="move-up" />
                      <input type="hidden" name="filmId" value={item.filmId} />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="px-related py-1"
                        disabled={index === 0}
                        aria-label={`Move ${item.title} up`}
                      >
                        Up
                      </Button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="move-down" />
                      <input type="hidden" name="filmId" value={item.filmId} />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="px-related py-1"
                        disabled={index === entries.length - 1}
                        aria-label={`Move ${item.title} down`}
                      >
                        Down
                      </Button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove-film" />
                      <input type="hidden" name="filmId" value={item.filmId} />
                      <Button
                        type="submit"
                        variant="destructive"
                        className="px-related py-1"
                        aria-label={`Remove ${item.title}`}
                      >
                        Remove
                      </Button>
                    </Form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Form method="post" className="border-border pt-step border-t">
          <input type="hidden" name="intent" value="delete" />
          <Button
            type="submit"
            variant="destructive"
            onClick={(event) => {
              if (!window.confirm("Delete this list? This cannot be undone.")) {
                event.preventDefault();
              }
            }}
          >
            Delete list
          </Button>
        </Form>

        <Link
          to={`/u/${user.username}/lists`}
          className={buttonStyles("secondary", "self-start")}
        >
          Back to your lists
        </Link>
      </PageShell>
    </>
  );
}
