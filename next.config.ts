import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Opt native-binary packages out of the Next.js server-component bundler so
  // they are loaded via native Node.js require() with their compiled .node files.
  serverExternalPackages: ["sharp", "jsqr", "pngjs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
