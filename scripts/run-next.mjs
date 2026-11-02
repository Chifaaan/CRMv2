/**
 * Load frontend/.env before spawning Next so CLI --port sees PORT
 * (Next applies .env to the app after the dev-server port is chosen).
 */
import { spawn } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(appDir, ".env");

if (existsSync(envPath)) loadEnvFile(envPath);

const port = process.env.PORT?.trim();
if (port && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
  process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${port}`;
}

const nextBin = join(appDir, "node_modules", "next", "dist", "bin", "next");
const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/run-next.mjs <dev|start|build|...> [next flags]");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);

  // Next.js 16 belum menulis manifest ini sendiri, tetapi packaging Vercel
  // mencarinya setelah build selesai. Salin manifest rute yang setara supaya
  // deploy tidak gagal dengan ENOENT routes-manifest-deterministic.json.
  if (code === 0 && args[0] === "build") {
    const distDir = join(appDir, ".next");
    const manifest = join(distDir, "routes-manifest.json");
    const deterministic = join(distDir, "routes-manifest-deterministic.json");
    if (existsSync(manifest) && !existsSync(deterministic)) {
      try {
        copyFileSync(manifest, deterministic);
      } catch (error) {
        console.warn(
          "Gagal membuat routes-manifest-deterministic.json:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  process.exit(code ?? 1);
});
