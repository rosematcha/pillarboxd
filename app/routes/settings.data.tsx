import { data } from "react-router";

import { LetterboxdImport } from "~/components/letterboxd-import";
import { Nav } from "~/components/nav";
import { requireSession } from "~/lib/auth/auth.server";
import { handleImportAction } from "~/lib/import-action.server";
import type { Route } from "./+types/settings.data";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Import & export — pillarboxd" }];
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Import &amp; export</h1>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Import from Letterboxd</h2>
          <div className="mt-4">
            <LetterboxdImport
              result={actionData?.result ?? null}
              error={actionData?.error ?? null}
            />
          </div>
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
