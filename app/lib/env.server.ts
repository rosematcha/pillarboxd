import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_URL: z.url(),
  TMDB_ACCESS_TOKEN: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  cached ??= envSchema.parse(process.env);
  return cached;
}
