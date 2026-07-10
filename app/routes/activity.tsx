import { Link } from "react-router";

import { ActivityItem } from "~/components/activity-item";
import { buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { getSession } from "~/lib/auth/auth.server";
import { getFollowingActivity } from "~/lib/follows.server";
import { getRecentActivity } from "~/lib/logs.server";
import type { Route } from "./+types/activity";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Activity | pillarboxd" }];
}

function mapActivity(
  items: Awaited<ReturnType<typeof getRecentActivity>>["items"],
) {
  return items.flatMap((item) =>
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
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const scopeParam = url.searchParams.get("scope");
  const session = await getSession(request);
  const username = session?.user.username;
  const canFollow = session !== null;
  const scope =
    canFollow && scopeParam === "following" ? "following" : "instance";
  const cursor = url.searchParams.get("cursor");

  const activity =
    scope === "following" && session !== null
      ? await getFollowingActivity(session.user.id, { cursor })
      : await getRecentActivity({ cursor });

  return {
    user: username === null || username === undefined ? null : { username },
    scope,
    canFollow,
    activity: mapActivity(activity.items),
    nextCursor: activity.nextCursor,
  };
}

export default function Activity({ loaderData }: Route.ComponentProps) {
  const olderHref = (() => {
    if (loaderData.nextCursor === null) {
      return null;
    }
    const params = new URLSearchParams();
    if (loaderData.scope === "following") {
      params.set("scope", "following");
    }
    params.set("cursor", loaderData.nextCursor);
    return `/activity?${params.toString()}`;
  })();

  return (
    <>
      <Nav user={loaderData.user} />
      <PageShell>
        <header className="gap-block border-border pb-section flex flex-col border-b">
          <div className="gap-tight flex flex-col">
            <h1 className="font-heading text-xl">Activity</h1>
            <p className="text-muted max-w-[70ch] text-sm">
              {loaderData.scope === "following"
                ? "Logs and reviews from people you follow."
                : "Everything logged and reviewed on this instance."}
            </p>
          </div>
          {loaderData.canFollow && (
            <div className="gap-related flex flex-wrap text-sm">
              <Link
                to="/activity"
                className={
                  loaderData.scope === "instance"
                    ? "text-accent font-medium"
                    : "text-muted hover:text-text"
                }
              >
                Instance
              </Link>
              <Link
                to="/activity?scope=following"
                className={
                  loaderData.scope === "following"
                    ? "text-accent font-medium"
                    : "text-muted hover:text-text"
                }
              >
                Following
              </Link>
            </div>
          )}
        </header>
        {loaderData.activity.length === 0 ? (
          <EmptyState
            action={
              <Link to="/films/search" className={buttonStyles("primary")}>
                {loaderData.scope === "following"
                  ? "Find people via films"
                  : "Find a film"}
              </Link>
            }
          >
            {loaderData.scope === "following"
              ? "No activity from people you follow yet. Follow someone from their profile."
              : "No one has logged a film yet."}
          </EmptyState>
        ) : (
          <div>
            {loaderData.activity.map((item) => (
              <ActivityItem key={item.id} {...item} />
            ))}
            {olderHref !== null && (
              <div className="pt-step">
                <Link to={olderHref} className={buttonStyles("secondary")}>
                  Older activity
                </Link>
              </div>
            )}
          </div>
        )}
      </PageShell>
    </>
  );
}
