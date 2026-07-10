import { Link, useNavigate } from "react-router";

import { authClient } from "~/lib/auth/auth.client";

export interface NavUser {
  username: string;
}

export function Nav({ user }: { user: NavUser | null }): React.ReactElement {
  const navigate = useNavigate();

  const signOut = async (): Promise<void> => {
    await authClient.signOut();
    await navigate("/", { viewTransition: false });
  };

  return (
    <nav className="flex items-center gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <Link to="/" className="font-semibold">
        pillarboxd
      </Link>
      <Link to="/films/search" className="text-sm">
        Search
      </Link>
      <span className="flex-1" />
      {user === null ? (
        <>
          <Link to="/login" className="text-sm">
            Log in
          </Link>
          <Link to="/register" className="text-sm">
            Register
          </Link>
        </>
      ) : (
        <>
          <Link to={`/u/${user.username}`} className="text-sm">
            @{user.username}
          </Link>
          <Link to="/settings/data" className="text-sm">
            Import/Export
          </Link>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </button>
        </>
      )}
    </nav>
  );
}
