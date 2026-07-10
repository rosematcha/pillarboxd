CREATE INDEX IF NOT EXISTS "log_entries_watched_on_created_at_idx"
  ON "log_entries" ("watched_on" DESC NULLS LAST, "created_at" DESC, "id" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "log_entries_film_id_idx"
  ON "log_entries" ("film_id");
