import { useState } from "react";
import type { ImgHTMLAttributes } from "react";

export function PosterImage({
  alt,
  className,
  loading = "lazy",
  title,
  url,
}: {
  alt: string;
  className?: string;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  title: string;
  url: string | null;
}): React.ReactElement {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPlaceholder = url === null || failedUrl === url;

  return (
    <div
      className={["bg-bg-subtle relative overflow-hidden", className].join(" ")}
    >
      {showPlaceholder ? (
        <span
          aria-hidden="true"
          className="text-faint flex size-full items-center justify-center text-xs font-medium"
        >
          {title.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <img
          src={url}
          alt={alt}
          loading={loading}
          className="size-full object-cover"
          onError={() => {
            setFailedUrl(url);
          }}
        />
      )}
    </div>
  );
}
