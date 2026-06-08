# Audit Firm Compliance & Engagement Management System

A production-ready **Progressive Web App** for audit firms to manage clients,
statutory compliance, audit engagements, document requests, staff allocation and
client communication — installable on phones and **fully usable offline**.

Built to run entirely on **free tiers**: GitHub + Supabase + Vercel.

---

## ✨ Features

- **Role-based access** — Partner (full control + Settings) and Employee (assigned work only), enforced by Postgres **Row Level Security**.
- **Clients** — full profiles: entity type, industry, tax (PAN/VAT), services, contacts, history.
- **Compliance Calendar** — monthly grid, **green/yellow/red** for completed/upcoming/overdue, click an item for full detail.
- **Audit Engagement Tracker** — 9-stage workflow (Not Started → … → Closed), lead employee, deadlines, delay reasons.
- **Assignment system** — multiple employees per work item, each with an individual status; the item is complete only when **all** finish.
- **Audit Checklists** — reusable templates per audit type, applied to an engagement with per-item status (Pending / Completed / Reviewed) and reviewer comments.
- **Document Request Tracker** — tracking only (no file storage): Requested / Received / Pending / Not Applicable.
- **Dashboards** — partner firm overview + employee "my work"; staff-allocation metrics (assigned / on-time / late / pending / overdue).
- **Communication Log** — per-client meeting/call/email history with decisions and next actions.
- **Reports** — Compliance, Audit Status, Employee Performance, Pending Work, Overdue, Client History — with Month/Employee/Client/Status filters and **Excel + PDF** export.
- **Notifications** — automatic reminders (30/15/7/1 days), overdue alerts, and **escalation to partners**; surfaced via the browser Notification API.
- **Offline-first** — view assigned work, update statuses and add notes offline; changes queue in **IndexedDB** and **auto-sync** on reconnect (Background Sync).
- **Installable PWA** — Add to Home Screen on Android Chrome and iPhone Safari.

## 🧱 Tech Stack

| Layer    | Choice                                                   |
| -------- | -------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router   |
| PWA      | `vite-plugin-pwa` + custom **Workbox** service worker    |
| Offline  | IndexedDB outbox + Background Sync                        |
| Backend  | Supabase — Auth, PostgreSQL, Realtime, Row Level Security |
| Hosting  | Vercel (free)                                            |

---

## 📂 Project Structure

```
src/
  components/   layout, ui primitives, client/compliance/audit/document forms
  contexts/     Auth, Data (shared realtime), Offline (sync state)
  hooks/        useTable (realtime + offline cache), useUsers, useNotifications
  lib/          supabase client, api (writes), offline (IndexedDB + sync),
                export (xls/pdf), notifications, selectors, utils
  pages/        Login, Dashboard, Clients, ClientDetail, ComplianceCalendar,
                Audits, AuditDetail, Documents, Reports, Employees, Settings,
                Notifications, Profile
  sw.ts         custom Workbox service worker
supabase/
  schema.sql    tables, enums, triggers, reminder generator, realtime
  policies.sql  Row Level Security
scripts/
  seed.mjs      sample data: 2 partners, 5 employees, 10 clients, + work
```

---

## 🚀 Deployment Guide

### 1. Create a Supabase project
1. Go to <https://supabase.com> → **New project** (free tier). Pick a strong DB password and a region near you.
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → used only by the seed script (never commit it).
3. (Recommended for instant employee onboarding) **Authentication → Providers → Email**: turn **off** "Confirm email" so partner-created employee logins work immediately.

### 2. Run the SQL migration
In the Supabase dashboard → **SQL Editor**, run, in order:
1. `supabase/schema.sql`
2. `supabase/policies.sql`

(Optional, for server-side daily reminders) enable **Database → Extensions → pg_cron**, then run the `cron.schedule(...)` snippet at the bottom of `schema.sql`. Without cron, partners trigger reminder generation automatically on login.

### 3. Connect & run React locally
```bash
cp .env.example .env          # then fill in your URL + anon key
npm install
npm run dev                   # http://localhost:5173
```

### 4. Load sample data (2 partners, 5 employees, 10 clients)
```bash
# bash / macOS / Linux
SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key>" \
npm run seed
```
```powershell
# Windows PowerShell
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
npm run seed
```
Sample logins (password for all: `AuditFirm@2026`):

| Role     | Email                       |
| -------- | --------------------------- |
| Partner  | `partner1@auditfirm.test`   |
| Partner  | `partner2@auditfirm.test`   |
| Employee | `employee1@auditfirm.test`  |
| …        | `employee2..5@auditfirm.test` |

### 5. Deploy on Vercel
1. Push this repo to GitHub.
2. <https://vercel.com> → **Add New → Project** → import the repo.
3. Framework preset: **Vite** (build `npm run build`, output `dist` — already in `vercel.json`).
4. Add **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. **Deploy**. (Add the Vercel domain under Supabase → Authentication → URL Configuration.)

### 6. Install as a mobile app
- **Android (Chrome):** open the site → menu **⋮** → **Add to Home screen** → **Install**.
- **iPhone (Safari):** open the site → **Share** → **Add to Home Screen**.

The app launches full-screen, works offline, and syncs changes automatically when back online.

---

## 🔐 Security model

- Supabase Auth (email/password); sessions remembered per device.
- **Row Level Security** on every table.
- **Partners** see and manage everything; **employees** see only records assigned to them and may update work status / notes (column-appropriate via the UI and RLS scoping).
- The `service_role` key is used **only** by `scripts/seed.mjs` and is never shipped to the browser.

---

## 🧪 Scripts

```bash
npm run dev         # local dev server
npm run build       # typecheck + production build
npm run preview     # preview the production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run seed        # load sample data (needs service role env vars)
```
