# RemindFlow AI — Local Startup, Backup & Cloud Deployment Guide

This guide explains how to:
1. Start **RemindFlow AI** locally on Windows with a single double-click (`start-remindflow.bat`).
2. Back up and restore your database safely (`backup-data.bat` / `restore-data.bat`).
3. Deploy **RemindFlow AI** to a permanent public HTTPS URL (so it works on phones, tablets, and other computers even when your laptop is switched off).

---

## 1. Starting RemindFlow AI Locally on Windows (One Double-Click)

After restarting your laptop:
1. Open the project folder: `C:\Users\niles\Downloads\RemindFlowAI`
2. Double-click **`start-remindflow.bat`**.
3. The script automatically:
   - Verifies Node.js, `.env`, `node_modules`, and your existing SQLite database (`prisma/dev.db`) without resetting any data.
   - Checks if RemindFlow AI is already running on port `3000` (preventing duplicate servers).
   - Starts the server on **`http://localhost:3000`** and opens your default browser automatically.
   - Displays your **Same-WiFi URL** (e.g. `http://192.168.x.x:3000`) so phones and tablets connected to the same Wi-Fi router can open it while your laptop is on.

---

## 2. Backing Up & Restoring Your Data

Your contacts, groups, campaigns, consent records, and logs are stored in `prisma/dev.db`.

- **Create a Backup:** Double-click **`backup-data.bat`** (or run `.\backup-data.bat` in PowerShell).
  - Creates a timestamped copy in `backups/remindflow-backup-YYYYMMDD-HHMMSS.db` and updates `backups/remindflow-latest.db`.
- **Restore from Backup:** Double-click **`restore-data.bat`** (or run `powershell -ExecutionPolicy Bypass -File .\scripts\backup-restore.ps1 -Action restore -BackupFile <filename>`).
  - Before restoring, it automatically saves a `pre-restore-safety-*.db` snapshot of your current database so no data can ever be lost accidentally.

---

## 3. Deploying a Permanent 24/7 Public Website (Accessible When Laptop Is Off)

### Important Architecture Note on Database Persistence & Background Jobs
RemindFlow AI uses:
1. **Prisma + SQLite** (`DATABASE_URL`) for storing contacts, groups, campaigns, and logs.
2. **Next.js API Routes + Background Scheduler** (`/api/scheduler/tick` and `scripts/worker.mjs`) for processing due scheduled reminders.

Because serverless platforms like Vercel wipe local files on every deployment and sleep between requests, **do not use ephemeral serverless storage for SQLite**. Instead, use one of the two production setups below:

### Option A (Recommended & Easiest): Railway.app or Render.com with Persistent Volume (`Dockerfile` included)
Both **Railway** and **Render** run the included [`Dockerfile`](./Dockerfile) and [`scripts/docker-entrypoint.sh`](./scripts/docker-entrypoint.sh), which runs both the Next.js production server and the background scheduler worker continuously and mounts a persistent disk at `/data`.

#### Step-by-Step Deployment on Railway or Render:
1. **Push your project to a private GitHub repository** (the included `.gitignore` automatically excludes `.env` and local `.db` files so your secrets and local data are never exposed).
2. **Log in to [Railway.app](https://railway.app/) or [Render.com](https://render.com/)** and click **New Project → Deploy from GitHub repo**.
3. **Attach a Persistent Volume / Disk:**
   - Mount path: `/data`
4. **Configure Environment Variables in the Hosting Dashboard:**
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `file:/data/remindflow.db`
   - `WORKSPACE_ACCESS_PASSCODE` = *(choose a strong passcode, e.g. `MyTeamSecret2026!`)*
   - `CRON_SECRET` = *(choose any random secret string)*
   - `APP_URL` = *(your public HTTPS URL, e.g. `https://remindflow-ai.up.railway.app`)*
5. **Deploy & Verify:**
   - The host will build the `Dockerfile` and verify readiness via `/api/health`.
   - Open your public HTTPS URL:
     - Visitors see the public **RemindFlow AI Landing Page** at `/`.
     - Clicking **Launch RemindFlow AI** (`/dashboard`) prompts for your `WORKSPACE_ACCESS_PASSCODE` at `/login`, keeping your private contacts and campaigns protected on the public internet.

### Hosting Limitations & Cost Transparency
- **Free / Trial Tiers (Render Free / Fly.io / Railway Trial):**
  - **Render Free Web Services** spin down after 15 minutes of inactivity (taking ~30–50 seconds to wake up on the next visit) and **do not support persistent disks on the Free tier** (persistent disks require the Starter plan, ~\$7/month).
  - **Railway Trial** provides \$5 of free usage credit and supports persistent volumes, after which the Hobby plan is \$5/month.
- **Alternative 100% Free Persistent Database Option (Neon/Supabase Postgres):**
  - If you want a free cloud database without a paid persistent disk, create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com), change `provider = "postgresql"` in `prisma/schema.prisma`, and set `DATABASE_URL` to your Postgres connection string.
