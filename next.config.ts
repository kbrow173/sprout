import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home dir makes Next infer the wrong
  // workspace root. Pin it to this project so Turbopack's file boundary is right.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Plant photos live in Supabase Storage; the exact project host is set once
    // the Supabase project exists. Wildcard HTTPS keeps next/image happy for any
    // user-supplied/CDN image without predicting the host (see MEMORY.md).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
