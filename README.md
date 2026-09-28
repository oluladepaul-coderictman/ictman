# CBT Platform

A full-stack multi-tenant Computer-Based Testing platform with AI-powered question generation.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI | phi3-mini GGUF (local, no external API) |
| Auth | JWT (role-based: SuperAdmin, CompanyAdmin, Staff, Candidate) |
| Offline | Progressive Web App (PWA) + Workbox |
| Mobile APK | Capacitor (Android) |

## Roles

- **SuperAdmin** — Full platform control, impersonation, Paulina AI assistant, global analytics
- **CompanyAdmin** — Manage departments, courses, staff, candidates, exams, publish results
- **Staff** — Create/grade exams, view result slips (with scores)
- **Candidate** — Take exams, see results ONLY after admin releases them

## Candidate Result Policy (Non-Negotiable)

Candidates **never** see scores, grades, or correct answers after submitting an exam.
They see only: _"Exam Submitted! Wait for your results."_
Results appear in their portal **only** when an admin explicitly releases (publishes) each result.

## Running Locally

```bash
# Install all dependencies
pnpm install

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (port auto-assigned)
pnpm --filter @workspace/cbt-platform run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Server port |

## Building for Production

```bash
# Build frontend (PWA)
cd artifacts/cbt-platform && BASE_PATH=/ PORT=3000 pnpm build

# Build API server
cd artifacts/api-server && pnpm build
```

## Firebase Deployment

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Update `.firebaserc` with your project ID
4. Deploy: `firebase deploy`

GitHub Actions auto-deploys on push to `main` when `FIREBASE_SERVICE_ACCOUNT` secret is set.

## Android APK (via Capacitor)

```bash
cd artifacts/cbt-platform

# 1. One-time: add Android platform
npx cap add android

# 2. Build web assets and sync to native
pnpm cap:sync

# 3. Open in Android Studio (to build APK/AAB)
pnpm cap:open:android

# OR build debug APK directly (requires Java + Android SDK)
pnpm cap:build:apk
# APK is at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Offline vs Online APK

- **Online APK**: Set `server.url` in `capacitor.config.ts` to your Firebase / Cloud Run URL
- **Offline APK**: Leave `server.url` empty — the service worker caches the app and recent API responses for offline use

## Paulina AI Assistant

Paulina is the SuperAdmin AI assistant powered by a local phi3-mini GGUF model (no external API).
Model file: `/models/phi3-mini.gguf` (not committed to git — too large for GitHub).

> **Important:** The model file must be present on the server at startup. It is loaded once and stays in memory.
> For deployment, host the GGUF file on Google Cloud Storage or include it in your Cloud Run container.

## Database Migrations

```bash
pnpm --filter @workspace/db run push   # Push schema changes to DB
```
