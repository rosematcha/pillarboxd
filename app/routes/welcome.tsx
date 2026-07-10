import { Link } from "react-router";

import { buttonStyles } from "~/components/button";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { requireSession } from "~/lib/auth/auth.server";
import type { Route } from "./+types/welcome";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Welcome | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  return { user: { username: session.user.username ?? "" } };
}

export default function Welcome({ loaderData }: Route.ComponentProps) {
  const profileHref = `/u/${loaderData.user.username}`;
  return (
    <>
      <Nav user={loaderData.user} />
      <PageShell>
        <header className="gap-tight flex flex-col">
          <h1 className="font-heading text-xl">Welcome to pillarboxd</h1>
          <p className="text-muted max-w-[70ch]">
            Start a new diary or bring your Letterboxd history with you.
          </p>
        </header>
        <div className="gap-related flex flex-wrap items-center">
          <Link to="/import" className={buttonStyles("primary")}>
            Import from Letterboxd
          </Link>
          <Link to={profileHref} className={buttonStyles("secondary")}>
            Start fresh
          </Link>
        </div>
      </PageShell>
    </>
  );
}
