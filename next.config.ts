import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is opened at 127.0.0.1. Without this, Next blocks the
  // HMR websocket and the page stays on the server-rendered shell.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // GitHub Pages serves the files in `out`. Cache Components enable Partial
  // Prerendering, and this Next version rejects that combination during
  // export ("PPR cannot be enabled in export mode"). The editor does not use
  // the cache directive, so those options stay off.
  output: "export",
  basePath: "/vox-vtxprog-editor",
  assetPrefix: "/vox-vtxprog-editor",
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
