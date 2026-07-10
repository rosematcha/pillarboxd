import { Link } from "react-router";

import { buttonStyles } from "~/components/button";
import { Nav } from "~/components/nav";
import { requireSession } from "~/lib/auth/auth.server";
import type { Route } from "./+types/settings.data";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Import and export | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  const username = session.user.username;
  return { user: { username: username ?? "" } };
}

export default function SettingsData({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="gap-step px-block py-step mx-auto flex max-w-[42rem] flex-col sm:py-12">
        <h1 className="font-heading text-xl">Your data</h1>
        <section className="gap-block border-border pb-step flex flex-col border-b">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Import</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              Move your Letterboxd diary, ratings, reviews, and likes into
              pillarboxd.
            </p>
          </div>
          <Link
            to="/import"
            className={buttonStyles("secondary", "self-start")}
          >
            Open Letterboxd import
          </Link>
        </section>
        <section className="gap-block flex flex-col">
          <div className="gap-tight flex flex-col">
            <h2 className="font-heading text-lg">Export</h2>
            <p className="text-muted max-w-[70ch] text-sm">
              Download your complete history whenever you want.
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
      </main>
    </>
  );
}
