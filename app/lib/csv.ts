/**
 * Minimal RFC 4180 CSV parser. Handles quoted fields, escaped quotes, and
 * newlines inside quotes (Letterboxd review exports contain all three).
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = (): void => {
    row.push(field);
    field = "";
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input.charAt(i);
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    switch (char) {
      case '"':
        inQuotes = true;
        i += 1;
        break;
      case ",":
        pushField();
        i += 1;
        break;
      case "\r":
        i += input[i + 1] === "\n" ? 2 : 1;
        pushRow();
        break;
      case "\n":
        pushRow();
        i += 1;
        break;
      default:
        field += char;
        i += 1;
    }
  }
  if (field !== "" || row.length > 0) {
    pushRow();
  }
  return rows;
}

/** Parse a CSV with a header row into records keyed by column name. */
export function parseCsvRecords(input: string): Record<string, string>[] {
  const rows = parseCsv(input);
  const header = rows[0];
  if (header === undefined) {
    return [];
  }
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      record[name] = cells[index] ?? "";
    });
    return record;
  });
}
