import { Form, useNavigation } from "react-router";

import { Button } from "~/components/button";
import { Dropzone } from "~/components/dropzone";
import {
  ImportFlow,
  ImportResults,
  ImportStep,
} from "~/components/import-flow";
import { Field, Input } from "~/components/input";
import { LETTERBOXD_RSS_MAX_ENTRIES } from "~/lib/letterboxd-rss";
import type { ImportResult } from "~/lib/importer.server";

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
    <ImportFlow>
      <ImportStep
        title="Choose your source"
        description="You are moving from Letterboxd. pillarboxd can pull from your public profile or a full export file."
      />
      <ImportStep
        title="Pick quick or full"
        description="Use quick import to try pillarboxd, or upload an export to bring your full history."
      >
        <div className="gap-related flex flex-col">
          <div className="gap-tight rounded-control border-border p-block flex flex-col border">
            <h3 className="text-sm font-medium">Quick import</h3>
            <p className="text-muted text-sm">
              Pulls your {LETTERBOXD_RSS_MAX_ENTRIES} most recent diary entries
              and reviews from your public profile.
            </p>
          </div>
          <div className="gap-tight rounded-control border-border p-block flex flex-col border">
            <h3 className="text-sm font-medium">Full import</h3>
            <p className="text-muted text-sm">
              Brings over your complete diary, ratings, reviews, and likes from
              a Letterboxd export file.
            </p>
          </div>
        </div>
        <p className="rounded-control bg-bg-subtle p-block text-muted text-sm">
          <strong className="text-text font-medium">Which do I want?</strong>{" "}
          Use the full import if you are leaving Letterboxd. Quick import is
          enough if you just want to try pillarboxd.
        </p>
      </ImportStep>
      <ImportStep title="Add your history">
        <div className="gap-section grid md:grid-cols-2">
          <Form method="post" className="gap-block flex flex-col">
            <input type="hidden" name="intent" value="rss" />
            <Field label="Letterboxd username" htmlFor="letterboxd-username">
              <Input
                id="letterboxd-username"
                name="username"
                required
                autoComplete="off"
                placeholder="yourname"
              />
            </Field>
            <Button
              type="submit"
              loading={submittingIntent === "rss"}
              loadingLabel="Importing recent activity"
              disabled={submittingIntent !== null}
              className="self-start"
            >
              Import recent activity
            </Button>
          </Form>
          <Form
            method="post"
            encType="multipart/form-data"
            className="gap-block flex flex-col"
          >
            <input type="hidden" name="intent" value="zip" />
            <Dropzone
              id="letterboxd-export"
              name="export"
              accept=".zip,application/zip"
              required
            />
            <Button
              type="submit"
              loading={submittingIntent === "zip"}
              loadingLabel="Importing full history"
              disabled={submittingIntent !== null}
              className="self-start"
            >
              Import full history
            </Button>
          </Form>
        </div>
        {submittingIntent !== null && (
          <div
            className="rounded-poster bg-bg-subtle h-1 overflow-hidden"
            role="progressbar"
            aria-label="Import in progress"
          >
            <div className="bg-accent h-full w-2/3 animate-pulse motion-reduce:animate-none" />
          </div>
        )}
        {error !== null && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}
      </ImportStep>
      {result !== null && (
        <ImportStep title="Results">
          <ImportResults
            imported={result.imported}
            unmatched={result.unmatched}
          />
        </ImportStep>
      )}
    </ImportFlow>
  );
}
