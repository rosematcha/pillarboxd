export function StarRating({
  className,
  rating,
  showValue = false,
}: {
  className?: string;
  rating: number;
  showValue?: boolean;
}): React.ReactElement {
  const value = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(value);
  const hasHalfStar = value - fullStars >= 0.5;
  const stars = `${"★".repeat(fullStars)}${hasHalfStar ? "½" : ""}`;
  const label =
    value === 0
      ? "No rating"
      : `${value.toFixed(value % 1 === 0 ? 0 : 1)} out of 5 stars`;

  return (
    <span
      className={["gap-tight inline-flex items-baseline", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-gold text-sm tracking-[0.02em]" aria-hidden="true">
        {stars}
      </span>
      <span className={showValue ? "text-muted text-sm" : "sr-only"}>
        {label}
      </span>
    </span>
  );
}
