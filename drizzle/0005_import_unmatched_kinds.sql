ALTER TABLE "import_unmatched" ADD COLUMN "kind" text DEFAULT 'diary' NOT NULL;
--> statement-breakpoint
ALTER TABLE "import_unmatched" ADD COLUMN "list_id" uuid;
--> statement-breakpoint
ALTER TABLE "import_unmatched" ADD CONSTRAINT "import_unmatched_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;
