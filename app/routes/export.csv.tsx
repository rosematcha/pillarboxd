import { requireSession } from "~/lib/auth/auth.server";
import { exportDiaryCsv } from "~/lib/exporter.server";
import type { Route } from "./+types/export.csv";

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  const session = await requireSession(request);
  const body = await exportDiaryCsv(session.user.id);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pillarboxd-diary.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
