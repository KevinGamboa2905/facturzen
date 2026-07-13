import type { MetadataRoute } from "next";

const BASE_URL = "https://facturzen.ch";

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
