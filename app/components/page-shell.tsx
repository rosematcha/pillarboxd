import type { ReactNode } from "react";

export type PageWidth = "prose" | "wide";

const widthClasses: Record<PageWidth, string> = {
  prose: "max-w-[42rem]",
  wide: "max-w-[64rem]",
};

export function PageShell({
  children,
  className,
  width = "prose",
}: {
  children: ReactNode;
  className?: string;
  width?: PageWidth;
}): React.ReactElement {
  return (
    <main
      className={[
        "gap-step px-block py-step mx-auto flex flex-col sm:py-12",
        widthClasses[width],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </main>
  );
}
