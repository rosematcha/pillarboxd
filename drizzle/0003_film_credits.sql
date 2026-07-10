ALTER TABLE "films" ADD COLUMN IF NOT EXISTS "genres" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN IF NOT EXISTS "cast" jsonb DEFAULT '[]'::jsonb NOT NULL;
