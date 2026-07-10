import { Link } from "react-router";

import { Nav } from "~/components/nav";
import { getSession } from "~/lib/auth/auth.server";
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
  const session = await getSession(request);
  const username = session?.user.username;
  return {
    user: username === null || username === undefined ? null : { username },
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold">pillarboxd</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          A free, open-source, federated film diary. Log what you watch, rate
          it, review it, and take your data with you — always.
        </p>
        <div className="mt-8 flex gap-4">
          {loaderData.user === null ? (
            <>
              <Link
                to="/register"
                className="rounded bg-gray-900 px-4 py-2 text-white dark:bg-white dark:text-gray-900"
              >
                Create an account
              </Link>
              <Link to="/login" className="px-4 py-2 underline">
                Log in
              </Link>
            </>
          ) : (
            <Link
              to={`/u/${loaderData.user.username}`}
              className="rounded bg-gray-900 px-4 py-2 text-white dark:bg-white dark:text-gray-900"
            >
              Your diary
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
