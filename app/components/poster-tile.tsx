import { Link } from "react-router";

import { PosterImage } from "./poster-image";

export function PosterTile({
  className,
  loading,
  posterUrl,
  title,
  to,
  year,
}: {
  className?: string;
  loading?: "eager" | "lazy";
  posterUrl: string | null;
  title: string;
  to: string;
  year: number | null;
}): React.ReactElement {
  return (
    <Link
      to={to}
      aria-label={year === null ? title : `${title}, ${String(year)}`}
      className={[
        "group rounded-poster bg-bg-subtle text-text ease-feedback hover:border-border-strong focus-visible:border-border-strong relative block aspect-[2/3] overflow-hidden border border-transparent transition-colors duration-[var(--duration-feedback)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {posterUrl === null ? (
        <PosterImage title={title} alt="" url={null} className="size-full" />
      ) : (
        <PosterImage
          title={title}
          alt=""
          loading={loading}
          url={posterUrl}
          className="size-full"
        />
      )}
      <span className="px-tight pt-block pb-tight ease-feedback absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-[oklch(0.12_0.008_350/0.92)] text-xs opacity-0 transition-opacity duration-[var(--duration-feedback)] group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
        <strong className="block font-medium text-[oklch(0.92_0.008_350)]">
          {title}
        </strong>
        {year !== null && (
          <span className="text-[oklch(0.7_0.012_350)]">{String(year)}</span>
        )}
      </span>
    </Link>
  );
}
