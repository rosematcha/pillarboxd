import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";

import { Button, buttonStyles } from "~/components/button";
import { FilmSearch } from "~/components/film-search";
import { authClient } from "~/lib/auth/auth.client";

export interface NavUser {
  username: string;
}

export function Nav({ user }: { user: NavUser | null }): React.ReactElement {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
    [
      "min-h-11 border-border flex items-center border-b py-related text-sm font-medium transition-colors duration-[var(--duration-feedback)] ease-feedback last:border-b-0",
      isActive ? "text-accent" : "text-muted hover:text-text",
    ].join(" ");

  return (
    <nav aria-label="Main" className="border-border border-b">
      <div className="px-block py-related mx-auto max-w-[64rem]">
        <div className="gap-block flex items-center sm:hidden">
          <Link
            to="/"
            className="font-heading text-text hover:text-accent text-lg tracking-[-0.01em]"
          >
            pillarboxd
          </Link>
          <Button
            type="button"
            variant="secondary"
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            className="px-related ml-auto min-h-11"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
          >
            {menuOpen ? "Close" : "Menu"}
          </Button>
        </div>
        <FilmSearch className="mt-related w-full sm:hidden" />
        <div className="sm:gap-block hidden sm:flex sm:items-center">
          <Link
            to="/"
            className="font-heading text-text hover:text-accent text-lg tracking-[-0.01em]"
          >
            pillarboxd
          </Link>
          <FilmSearch className="max-w-56 flex-1" />
          <div className="gap-block ml-auto flex items-center justify-end">
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
        {menuOpen && (
          <div
            id="mobile-navigation"
            className="border-border mt-related border-t sm:hidden"
          >
            <NavLink
              to="/activity"
              className={mobileNavLinkClass}
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              Activity
            </NavLink>
            <NavLink
              to="/films/search"
              className={mobileNavLinkClass}
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              Search films
            </NavLink>
            {user === null ? (
              <>
                <NavLink
                  to="/login"
                  className={mobileNavLinkClass}
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  Log in
                </NavLink>
                <Link
                  to="/register"
                  className="text-accent py-related flex min-h-11 items-center text-sm font-medium"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                <NavLink
                  to={`/u/${user.username}`}
                  className={mobileNavLinkClass}
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  @{user.username}
                </NavLink>
                <NavLink
                  to={`/u/${user.username}/lists`}
                  className={mobileNavLinkClass}
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  Lists
                </NavLink>
                <NavLink
                  to="/settings/data"
                  className={mobileNavLinkClass}
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  Data
                </NavLink>
                <Button
                  type="button"
                  variant="secondary"
                  loading={signingOut}
                  loadingLabel="Signing out"
                  className="my-related min-h-11 w-full"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  Sign out
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
