import { useState } from "react";

export function SpoilerText({
  children,
  containsSpoilers,
}: {
  children: string;
  containsSpoilers: boolean;
}): React.ReactElement {
  const [revealed, setRevealed] = useState(!containsSpoilers);

  if (!containsSpoilers || revealed) {
    return <span className="whitespace-pre-wrap">{children}</span>;
  }

  return (
    <span className="gap-tight inline-flex flex-col items-start">
      <span
        aria-hidden="true"
        className="rounded-control bg-bg-subtle text-muted px-related py-tight max-w-[50ch] text-sm blur-sm select-none"
      >
        {children.slice(0, 120)}
      </span>
      <button
        type="button"
        className="text-accent text-sm font-medium"
        onClick={() => {
          setRevealed(true);
        }}
      >
        Show spoiler review
      </button>
    </span>
  );
}
