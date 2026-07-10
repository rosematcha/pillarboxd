import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/lib/env.server";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

const fullSchema = { ...schema, ...authSchema };

let cached: ReturnType<typeof createDb> | undefined;

function createDb() {
  const client = postgres(env().DATABASE_URL);
  return drizzle(client, { schema: fullSchema, casing: "snake_case" });
}

export function db(): ReturnType<typeof createDb> {
  cached ??= createDb();
  return cached;
}

export type DbTransaction = Parameters<
  Parameters<ReturnType<typeof createDb>["transaction"]>[0]
>[0];
