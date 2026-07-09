const isDev = process.env.NODE_ENV === "development"

// Production is a static export served next to the API (Caddy routes /api/* to FastAPI).
// The dev server forwards /api/* to the backend so the browser stays on one origin there too.
const apiTarget = process.env.API_PROXY_URL || "http://127.0.0.1:8000"

/** @type {import('next').NextConfig} */
const nextConfig = isDev
    ? {
          trailingSlash: true,
          async rewrites() {
              return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }]
          },
      }
    : {
          output: "export",
          distDir: "dist",
          trailingSlash: true,
          images: { unoptimized: true },
      }

module.exports = nextConfig
