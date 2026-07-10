import { requireSession } from "~/lib/auth/auth.server";
import { formString } from "~/lib/form";
import {
  importLetterboxdRss,
  importLetterboxdZip,
  type ImportResult,
} from "~/lib/importer.server";

export interface ImportActionData {
  result: ImportResult | null;
  error: string | null;
  status: number;
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
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await importLetterboxdZip(session.user.id, bytes);
      return { result, error: null, status: 200 };
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
