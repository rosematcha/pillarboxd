import { useId, useState } from "react";

import { ratingToStars } from "~/lib/letterboxd";

function labelForValue(value: number): string {
  const stars = ratingToStars(value);
  return `${String(stars)} out of 5 stars`;
}

export function StarRatingInput({
  defaultValue = null,
  name,
}: {
  defaultValue?: number | null;
  name: string;
}): React.ReactElement {
  const groupId = useId();
  const [value, setValue] = useState<number | null>(defaultValue);

  const display =
    value === null
      ? "No rating"
      : `${ratingToStars(value).toFixed(value % 2 === 0 ? 0 : 1)} / 5`;

  return (
    <div className="gap-tight flex flex-col">
      <input
        type="hidden"
        name={name}
        value={value === null ? "" : String(value)}
      />
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="flex items-center gap-px"
      >
        <span id={`${groupId}-label`} className="sr-only">
          Choose a star rating
        </span>
        {[1, 2, 3, 4, 5].map((star) => {
          const halfValue = star * 2 - 1;
          const fullValue = star * 2;
          const fill =
            value === null
              ? 0
              : value >= fullValue
                ? 1
                : value >= halfValue
                  ? 0.5
                  : 0;
          return (
            <span
              key={star}
              className="relative inline-flex size-11 items-center justify-center text-xl leading-none"
            >
              <span
                aria-hidden="true"
                className="text-gold/25 absolute inset-0 flex items-center justify-center"
              >
                ★
              </span>
              {fill > 0 && (
                <span
                  aria-hidden="true"
                  className="text-gold absolute inset-0 flex items-center overflow-hidden"
                  style={{ width: fill === 1 ? "100%" : "50%" }}
                >
                  ★
                </span>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={value === halfValue}
                aria-label={labelForValue(halfValue)}
                className="focus-visible:ring-accent absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => {
                  setValue((current) =>
                    current === halfValue ? null : halfValue,
                  );
                }}
              />
              <button
                type="button"
                role="radio"
                aria-checked={value === fullValue}
                aria-label={labelForValue(fullValue)}
                className="focus-visible:ring-accent absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => {
                  setValue((current) =>
                    current === fullValue ? null : fullValue,
                  );
                }}
              />
            </span>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label="No rating"
          className="text-muted hover:text-text focus-visible:ring-accent ml-related px-tight min-h-11 rounded-sm text-xs focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => {
            setValue(null);
          }}
        >
          Clear
        </button>
      </div>
      <p className="text-muted text-xs tabular-nums" aria-live="polite">
        <span className="sr-only">Selected rating: </span>
        {display}
      </p>
    </div>
  );
}
