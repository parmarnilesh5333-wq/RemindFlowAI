/**
 * RemindFlow AI — Cloud & Local Build Orchestrator
 *
 * Automatically detects whether DATABASE_URL is a Cloud PostgreSQL connection
 * (Neon / Supabase $0/month free tier) or Local SQLite (file:./dev.db),
 * generates the matching Prisma Client, safely pushes the schema without
 * resetting data, initializes default workspace data if empty, and runs `next build`.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const dbUrl = (process.env.DATABASE_URL || "").trim();
const isPostgres =
  dbUrl.startsWith("postgres://") ||
  dbUrl.startsWith("postgresql://") ||
  dbUrl.startsWith("prisma+postgres://");

const schemaFlag = isPostgres
  ? "--schema=prisma/schema.postgres.prisma"
  : "--schema=prisma/schema.prisma";

console.log("============================================================");
console.log(" RemindFlow AI — Production Build & Schema Synchronizer");
console.log("============================================================");
console.log(`Database Provider : ${isPostgres ? "PostgreSQL (Cloud Free Tier)" : "SQLite (Local)"}`);

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit" });
}

// 1. Generate Prisma Client for the detected database provider
run(`npx prisma generate ${schemaFlag}`);

// 2. If running in cloud with PostgreSQL, push schema non-destructively
if (isPostgres) {
  console.log("[Cloud DB] Synchronizing PostgreSQL schema (non-destructive)...");
  run(`npx prisma db push ${schemaFlag} --skip-generate`);

  // If a local migration snapshot exists, import it; otherwise ensure base seed exists if DB is empty
  const snapshotPath = path.join(PROJECT_ROOT, "backups", "remindflow-data-export.json");
  if (fs.existsSync(snapshotPath)) {
    console.log("[Cloud DB] Found migration snapshot. Importing records idempotently...");
    run(`node scripts/cloud-data-sync.mjs import "${snapshotPath}"`);
  } else {
    console.log("[Cloud DB] Ensuring initial workspace user & settings exist...");
    run(`node scripts/seed.mjs`);
  }
}

// 3. Build Next.js production bundle
run("npx next build");
