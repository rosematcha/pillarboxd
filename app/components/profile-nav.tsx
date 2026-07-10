import { NavLink } from "react-router";

export interface ProfileNavCounts {
  films?: number;
  diary?: number;
  reviews?: number;
  lists?: number;
  watchlist?: number;
  likes?: number;
}

const TABS = [
  { key: "profile", label: "Profile", path: "" },
  { key: "films", label: "Films", path: "/films", countKey: "films" },
  { key: "diary", label: "Diary", path: "/diary", countKey: "diary" },
  { key: "reviews", label: "Reviews", path: "/reviews", countKey: "reviews" },
  { key: "lists", label: "Lists", path: "/lists", countKey: "lists" },
  {
    key: "watchlist",
    label: "Watchlist",
    path: "/watchlist",
    countKey: "watchlist",
  },
  { key: "likes", label: "Likes", path: "/likes", countKey: "likes" },
] as const;

export function ProfileNav({
  username,
  counts,
}: {
  username: string;
  counts?: ProfileNavCounts;
}): React.ReactElement {
  const base = `/u/${username}`;

  return (
    <nav
      aria-label="Profile sections"
      className="border-border gap-block -mx-block px-block flex [scrollbar-width:thin] overflow-x-auto border-b sm:mx-0 sm:px-0"
    >
      {TABS.map((tab) => {
        const to = `${base}${tab.path}`;
        const countKey = "countKey" in tab ? tab.countKey : null;
        const count =
          countKey !== null && counts !== undefined
            ? counts[countKey]
            : undefined;
        return (
          <NavLink
            key={tab.key}
            to={to}
            end={tab.path === ""}
            className={({ isActive }) =>
              [
                "gap-tight py-related ease-feedback inline-flex min-h-11 shrink-0 items-center text-sm font-medium transition-colors duration-[var(--duration-feedback)]",
                isActive ? "text-accent" : "text-muted hover:text-text",
              ].join(" ")
            }
          >
            {tab.label}
            {count !== undefined && (
              <span className="text-faint text-xs tabular-nums">
                {String(count)}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
