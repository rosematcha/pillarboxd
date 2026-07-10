import { Form, data } from "react-router";

import { Nav } from "~/components/nav";
import { requireSession } from "~/lib/auth/auth.server";
import { importLetterboxdCsvs } from "~/lib/importer.server";
import type { Route } from "./+types/settings.data";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Import & export — pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  const username = session.user.username;
  return { user: { username: username ?? "" } };
}

async function fileText(
  value: FormDataEntryValue | null,
): Promise<string | undefined> {
  if (value === null || typeof value === "string" || value.size === 0) {
    return undefined;
  }
  return value.text();
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireSession(request);
  const form = await request.formData();
  const diary = await fileText(form.get("diary"));
  const reviews = await fileText(form.get("reviews"));
  const likes = await fileText(form.get("likes"));
  if (diary === undefined && reviews === undefined) {
    return data(
      { result: null, error: "Upload at least diary.csv or reviews.csv." },
      { status: 400 },
    );
  }
  const result = await importLetterboxdCsvs(session.user.id, {
    diary,
    reviews,
    likes,
  });
  return data({ result, error: null });
}

export default function SettingsData({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const result = actionData?.result ?? null;
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Import &amp; export</h1>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Import from Letterboxd</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Upload files from your Letterboxd data export (Settings → Data →
            Export your data). Films are matched by title and year via TMDB.
          </p>
          <Form
            method="post"
            encType="multipart/form-data"
            className="mt-4 flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              diary.csv
              <input type="file" name="diary" accept=".csv,text/csv" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              reviews.csv
              <input type="file" name="reviews" accept=".csv,text/csv" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              likes/films.csv
              <input type="file" name="likes" accept=".csv,text/csv" />
            </label>
            {actionData?.error !== null && actionData?.error !== undefined && (
              <p role="alert" className="text-sm text-red-600">
                {actionData.error}
              </p>
            )}
            <button
              type="submit"
              className="self-start rounded bg-gray-900 px-4 py-2 text-white dark:bg-white dark:text-gray-900"
            >
              Import
            </button>
          </Form>
          {result !== null && (
            <div className="mt-4 text-sm">
              <p>Imported {String(result.imported)} entries.</p>
              {result.unmatched.length > 0 && (
                <>
                  <p className="mt-2">
                    Could not match {String(result.unmatched.length)} films:
                  </p>
                  <ul className="mt-1 list-inside list-disc text-gray-600 dark:text-gray-400">
                    {result.unmatched.map((film) => (
                      <li key={`${film.name} ${String(film.year ?? "")}`}>
                        {film.name}
                        {film.year !== null && ` (${String(film.year)})`}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Export your data</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your data is yours. Download everything, any time.
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <a href="/export/json" className="underline" download>
              JSON (full fidelity)
            </a>
            <a href="/export/csv" className="underline" download>
              CSV (Letterboxd-compatible)
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
