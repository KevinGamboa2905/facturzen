import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

const BASE_URL = env.NEXT_PUBLIC_APP_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, authenticated and per-token areas stay out of the index.
      disallow: ["/app/", "/d/", "/f/", "/login", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
