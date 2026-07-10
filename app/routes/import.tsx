import { data } from "react-router";

import { LetterboxdImport } from "~/components/letterboxd-import";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { requireSession } from "~/lib/auth/auth.server";
import { handleImportAction } from "~/lib/import-action.server";
import type { Route } from "./+types/import";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Import from Letterboxd | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  return { user: { username: session.user.username ?? "" } };
}

export async function action({ request }: Route.ActionArgs) {
  const { result, error, status, manualMatch } =
    await handleImportAction(request);
  return data({ result, error, manualMatch }, { status });
}

export default function ImportRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <PageShell>
        <header className="gap-tight flex flex-col">
          <h1 className="font-heading text-xl">Import from Letterboxd</h1>
          <p className="text-muted max-w-[70ch] text-sm">
            Bring over recent activity in seconds or upload your complete
            Letterboxd export.
          </p>
        </header>
        {actionData?.manualMatch?.imported === true && (
          <p className="text-muted text-sm" role="status">
            Entry imported.
          </p>
        )}
        <LetterboxdImport
          result={actionData?.result ?? null}
          error={actionData?.error ?? null}
        />
      </PageShell>
    </>
  );
}
