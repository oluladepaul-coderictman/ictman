# CBT Platform — Multi-Tenant Computer Based Testing

## Overview

Full-stack multi-tenant CBT (Computer Based Testing) platform supporting four roles (SuperAdmin, CompanyAdmin, Staff, Candidate), AI-powered question generation via local phi3-mini GGUF model (Paulina), department/course hierarchy, dynamic exam links, printable broadsheets, company type selection, SuperAdmin impersonation, strict result gating (candidates never see scores until admin releases them), live exam monitoring, and Paulina AI assistant with file read/write access.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 / pnpm 10
- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui (`artifacts/cbt-platform`)
- **API**: Express 5 + TypeScript (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod v4 + drizzle-zod
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **Auth**: JWT (role-based), stored in `localStorage("cbt_token")`
- **AI**: Local phi3-mini GGUF — NO external API. Model at `/models/phi3-mini.gguf` (loaded once at server startup via `loadModelOnce()`)
- **Offline/PWA**: vite-plugin-pwa + Workbox service worker
- **Mobile APK**: Capacitor (Android) — see `artifacts/cbt-platform/capacitor.config.ts`

## User Roles & Login

### SuperAdmin
- Login: `super@admin.com` + `SUPERADMIN_PASSWORD` env var
- Manages all companies (2-step type-selector modal)
- Can impersonate any company (view as CompanyAdmin)
- Has access to Paulina AI assistant at `/super-admin/paulina`

### CompanyAdmin
- Full management: Departments, Courses, Exams, Users, Candidates, Results, Broadsheet
- AI "Set Questions" per course (one-click: picks count + difficulty → Paulina generates + saves exam)
- Generates department/course exam links for external sharing
- **Publishes results** (select all or individual checkboxes)

### Staff
- Takes timed exams, views personal results with full result slip

### Candidate
- Logs in at `/login/candidate` (username + password)
- Views assigned exams via My Exams
- After submitting: **sees only "Exam Submitted! Wait for your results."** — zero score data
- "My Results" page shows ONLY results explicitly released (published) by admin

## STRICT Candidate Result Policy

**Candidates MUST NEVER see scores or grades until admin releases them.**

- `POST /api/exams/:id/submit` → returns `{submitted: true, message: "..."}` for candidates only
- `GET /api/results/my` → filters to `isPublished: true` only (DB-enforced)
- Frontend `exam-taking.tsx`: `result.submitted === true` branch shows confirmation screen, NOT the result slip

## Company Types
- **Educational Institution** — universities, polytechnics (departments, courses, semesters)
- **Corporate / Interview CBT** — recruitment, HR assessment, certification
- **Utilities / Government** — compliance and regulatory exams

## Dynamic Exam Links
- **Department portal**: `/org/:companySlug/:deptSlug` — all courses + active exams
- **Course exam**: `/org/:companySlug/:deptSlug/:courseCode` — specific course exam + candidate login

## AI — Paulina (phi3-mini Local Model)

- Model: `/home/runner/workspace/models/phi3-mini.gguf` (2.3GB, not in git)
- Singleton in `artifacts/api-server/src/lib/paulina-model.ts`
- Loaded **once at server startup** (non-blocking) via `loadModelOnce()` in `index.ts`
- Exports: `loadModelOnce()`, `getModelStatus()`, `runInference(systemPrompt, userPrompt, maxTokens)`, `extractJson(text)`
- **No OpenAI. No external API.** `openai` package removed.
- Routes: `artifacts/api-server/src/routes/ai.ts` (question generation), `paulina.ts` (chat + file tools)

## Admin Results — Publish Gate

- `POST /api/results/publish` — body: `{resultIds: []}` OR `{examId: N}` (release all for exam)
- `POST /api/results/unpublish` — same body shape
- Frontend: `admin/results.tsx` — grouped by exam, checkboxes on every row + group header, select all, bulk release/hide, per-row release/hide

## Live Monitor

- `GET /api/monitor` — returns active exam sessions (admin/company-admin only)
- `artifacts/cbt-platform/src/pages/admin/monitor.tsx` — auto-refreshes every 10s

## Key Files

| File | Purpose |
|---|---|
| `artifacts/api-server/src/lib/paulina-model.ts` | Paulina singleton (load once, runInference) |
| `artifacts/api-server/src/index.ts` | Server entry; triggers loadModelOnce() at startup |
| `artifacts/api-server/src/routes/ai.ts` | AI question generation (local phi3-mini, no OpenAI) |
| `artifacts/api-server/src/routes/paulina.ts` | Paulina chat + file tools (SuperAdmin only) |
| `artifacts/api-server/src/routes/exams.ts` | Submit endpoint: candidates get `{submitted:true}` only |
| `artifacts/api-server/src/routes/results.ts` | publish/unpublish; candidate filter: isPublished=true only |
| `artifacts/api-server/src/routes/monitor.ts` | Live session monitor endpoint |
| `artifacts/cbt-platform/src/lib/api-client.ts` | Direct fetch wrapper (reads JWT + impersonate headers) |
| `artifacts/cbt-platform/src/pages/staff/exam-taking.tsx` | Candidate sees ONLY submission confirmation |
| `artifacts/cbt-platform/src/pages/candidate/results.tsx` | Shows only published results with print support |
| `artifacts/cbt-platform/src/pages/admin/results.tsx` | Publish/unpublish with checkboxes, select all |
| `lib/db/src/schema/results.ts` | examSessionsTable, isPublished, publishedAt |

## Deployment

### Firebase Hosting (Frontend PWA)
- Config: `firebase.json`, `.firebaserc` (update project ID)
- Build: `cd artifacts/cbt-platform && BASE_PATH=/ PORT=3000 pnpm build`
- Deploy: `firebase deploy`

### GitHub Actions
- CI/CD workflow: `.github/workflows/deploy.yml`
- Secrets needed: `FIREBASE_SERVICE_ACCOUNT`

### Android APK (Capacitor)
- Config: `artifacts/cbt-platform/capacitor.config.ts`
- Commands: `pnpm cap:sync` → `pnpm cap:open:android` → build APK in Android Studio
- Offline: service worker caches assets + API responses; set `androidScheme: "https"` in config

### AI Model for Production
- Model file is gitignored (`.gguf` too large for GitHub)
- For deployment: embed model in Docker image OR download from GCS bucket on startup

## DB Schema Notes
- `examSessionsTable` — tracks active exam sessions (start, progress, lastActiveAt)
- `resultsTable` — `isPublished` (bool), `publishedAt` (timestamp) columns added
- Run `pnpm --filter @workspace/db run push` to sync schema
