# RemindFlow AI — Strictly \$0/Month Cloud Deployment Guide

This guide explains how to deploy **RemindFlow AI** to a permanent public `https://` URL that stays online 24/7 even when your laptop is turned off, at **\$0/month** with **no credit card required**.

---

## 1. Free-Tier Cloud Stack (\$0/Month, No Credit Card Required)

| Component | Free Service | Free-Tier Limits & Behavior | Cost |
| :--- | :--- | :--- | :--- |
| **Web & API Hosting** | **Vercel (Hobby Free Tier)** *(Recommended)* or **Render (`plan: free`)** | Automatic `https://` URL, 100 GB bandwidth/mo, 60s serverless max duration. Vercel does not sleep on web requests; Render Free spins down after 15 mins idle and wakes in ~30–50s. | **\$0/month** (No card) |
| **Cloud Database** | **Neon Serverless PostgreSQL (Free Tier)** | 0.5 GB persistent storage, 190 compute hours/month, auto-suspends compute after 5 mins idle and wakes in ~300ms on query. Data persists permanently across deploys. | **\$0/month** (No card) |
| **Cloud Reminder Scheduler** | **GitHub Actions (`.github/workflows/remindflow-scheduler.yml`)** + **cron-job.org (Free)** | GitHub Actions runs every 5 minutes (`*/5 * * * *`); `cron-job.org` can ping `/api/scheduler/tick` every 1 minute for exact-minute precision and keeps free-tier instances awake. | **\$0/month** (No card) |
| **WhatsApp Dispatch** | **Built-in Safe Simulation Mode** | Simulates message delivery with real database snapshots and logs. Zero external messaging charges. | **\$0/month** |

---

## 2. Step-by-Step Deployment Instructions (No CLI Required)

Because `git`, `vercel`, and cloud CLIs are not currently installed or signed in on this laptop, follow these simple browser steps to publish your live cloud URL:

### Step 1 — Create Your Free Cloud PostgreSQL Database (Neon.tech)
1. Go to [https://neon.tech](https://neon.tech) and sign up with your GitHub or Google account (**no credit card required**).
2. Create a new project named `remindflow-ai` (Region: **AWS Asia Pacific (Mumbai)** or Singapore for lowest latency in India).
3. Copy the **Connection String** (`postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require`).

### Step 2 — Migrate Your Existing Local SQLite Reminders & Contacts to Neon
Your local SQLite database (`prisma/dev.db`) has already been backed up and exported to `backups/remindflow-data-export.json`. To push your schema and migrate all existing contacts, groups, reminders, and settings into your new Neon database without touching `prisma/dev.db`, run this in PowerShell in your project folder:
```powershell
$env:DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING?sslmode=require"
npm.cmd run db:migrate-to-cloud
Remove-Item Env:\DATABASE_URL
```

### Step 3 — Push Your Project to GitHub & Deploy on Vercel (\$0/Month)
1. Upload/push this project folder to a **private GitHub repository** (note: `.env`, `prisma/*.db`, and `backups/*.json` are protected by `.gitignore` so secrets and private data are never exposed).
2. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub (**Hobby Free plan — \$0/month, no credit card**).
3. Click **Add New... -> Project** and import your `RemindFlowAI` repository.
   - Vercel automatically reads `vercel.json` and runs `npm run build:cloud` (which selects `prisma/schema.postgres.prisma` automatically when `DATABASE_URL` starts with `postgresql://`).
4. Under **Environment Variables**, add:
   - `DATABASE_URL` = Your Neon PostgreSQL connection string (`postgresql://...?sslmode=require`)
   - `WORKSPACE_ACCESS_PASSCODE` = Choose a strong passcode (protects `/dashboard`, `/contacts`, `/campaigns`, and APIs while keeping `/` public)
   - `CRON_SECRET` = Choose a long random secret string (e.g. `rf_cron_9f8a7b6c5d4e3f2a1b`)
   - `NEXT_PUBLIC_APP_NAME` = `RemindFlow AI`
5. Click **Deploy**. Within ~90 seconds you will receive your permanent public HTTPS URL (e.g. `https://remindflow-ai.vercel.app`).

### Step 4 — Enable 24/7 Cloud Reminder Scheduling
- **Option A (Automatic via GitHub Actions — every 5 minutes):**
  In your GitHub repository, go to **Settings -> Secrets and variables -> Actions** and add:
  - `APP_URL` = Your deployed HTTPS URL (e.g. `https://remindflow-ai.vercel.app`)
  - `CRON_SECRET` = The exact same `CRON_SECRET` you set in Vercel
- **Option B (1-Minute Precision via cron-job.org — \$0/month):**
  1. Create a free account at [https://cron-job.org](https://cron-job.org).
  2. Create a Cronjob pointing to `https://YOUR-APP.vercel.app/api/scheduler/tick` every **1 minute**.
  3. Under **Advanced -> Headers**, add `Authorization: Bearer YOUR_CRON_SECRET`.

---

## 3. How to Back Up and Restore Data Safely

- **Create a Local SQLite File Backup:**
  Double-click `backup-data.bat` or run:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/backup-restore.ps1 -Action backup
  ```
- **Restore Local SQLite from Backup:**
  Double-click `restore-data.bat` or run:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/backup-restore.ps1 -Action restore
  ```
- **Export All Tables to Portable JSON (Works for SQLite & Cloud Postgres):**
  ```powershell
  npm.cmd run db:export-json
  ```
- **Import Portable JSON into Local or Cloud Database (Non-Destructive Upsert):**
  ```powershell
  npm.cmd run db:import-json
  ```
