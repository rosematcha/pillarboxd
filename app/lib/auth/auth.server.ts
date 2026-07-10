import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

import * as authSchema from "~/lib/db/auth-schema";
import { db } from "~/lib/db/client.server";
import { actors } from "~/lib/db/schema";
import { env } from "~/lib/env.server";

const generateKeyPairAsync = promisify(generateKeyPair);

/**
 * Mint an RSA keypair for a new user's ActivityPub actor. RSA (not Ed25519)
 * because Mastodon-compatible HTTP signatures require it.
 */
async function createActorKeys(userId: string): Promise<void> {
  const { publicKey, privateKey } = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  await db().insert(actors).values({
    userId,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  });
}

function createAuth() {
  return betterAuth({
    baseURL: env().APP_URL,
    secret: env().BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
    },
    advanced: {
      useSecureCookies: env().APP_URL.startsWith("https://"),
    },
    plugins: [
      username({
        minUsernameLength: 2,
        maxUsernameLength: 30,
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await createActorKeys(createdUser.id);
          },
        },
      },
    },
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

export function auth(): ReturnType<typeof createAuth> {
  cached ??= createAuth();
  return cached;
}

/** Session lookup for loaders/actions. Returns null when signed out. */
export async function getSession(
  request: Request,
): Promise<Awaited<ReturnType<ReturnType<typeof auth>["api"]["getSession"]>>> {
  return auth().api.getSession({ headers: request.headers });
}

/** Like getSession, but throws a redirect to /login when signed out. */
export async function requireSession(
  request: Request,
): Promise<NonNullable<Awaited<ReturnType<typeof getSession>>>> {
  const session = await getSession(request);
  if (session === null) {
    const url = new URL(request.url);
    throw new Response(null, {
      status: 302,
      headers: {
        Location: `/login?redirectTo=${encodeURIComponent(url.pathname)}`,
      },
    });
  }
  return session;
}
