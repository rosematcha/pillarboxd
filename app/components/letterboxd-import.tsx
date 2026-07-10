import { Form, useNavigation } from "react-router";

import { LETTERBOXD_RSS_MAX_ENTRIES } from "~/lib/letterboxd-rss";
import type { ImportResult } from "~/lib/importer.server";

const inputClass =
  "rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900";
const buttonClass =
  "self-start rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-gray-900";

/**
 * The two Letterboxd import forms: a quick username import from the public RSS
 * feed, and a full-history import from the export zip. Both submit to the
 * containing route's action (handled by `handleImportAction`).
 */
export function LetterboxdImport({
  result,
  error,
}: {
  result: ImportResult | null;
  error: string | null;
}): React.ReactElement {
  const navigation = useNavigation();
  const submittingIntent =
    navigation.state === "submitting"
      ? navigation.formData?.get("intent")
      : null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="font-semibold">Quick import from your username</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Pulls your {LETTERBOXD_RSS_MAX_ENTRIES} most recent diary entries and
          reviews straight from your public Letterboxd profile — no download
          needed. Films are matched exactly by TMDB id.
        </p>
        <Form method="post" className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="intent" value="rss" />
          <label className="flex flex-col gap-1 text-sm">
            Letterboxd username
            <div className="flex items-center gap-2">
              <span className="text-gray-500">letterboxd.com/</span>
              <input
                name="username"
                required
                autoComplete="off"
                placeholder="yourname"
                className={inputClass}
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={submittingIntent !== null}
            className={buttonClass}
          >
            {submittingIntent === "rss"
              ? "Importing…"
              : "Import recent activity"}
          </button>
        </Form>
      </section>

      <section>
        <h3 className="font-semibold">Full history from your export</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          For your complete history, upload the .zip from Letterboxd (Settings →
          Data → Export your data). Films are matched by title and year via
          TMDB.
        </p>
        <Form
          method="post"
          encType="multipart/form-data"
          className="mt-3 flex flex-col gap-3"
        >
          <input type="hidden" name="intent" value="zip" />
          <label className="flex flex-col gap-1 text-sm">
            Letterboxd export (.zip)
            <input type="file" name="export" accept=".zip,application/zip" />
          </label>
          <button
            type="submit"
            disabled={submittingIntent !== null}
            className={buttonClass}
          >
            {submittingIntent === "zip" ? "Importing…" : "Import full history"}
          </button>
        </Form>
      </section>

      {error !== null && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {result !== null && (
        <div className="text-sm">
          <p>Imported {String(result.imported)} entries.</p>
          {result.unmatched.length > 0 && (
            <>
              <p className="mt-2">
                Couldn&apos;t match {String(result.unmatched.length)} films:
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
    </div>
  );
}
