import { Form, Link } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { EmptyState } from "~/components/empty-state";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { ProfileNav } from "~/components/profile-nav";
import { formString } from "~/lib/form";
import { getSession, requireSession } from "~/lib/auth/auth.server";
import {
  follow,
  getFollowers,
  isFollowing,
  unfollow,
} from "~/lib/follows.server";
import {
  loadProfileCounts,
  viewerFromSession,
} from "~/lib/profile-route.server";
import type { Route } from "./+types/profile.followers";

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: `@${params.username} · Followers | pillarboxd` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request);
  const profile = await loadProfileCounts(params.username);
  const followers = await getFollowers(profile.user.id);
  const followState = new Map<string, boolean>();
  if (session !== null) {
    await Promise.all(
      followers.map(async (person) => {
        followState.set(
          person.id,
          await isFollowing(session.user.id, person.id),
        );
      }),
    );
  }
  return {
    user: viewerFromSession(session),
    profile: { username: profile.user.username },
    counts: profile.counts,
    viewerId: session?.user.id ?? null,
    people: followers.flatMap((person) =>
      person.username === null
        ? []
        : [
            {
              id: person.id,
              username: person.username,
              name: person.name,
              isFollowing: followState.get(person.id) ?? false,
            },
          ],
    ),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireSession(request);
  await loadProfileCounts(params.username);
  const form = await request.formData();
  const targetId = formString(form, "userId");
  const intent = formString(form, "intent");
  if (targetId === "" || targetId === session.user.id) {
    return null;
  }
  if (intent === "follow") {
    await follow(session.user.id, targetId);
  } else if (intent === "unfollow") {
    await unfollow(session.user.id, targetId);
  }
  return null;
}

export default function ProfileFollowers({ loaderData }: Route.ComponentProps) {
  const { user, profile, counts, people, viewerId } = loaderData;
  return (
    <>
      <Nav user={user} />
      <PageShell width="wide">
        <h1 className="font-heading text-xl">@{profile.username}</h1>
        <ProfileNav username={profile.username} counts={counts} />
        <h2 className="font-heading text-lg">Followers</h2>
        {people.length === 0 ? (
          <EmptyState
            action={
              <Link
                to={`/u/${profile.username}`}
                className={buttonStyles("secondary")}
              >
                Back to profile
              </Link>
            }
          >
            No followers yet.
          </EmptyState>
        ) : (
          <ul className="flex max-w-[42rem] flex-col">
            {people.map((person) => (
              <li
                key={person.id}
                className="border-border gap-block py-related flex items-center justify-between border-b"
              >
                <div className="gap-tight flex flex-col">
                  <Link
                    to={`/u/${person.username}`}
                    className="hover:text-accent font-medium"
                  >
                    @{person.username}
                  </Link>
                  {person.name !== person.username && (
                    <span className="text-muted text-sm">{person.name}</span>
                  )}
                </div>
                {viewerId !== null && viewerId !== person.id && (
                  <Form method="post">
                    <input type="hidden" name="userId" value={person.id} />
                    <input
                      type="hidden"
                      name="intent"
                      value={person.isFollowing ? "unfollow" : "follow"}
                    />
                    <Button
                      type="submit"
                      variant={person.isFollowing ? "secondary" : "primary"}
                      className="px-related py-1"
                    >
                      {person.isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                  </Form>
                )}
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </>
  );
}
