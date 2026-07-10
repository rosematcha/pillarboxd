import { Link } from "react-router";

import { ActivityItem } from "~/components/activity-item";
import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { getSession } from "~/lib/auth/auth.server";
import { getRecentActivity } from "~/lib/logs.server";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [
    { title: "pillarboxd" },
    {
      name: "description",
      content: "A free, open, federated film diary.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [session, activity] = await Promise.all([
    getSession(request),
    getRecentActivity(),
  ]);
  const username = session?.user.username;
  return {
    user: username === null || username === undefined ? null : { username },
    activity: activity.flatMap((item) =>
      item.username === null
        ? []
        : [
            {
              ...item,
              createdAt: item.createdAt.toISOString(),
              username: item.username,
              reviewed: item.review !== null,
            },
          ],
    ),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="gap-step px-block py-step mx-auto flex max-w-[42rem] flex-col sm:py-12">
        <header className="gap-block border-border pb-section flex flex-col border-b">
          <div className="gap-tight flex flex-col">
            <h1 className="font-heading text-xl">Recent activity</h1>
            <p className="text-muted max-w-[70ch] text-sm">
              Films logged and reviewed on this instance.
            </p>
          </div>
          {loaderData.user === null ? (
            <div className="gap-related flex flex-wrap">
              <Link to="/register" className={buttonStyles("primary")}>
                Create an account
              </Link>
              <Link to="/login" className={buttonStyles("secondary")}>
                Log in
              </Link>
            </div>
          ) : (
            <Link
              to={`/u/${loaderData.user.username}`}
              className={buttonStyles("secondary", "self-start")}
            >
              Your diary
            </Link>
          )}
        </header>
        {loaderData.activity.length === 0 ? (
          <EmptyState
            action={
              <Link to="/films/search" className={buttonStyles("primary")}>
                Find a film
              </Link>
            }
          >
            No one has logged a film yet. Start the diary for this instance.
          </EmptyState>
        ) : (
          <div>
            {loaderData.activity.map((item) => (
              <ActivityItem key={item.id} {...item} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
