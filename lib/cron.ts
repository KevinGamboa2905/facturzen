import "server-only";

import { env } from "@/lib/env";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on every scheduled
// invocation (when CRON_SECRET is defined in the project env). Any request
// without the matching secret is rejected, so cron endpoints can't be triggered
// by the public internet.
export function isAuthorizedCron(request: Request): boolean {
  const header = request.headers.get("authorization");
  return Boolean(header) && header === `Bearer ${env.CRON_SECRET}`;
}
