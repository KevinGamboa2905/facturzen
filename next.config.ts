import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep PDF engines out of the bundle so pdfkit can read its font metric files
  // and swissqrbill can load its embedded fonts at runtime.
  serverExternalPackages: ["pdfkit", "swissqrbill"],
  images: {
    // Logos uploaded to Vercel Blob are served from *.blob.vercel-storage.com.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async redirects() {
    // Single sign-in route (§1); legacy paths funnel into it.
    return [
      { source: "/login", destination: "/connexion", permanent: true },
      { source: "/signin", destination: "/connexion", permanent: true },
    ];
  },
};

export default nextConfig;
