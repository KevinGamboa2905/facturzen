// Single source of truth for environment configuration.
//
// Every variable is validated here at startup with Zod, so a missing REQUIRED
// variable fails fast with a readable message (pointing at DEPLOY.md) instead of
// a cryptic runtime crash deep in a request. OPTIONAL variables never throw:
// their absence flips a feature flag (see `flags`) so the app degrades cleanly.
//
// Rule for the rest of the codebase: read `env.X` / `flags.X` from here — never
// reach into `process.env` directly (the only allowed `process.env` reads live
// in this file).
import { z } from "zod";

// --- Client-exposed vars -----------------------------------------------------
// Referenced by their literal names so Next can inline them into the browser
// bundle. NEXT_PUBLIC_* is the only class of variable that is safe on the client.
const rawClient = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(
    "NEXT_PUBLIC_APP_URL doit être une URL absolue (ex. https://facturzen.vercel.app) — voir DEPLOY.md §3",
  ),
});

// --- Server-only vars --------------------------------------------------------
// A required string that shows the SAME friendly message whether the variable
// is missing (undefined) or empty (""). z.string(msg) sets the type-mismatch
// message (undefined case); .min(1, msg) sets the empty-string case.
const required = (msg: string) => z.string(msg).min(1, msg);

const serverSchema = z.object({
  // Required — the app cannot boot without these.
  DATABASE_URL: required("DATABASE_URL manquante — voir DEPLOY.md §1"),
  AUTH_SECRET: required(
    "AUTH_SECRET manquante — génère-la avec `npx auth secret` — voir DEPLOY.md §3",
  ),
  AUTH_GOOGLE_ID: required("AUTH_GOOGLE_ID manquante — voir DEPLOY.md §4"),
  AUTH_GOOGLE_SECRET: required("AUTH_GOOGLE_SECRET manquante — voir DEPLOY.md §4"),
  CRON_SECRET: required(
    "CRON_SECRET manquante — génère-la avec `openssl rand -hex 32` — voir DEPLOY.md §5",
  ),

  // Optional — absence degrades gracefully, never a 500 (see `flags`).
  RESEND_API_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

const isServer = typeof window === "undefined";

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  ❌ ${i.message}`).join("\n");
}

// Client vars are inlined at build time, so this parse runs (and can be trusted)
// on both server and client.
const clientParsed = clientSchema.safeParse(rawClient);
if (!clientParsed.success) {
  throw new Error(
    `Variable d'environnement publique invalide :\n${formatIssues(clientParsed.error)}`,
  );
}
// Captured here so nested closures (absoluteUrl) see the non-undefined data.
const clientEnv = clientParsed.data;

// Server vars are validated only on the server. On the client they are simply
// absent — accessing one is a programming error, caught by the Proxy below.
type ServerEnv = z.infer<typeof serverSchema>;
let serverParsed: ServerEnv | undefined;
if (isServer) {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      "Variables d'environnement requises manquantes ou invalides :\n" +
        formatIssues(result.error) +
        "\n\n→ Voir DEPLOY.md pour la configuration complète.",
    );
  }
  serverParsed = result.data;
}

type Env = ServerEnv & z.infer<typeof clientSchema>;

const serverKeys = new Set(Object.keys(serverSchema.shape));
const clientKeys = new Set(Object.keys(clientSchema.shape));

// Unified accessor. Reading a server-only var on the client throws a clear error
// instead of silently returning `undefined` (which would leak into logic).
export const env = new Proxy({ ...(serverParsed ?? {}), ...clientEnv } as Env, {
  get(target, prop: string | symbol) {
    if (typeof prop === "string" && !isServer && serverKeys.has(prop) && !clientKeys.has(prop)) {
      throw new Error(
        `env.${prop} est une variable serveur : elle ne peut pas être lue côté client. ` +
          `Passe-la en prop depuis un Server Component / Server Action.`,
      );
    }
    return target[prop as keyof Env];
  },
});

// --- Feature flags -----------------------------------------------------------
// Derived from optional vars. Server-evaluated; pass to client components as
// props when the UI needs them.
export const flags = {
  email: Boolean(serverParsed?.RESEND_API_KEY), // Resend transactional emails
  stripe: Boolean(serverParsed?.STRIPE_SECRET_KEY), // paid subscriptions
  blob: Boolean(serverParsed?.BLOB_READ_WRITE_TOKEN), // Vercel Blob file storage
  ai: Boolean(serverParsed?.ANTHROPIC_API_KEY), // AI-assisted quote drafting
} as const;

// --- Runtime environment -----------------------------------------------------
export const nodeEnv = process.env.NODE_ENV ?? "development";
export const isProduction = nodeEnv === "production";
export const isDevelopment = nodeEnv === "development";

// Build an absolute URL from the configured app origin. Use this everywhere an
// email, notification, or OG link needs a full URL — never hardcode a host.
export function absoluteUrl(path = ""): string {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (!path) return base;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
