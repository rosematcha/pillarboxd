import { Form, Link, data } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { Dropzone } from "~/components/dropzone";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { requireSession } from "~/lib/auth/auth.server";
import { handleImportAction } from "~/lib/import-action.server";
import type { Route } from "./+types/settings.data";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Import and export | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  const username = session.user.username;
  return { user: { username: username ?? "" } };
}

export async function action({ request }: Route.ActionArgs) {
  const { result, error, status } = await handleImportAction(request);
  return data({ result, error }, { status });
}

export default function SettingsData({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <PageShell>
        <h1 className="font-heading text-xl">Your data</h1>
        <section className="gap-block border-border pb-step flex flex-col border-b">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Profile</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              Display name, bio, and favorite films.
            </p>
          </div>
          <Link
            to="/settings/profile"
            className={buttonStyles("secondary", "self-start")}
          >
            Edit profile
          </Link>
        </section>
        <section className="gap-block border-border pb-step flex flex-col border-b">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Import from Letterboxd</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              Move your Letterboxd diary, ratings, reviews, likes, and lists
              into pillarboxd.
            </p>
          </div>
          <Link
            to="/import"
            className={buttonStyles("secondary", "self-start")}
          >
            Open Letterboxd import
          </Link>
        </section>
        <section className="gap-block border-border pb-step flex flex-col border-b">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Restore from JSON</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              Upload a pillarboxd JSON export to restore diary entries. Existing
              watches for the same film and date are skipped.
            </p>
          </div>
          <Form
            method="post"
            encType="multipart/form-data"
            className="gap-block flex flex-col"
          >
            <input type="hidden" name="intent" value="json" />
            <Dropzone
              id="json-restore"
              name="export"
              accept=".json,application/json"
              prompt="Drop your pillarboxd JSON export here"
              required
            />
            <Button type="submit" variant="secondary" className="self-start">
              Restore JSON
            </Button>
          </Form>
          {actionData?.error !== undefined && actionData.error !== null && (
            <p role="alert" className="text-error text-sm">
              {actionData.error}
            </p>
          )}
          {actionData?.result !== undefined &&
            actionData.result !== null &&
            actionData.error === null && (
              <p className="text-muted text-sm" role="status">
                Restored {String(actionData.result.imported)}{" "}
                {actionData.result.imported === 1 ? "entry" : "entries"}
                {actionData.result.unmatched.length > 0
                  ? ` · ${String(actionData.result.unmatched.length)} could not be matched`
                  : ""}
                .
              </p>
            )}
        </section>
        <section className="gap-block flex flex-col">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Export</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              JSON is the full-fidelity backup (ratings, likes, spoilers, tags,
              URIs). CSV is a Letterboxd-friendly diary sheet and may omit some
              fields other apps do not share.
            </p>
          </div>
          <div className="gap-related flex flex-wrap">
            <a
              href="/export/json"
              className={buttonStyles("secondary")}
              download
            >
              Download JSON
            </a>
            <a
              href="/export/csv"
              className={buttonStyles("secondary")}
              download
            >
              Download CSV
            </a>
          </div>
        </section>
      </PageShell>
    </>
  );
}
