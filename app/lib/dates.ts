const shortDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const shortDateWithYear = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatShortDate(
  value: string | Date | null,
  options: { includeYear?: boolean } = {},
): string {
  if (value === null) {
    return "No date";
  }
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return options.includeYear === true
    ? shortDateWithYear.format(date)
    : shortDate.format(date);
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const deltaMs = date.getTime() - Date.now();
  const deltaMinutes = Math.round(deltaMs / 60_000);
  if (Math.abs(deltaMinutes) < 60) {
    return relativeTime.format(deltaMinutes, "minute");
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return relativeTime.format(deltaHours, "hour");
  }
  const deltaDays = Math.round(deltaHours / 24);
  if (Math.abs(deltaDays) < 7) {
    return relativeTime.format(deltaDays, "day");
  }
  return formatShortDate(date, { includeYear: true });
}
