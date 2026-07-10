import { Link, data } from "react-router";

import { LetterboxdImport } from "~/components/letterboxd-import";
import { Nav } from "~/components/nav";
import { requireSession } from "~/lib/auth/auth.server";
import { handleImportAction } from "~/lib/import-action.server";
import type { Route } from "./+types/welcome";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Welcome — pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  return { user: { username: session.user.username ?? "" } };
}

export async function action({ request }: Route.ActionArgs) {
  const { result, error, status } = await handleImportAction(request);
  return data({ result, error }, { status });
}

export default function Welcome({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const profileHref = `/u/${loaderData.user.username}`;
  const imported =
    actionData?.result !== null && actionData?.result !== undefined;
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Welcome to pillarboxd</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Bring your history over from Letterboxd, or skip and start fresh. You
          can always import later from settings.
        </p>

        <div className="mt-8">
          <LetterboxdImport
            result={actionData?.result ?? null}
            error={actionData?.error ?? null}
          />
        </div>

        <div className="mt-10 flex items-center gap-4 text-sm">
          <Link
            to={profileHref}
            className="rounded bg-gray-900 px-4 py-2 text-white dark:bg-white dark:text-gray-900"
          >
            {imported ? "Continue to your profile" : "Go to your profile"}
          </Link>
          {!imported && (
            <Link to={profileHref} className="underline">
              Skip for now
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
