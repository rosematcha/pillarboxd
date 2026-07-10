import { requireSession } from "~/lib/auth/auth.server";
import { exportJson } from "~/lib/exporter.server";
import type { Route } from "./+types/export.json";

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  const session = await requireSession(request);
  const body = await exportJson(session.user.id);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="pillarboxd-export.json"',
    },
  });
}
