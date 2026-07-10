import { requireSession } from "~/lib/auth/auth.server";
import { formString } from "~/lib/form";
import {
  importLetterboxdRss,
  importLetterboxdZip,
  importManualEntry,
  importPillarboxdJson,
  type ImportResult,
  type UnmatchedEntry,
} from "~/lib/importer.server";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_JSON_BYTES = 25 * 1024 * 1024;

export interface ImportActionData {
  result: ImportResult | null;
  error: string | null;
  status: number;
  manualMatch?: { imported: boolean; reason?: "duplicate" | "invalid" };
}

function parseUnmatchedEntry(form: FormData): UnmatchedEntry | null {
  const name = formString(form, "name");
  if (name === "") {
    return null;
  }
  const yearRaw = formString(form, "year");
  const year = yearRaw === "" ? null : Number.parseInt(yearRaw, 10);
  const watchedOnRaw = formString(form, "watchedOn");
  const ratingRaw = formString(form, "rating");
  const reviewRaw = formString(form, "review");
  const entryId = formString(form, "entryId");
  return {
    ...(entryId !== "" ? { id: entryId } : {}),
    name,
    year: year !== null && Number.isNaN(year) ? null : year,
    watchedOn: watchedOnRaw === "" ? null : watchedOnRaw,
    rating:
      ratingRaw === "" || Number.isNaN(Number.parseInt(ratingRaw, 10))
        ? null
        : Number.parseInt(ratingRaw, 10),
    review: reviewRaw === "" ? null : reviewRaw,
    rewatch: form.get("rewatch") === "on",
    liked: form.get("liked") === "on",
    containsSpoilers: form.get("containsSpoilers") === "on",
    tags: formString(form, "tags")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag !== ""),
    candidates: [],
    kind: "diary",
    listId: null,
  };
}

/**
 * Shared handler for the Letterboxd import forms (used by both the signup
 * onboarding step and settings). Dispatches on the form's `intent`: "rss"
 * imports recent activity from a username's public feed, "zip" imports a full
 * export archive.
 */
export async function handleImportAction(
  request: Request,
): Promise<ImportActionData> {
  const session = await requireSession(request);
  const form = await request.formData();
  const intent = formString(form, "intent");
  try {
    if (intent === "rss") {
      const result = await importLetterboxdRss(
        session.user.id,
        formString(form, "username"),
      );
      return { result, error: null, status: 200 };
    }
    if (intent === "zip") {
      const file = form.get("export");
      if (!(file instanceof File) || file.size === 0) {
        return {
          result: null,
          error: "Choose your Letterboxd export .zip.",
          status: 400,
        };
      }
      if (file.size > MAX_ZIP_BYTES) {
        return {
          result: null,
          error: "That Letterboxd export is too large. The limit is 50 MB.",
          status: 413,
        };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await importLetterboxdZip(session.user.id, bytes);
      return { result, error: null, status: 200 };
    }
    if (intent === "json") {
      const file = form.get("export");
      if (!(file instanceof File) || file.size === 0) {
        return {
          result: null,
          error: "Choose a pillarboxd JSON export.",
          status: 400,
        };
      }
      if (file.size > MAX_JSON_BYTES) {
        return {
          result: null,
          error: "That pillarboxd export is too large. The limit is 25 MB.",
          status: 413,
        };
      }
      const result = await importPillarboxdJson(
        session.user.id,
        await file.text(),
      );
      return { result, error: null, status: 200 };
    }
    if (intent === "match") {
      const entry = parseUnmatchedEntry(form);
      const tmdbIdRaw = formString(form, "tmdbId");
      const tmdbId = /^\d+$/.test(tmdbIdRaw) ? Number(tmdbIdRaw) : Number.NaN;
      const jobIdRaw = formString(form, "jobId");
      const jobId = jobIdRaw === "" ? undefined : jobIdRaw;
      if (entry === null) {
        return {
          result: null,
          error: "Missing entry details for manual match.",
          status: 400,
        };
      }
      const manualMatch = await importManualEntry(
        session.user.id,
        tmdbId,
        entry,
        jobId,
      );
      if (!manualMatch.imported) {
        const message =
          manualMatch.reason === "duplicate"
            ? "That watch is already in your diary."
            : "Could not match that film. Pick another TMDB result.";
        return {
          result:
            manualMatch.unmatched !== undefined
              ? {
                  imported: 0,
                  unmatched: manualMatch.unmatched,
                  ...(jobId !== undefined ? { jobId } : {}),
                }
              : null,
          error: message,
          status: 400,
          manualMatch,
        };
      }
      return {
        result: {
          imported: manualMatch.importedCount ?? 1,
          unmatched: manualMatch.unmatched ?? [],
          ...(jobId !== undefined ? { jobId } : {}),
        },
        error: null,
        status: 200,
        manualMatch,
      };
    }
    return { result: null, error: "Unknown import action.", status: 400 };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Import failed.",
      status: 400,
    };
  }
}
