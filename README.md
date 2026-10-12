# 🌊 RemindFlow AI

> **Professional AI-Powered Reminder & Messaging Campaign Management Platform**  
> Built for coaching centres, schools, clubs, and small businesses.  
> *Developed for Technothon 2026.*

---

## 🌟 Executive Summary

**RemindFlow AI** enables educators, club coordinators, and business managers to manage contacts and groups, describe reminder campaigns in normal natural language (English, Hindi, Marathi, etc.), automatically generate structured drafts with variable personalization, preview messages against real sample contacts, schedule campaigns persistently across restarts, enforce regulatory consent and opt-out suppression, and monitor verified delivery states.

---

## 🚀 Key Features

### 1. 📊 Real-Time Operations Dashboard
- Live statistical metrics computed directly from database queries (no fake numbers).
- Real-time pipeline counters: **Draft**, **Scheduled**, **Processing**, **Completed**, **Failed**, and **Cancelled**.
- Upcoming scheduled reminders with live countdown and one-click immediate dispatch.
- Audit trail logging recent actions with timestamps in Indian Standard Time (IST).

### 2. 🤖 AI Reminder Builder
- **Natural Language Parsing**: Accepts instructions like:  
  * *"Create a Hindi fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM."*  
  * *"Send an urgent physics doubt clinic announcement to Class 12 Physics for Friday 4 PM."*
- **Structured Extraction**: Extracts campaign name, target audience, language, requested date & time (24h), timezone (`Asia/Kolkata`), variables, and missing information warnings.
- **Editable Fields**: Users can adjust every field before scheduling.
- **No Hallucination**: Does not silently invent unmentioned audiences or dates; flags missing parameters.
- **Dual Engine**: Works with live **Google Gemini 1.5 Flash** or **OpenAI GPT-4o-mini**, with an intelligent **Built-in NLP Pattern Engine** fallback when API keys are not provided.

### 3. 📝 Message Template Editor & Live Preview
- Supports dynamic variables: `{{name}}`, `{{fee_amount}}`, `{{due_date}}`, `{{meeting_time}}`, `{{group}}`, `{{phone}}`.
- Real-time syntax validation (detects mismatched braces and excessive character counts).
- **Interactive WhatsApp Chat Bubble**: Select any real contact from the database to preview exactly how the personalized message renders.

### 4. 👥 Contacts & Groups Directory
- Full CRUD for contacts with **E.164 phone normalization** (automatically handles Indian 10-digit, `+91`, and international numbers).
- **CSV Importer with Column Mapping**:
  * Auto-detects headers or lets the user map columns.
  * In-file duplicate phone detection.
  * **Partial import handling**: Imports all valid rows without dropping the batch due to a few bad rows.
  * Displays import summary with line-by-line validation errors.
- **Audience Groups**: Create batches with custom color tags and view member counts.

### 5. 🛡️ Consent & Privacy Center
- Non-negotiable consent tracking: `GRANTED`, `PENDING`, `REVOKED`.
- **Global Suppression List**: Automatically suppresses numbers that texted "STOP", "UNSUBSCRIBE", or were manually blocked.
- **Pre-Dispatch Safety Check**: Every contact is re-checked against the suppression list immediately before sending. Suppressed contacts are logged with `OPTED_OUT_SKIPPED` and never sent messages.
- Full immutable consent audit trail.

### 6. ⏱️ Persistent Scheduler & Background Worker
- Scheduled campaigns and jobs survive server restarts.
- Concurrency locking (`lockedAt`) to prevent double-processing or race conditions.
- Exponential backoff retry handler (1m, 2m, 4m) for transient network errors.
- Periodic scheduler runner (`/api/scheduler/tick`) and standalone background worker (`npm run worker`).

### 7. 📱 Official Meta WhatsApp Cloud API Adapter
- Server-side integration targeting Meta Graph API v20.0.
- **Visibly Labeled Simulation Mode**: When credentials are not configured, messages are processed in Simulation Mode (`sim_wamid_...`), clearly marked so no false delivery claims are made.
- Authorization tokens and secrets are strictly redacted from logs.
- Webhook endpoints for handshake challenge verification and delivery status callbacks (`sent`, `delivered`, `read`, `failed`).

### 8. 📈 Reports & Carrier Message Logs
- Searchable message logs filterable by delivery status.
- JSON Payload Inspector to review provider responses and delivery timestamps.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) & React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (Commercial SaaS Navy, Light Slate, and Teal palette)
- **Database**: SQLite via Prisma ORM (persistent file-based database `dev.db`, zero-config; ready for PostgreSQL)
- **Icons**: Lucide React
- **Testing**: Vitest (automated test suite)
- **AI Runtimes**: Google Gemini / OpenAI / Built-in Regex & NLP Engine

---

## 📋 Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on Node v20.18.0)
- npm v10+

### 1. Installation
```bash
# Clone or navigate to the repository
cd RemindFlowAI

# Install all dependencies
npm install
```

### 2. Environment Setup
Copy the template configuration file:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

### 3. Initialize Database & Seed Demo Data
```bash
# Push schema to SQLite database (dev.db)
npm run db:push

# Seed realistic demo data (Apex Coaching & Academy)
npm run db:seed
```

### 4. Run Automated Tests
```bash
npm run test
```

### 5. Start the Application
```bash
npm run dev
```

Open your browser at:  
👉 **http://localhost:3000**

---

## 🧪 Automated Test Suite

Run tests at any time using:
```bash
npm run test
```

The test suite covers:
1. `tests/phone.test.ts` — E.164 normalization, international prefixes, 10-digit Indian formats, invalid number rejection.
2. `tests/template.test.ts` — Variable extraction (`{{name}}`), mismatched braces validation, personalized interpolation.
3. `tests/csv.test.ts` — RFC 4180 parsing, column auto-detection, in-file duplicate detection, partial row validation without dropping valid data.
4. `tests/ai-parser.test.ts` — Multilingual prompt extraction (Hindi fee reminders, English PTM notices), audience matching, date/time/timezone parsing, missing info warnings.
5. `tests/whatsapp-adapter.test.ts` — Meta Cloud API adapter simulation mode, secret token masking in logs, webhook challenge verification, incoming delivery status parsing.
6. `tests/campaign-consent.test.ts` — Regulatory consent enforcement, duplicate campaign hash calculation, retry backoff calculation.

---

## 🔑 AI & WhatsApp Configuration Guide

### Live Google Gemini AI (Optional)
To enable live Gemini parsing instead of the Built-in Demo Engine:
1. Get an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add to `.env`:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```

### Official Meta WhatsApp Cloud API (Optional)
To connect live WhatsApp messaging instead of Simulation Mode:
1. Create a Business App on [Meta for Developers](https://developers.facebook.com/).
2. Add WhatsApp product and generate a System User Access Token.
3. Add the credentials to `.env`:
   ```env
   WHATSAPP_API_TOKEN="EAAB..."
   WHATSAPP_PHONE_NUMBER_ID="1083..."
   WHATSAPP_BUSINESS_ACCOUNT_ID="1042..."
   WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_custom_secret"
   ```
4. Verify connection status in **Settings → Test Connection**.

---

## 📑 Feature Status Checklist

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Real Database Statistics** | ✅ Working | Direct queries from SQLite / PostgreSQL |
| **Contacts Management (CRUD)** | ✅ Working | Normalized E.164 format |
| **CSV Import & Partial Validation** | ✅ Working | Imports valid rows, reports bad rows |
| **Audience Groups & Batches** | ✅ Working | Color-coded badges, member counts |
| **Consent Tracking & Audit Trail** | ✅ Working | Full audit logs for all consent updates |
| **Opt-Out Suppression List** | ✅ Working | Automatically skips suppressed numbers |
| **AI Reminder Builder (Natural Language)** | ✅ Working | Live Gemini / OpenAI / Built-in NLP fallback |
| **Message Personalization (`{{name}}`)** | ✅ Working | Dynamic interpolation with missing var warnings |
| **Live WhatsApp Bubble Preview** | ✅ Working | Previews with sample contacts from DB |
| **Persistent Scheduler & Job Queue** | ✅ Working | Survives restarts with idempotency lock |
| **Duplicate Campaign Detection** | ✅ Working | Prevents accidental double sends |
| **Official Meta WhatsApp Cloud API** | ✅ Ready / Simulated | Live API adapter + labeled Simulation Mode |
| **Webhook Delivery Verification** | ✅ Working | Handles verification & status callbacks |
| **Delivery Reports & Message Logs** | ✅ Working | Searchable carrier event logs |
| **Automated Unit & Integration Tests** | ✅ Working | Vitest test suite (6 suites, 28 tests) |

---

## 🏆 Technothon 2026 Demonstration Steps

1. **Dashboard**: Show real-time KPI metrics and campaign status pipeline.
2. **AI Reminder Builder**:
   - Type: *"Create a Hindi fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM."*
   - Click **Generate Reminder with AI**.
   - Show extracted fields (Hindi language, Class 10 group, 10:00 AM IST schedule).
   - Test variable pill additions and inspect the live WhatsApp preview bubble.
   - Click **Send Immediately (Run Now)**.
3. **Campaign Details**:
   - Inspect the dispatched campaign: see how consenting contacts were delivered while **Pooja Reddy** was safely skipped with status **OPTED_OUT_SKIPPED** due to active suppression.
4. **Contacts & CSV Import**:
   - Click **Import CSV** → **Load Sample Data** → **Validate CSV**.
   - Notice row #4 has an invalid phone: RemindFlow validates and imports the 4 valid rows while displaying the exact reason for skipping row #4!
5. **Consent & Privacy Center**:
   - Add a phone number to the suppression list and observe real-time audit logging.
