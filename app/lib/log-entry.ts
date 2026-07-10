import { z } from "zod";

export const logEntryInputSchema = z.object({
  filmId: z.uuid(),
  watchedOn: z.iso.date().nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  review: z.string().trim().max(100_000).nullable(),
  liked: z.boolean(),
  rewatch: z.boolean(),
  containsSpoilers: z.boolean(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(80)).max(50),
});

export type LogEntryInput = z.infer<typeof logEntryInputSchema>;
