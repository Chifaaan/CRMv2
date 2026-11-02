import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Folder app Next (bukan monorepo root), supaya .env/PORT & tracing konsisten. */
const appDir = path.dirname(fileURLToPath(import.meta.url));

// Satu sumber: BACKEND_ORIGIN di frontend/.env (Next memuat .env sebelum config dievaluasi).
// Fallback: sama dengan default Nest (backend/src/main.ts, env PORT atau 3001) bila belum diset — pastikan porta cocok dengan server Nest.
const backendOrigin = (
  process.env.BACKEND_ORIGIN?.replace(/\/$/, "") || "http://127.0.0.1:3001"
);

function imageRemoteForBackend(origin: string) {
  const u = new URL(origin);
  const protocol = u.protocol === "https:" ? "https" : "http";
  const pat: {
    protocol: "http" | "https";
    hostname: string;
    pathname: string;
    port?: string;
  } = {
    protocol,
    hostname: u.hostname,
    pathname: "/uploads/**",
  };
  if (u.port) pat.port = u.port;
  return pat;
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Hindari infer root ke induk (ada package-lock di repo) — tanpa ini PORT di frontend/.env sering diabaikan.
  turbopack: {
    root: appDir,
  },
  outputFileTracingRoot: appDir,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [imageRemoteForBackend(backendOrigin)],
  },
};

export default nextConfig;
