import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Only the project's own Supabase Storage host may be optimized by next/image.
// A `**` wildcard turned /_next/image into an open proxy for any site (audit B3).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home dir makes Next infer the wrong
  // workspace root. Pin it to this project so Turbopack's file boundary is right.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
  },
  experimental: {
    serverActions: {
      // Backstop only — photos are downscaled client-side to ~300KB first
      // (lib/image.ts). Default 1MB rejected raw phone photos (L25).
      bodySizeLimit: "2mb",
    },
  },
};

export default withNextIntl(nextConfig);
