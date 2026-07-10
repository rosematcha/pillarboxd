export function SiteFooter({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <footer
      className={[
        "gap-tight border-border px-block py-step text-faint flex flex-col border-t text-center text-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p>
        Your instance can follow people on other instances, and they can follow
        you.
      </p>
      <p>
        This product uses the <a href="https://www.themoviedb.org/">TMDB API</a>{" "}
        but is not endorsed or certified by TMDB. Source on{" "}
        <a href="https://github.com/rosematcha/pillarboxd">GitHub</a>.
      </p>
    </footer>
  );
}
