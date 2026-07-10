import { useState } from "react";
import { Form, Link, NavLink, useNavigate } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { Input } from "~/components/input";
import { authClient } from "~/lib/auth/auth.client";

export interface NavUser {
  username: string;
}

export function Nav({ user }: { user: NavUser | null }): React.ReactElement {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async (): Promise<void> => {
    setSigningOut(true);
    await authClient.signOut();
    await navigate("/", { viewTransition: false });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    [
      "text-sm font-medium transition-colors duration-[var(--duration-feedback)] ease-feedback hover:text-text",
      isActive ? "text-accent" : "text-muted",
    ].join(" ");

  return (
    <nav aria-label="Main" className="border-border border-b">
      <div className="gap-block px-block py-related mx-auto flex max-w-[64rem] flex-wrap items-center">
        <Link
          to="/"
          className="font-heading text-text hover:text-accent text-lg tracking-[-0.01em]"
        >
          pillarboxd
        </Link>
        <Form
          method="get"
          action="/films/search"
          role="search"
          className="order-3 w-full sm:order-none sm:max-w-56 sm:flex-1"
        >
          <Input
            type="search"
            name="q"
            aria-label="Search films"
            placeholder="Search films"
            className="w-full"
          />
        </Form>
        <div className="gap-block ml-auto flex flex-wrap items-center justify-end">
          <NavLink to="/activity" className={navLinkClass}>
            Activity
          </NavLink>
          <NavLink to="/films/search" className={navLinkClass}>
            Search
          </NavLink>
          {user === null ? (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <Link
                to="/register"
                className={buttonStyles("primary", "px-related py-1")}
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <NavLink to={`/u/${user.username}`} className={navLinkClass}>
                @{user.username}
              </NavLink>
              <NavLink
                to={`/u/${user.username}/lists`}
                className={navLinkClass}
              >
                Lists
              </NavLink>
              <NavLink to="/settings/data" className={navLinkClass}>
                Data
              </NavLink>
              <Button
                type="button"
                variant="secondary"
                loading={signingOut}
                loadingLabel="Signing out"
                className="px-related py-1"
                onClick={() => {
                  void signOut();
                }}
              >
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
