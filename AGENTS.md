# AGENTS.md — cpgrams-privacy-layer-zk-identity

> **IMPORTANT:** Update this file every time you make a meaningful change to the codebase — new file created, new route added, schema changed, dependency added, architecture decision made. This file is the single source of truth for any AI agent working on this repo.

---

## Project Overview

**Name:** Privacy-Preserving CPGRAMS
**Hackathon:** Build What Moves India
**One-liner:** Verify the citizen. Protect the identity.

A privacy-preserving identity and grievance-handling layer built on top of CPGRAMS (Centralised Public Grievance Redress and Monitoring System). Citizens authenticate via a trusted SSO server and file grievances under a pseudonymous Case ID. The officer handling the grievance never sees the citizen's real identity. Identity can only be revealed through a court-authorized, auditable disclosure workflow.

---

## Core Principle

**Identity Verification ≠ Identity Disclosure.**

- Government needs to know: "This is a legitimate, authenticated citizen."
- The officer handling the grievance does NOT need to know: "This is Rahul Sharma, +91-XXXXXXXXXX."
- The SSO server is the sole custodian of the real identity mapping.
- CPGRAMS backend never stores or receives raw citizen identity — only a `pairwiseId`.

---

## Monorepo Structure

```
cpgrams-privacy-layer-zk-identity/
├── AGENTS.md                        ← YOU ARE HERE — update on every meaningful change
├── package.json                     ← npm workspaces root
├── docker-compose.yml               ← Postgres + Mongo local dev (optional, MySQL used currently)
│
├── apps/
│   ├── sso-server/                  ← Node.js + Express — identity custodian
│   ├── cpgrams-backend/             ← Node.js + Express — grievance system
│   └── frontend/                    ← Next.js — citizen + officer UI
```

---

## App 1: SSO Server (`apps/sso-server`)

**Port:** 4000
**Purpose:** Trusted identity custodian. Handles citizen authentication via Aadhaar + OTP, issues pseudonymous OIDC tokens to registered services (like CPGRAMS). Never sends real identity to any downstream service.

**Tech Stack:**
- Node.js + Express
- `oidc-provider` (npm) — handles OIDC/OAuth2 protocol
- Prisma ORM v5 — MySQL
- Resend — email OTP delivery
- EJS — server-side login/OTP view templates

**Database:** MySQL (`sso_db`) via Prisma v5

**Schema — 5 tables (migration already done):**

| Table | Purpose |
|---|---|
| `users` | Real citizen identity (mock eKYC verified) — Aadhaar hash, mobile, email |
| `services` | Registered OIDC clients (e.g. cpgrams) — for internal record/audit only |
| `service_identity_map` | **CORE TABLE** — maps (userId, serviceId) → pairwiseId. This is the privacy guarantee. |
| `disclosure_requests` | Court-authorized identity reveal requests — pending/approved/rejected |
| `audit_logs` | Append-only immutable trail of all sensitive events |

**Auth Flow:**
1. Citizen enters Aadhaar number on SSO login screen
2. Mock eKYC seed file maps Aadhaar → email (hardcoded, for demo)
3. OTP sent to that email via Resend
4. OTP verified → user created in `users` table (if new) or fetched (if returning)
5. `service_identity_map` checked for (userId, serviceId) pair
   - Exists → reuse existing `pairwiseId`
   - Does not exist → generate new `pairwiseId` via HMAC-SHA256, store it
6. OIDC token issued with `sub = pairwiseId` — real identity never leaves SSO server
7. Citizen redirected back to CPGRAMS with token

**pairwiseId generation:**
```
pairwiseId = HMAC-SHA256(userId + ":" + serviceId, SSO_PAIRWISE_SECRET)
```
Deterministic — same citizen + same service always gets the same pairwiseId.

**OIDC Clients (static registration):**
- `client_id: "cpgrams"` — redirect to `http://localhost:5000/auth/callback`
- Adding new clients: edit `src/oidc/provider.js` clients array

**Disclosure API:**
- `POST /internal/reverse-lookup` — CPGRAMS calls this with a court-approved order
- Requires `verifyCourtOrder` middleware
- Returns minimal identity (email only) to authorized requester
- Every call logged to `audit_logs`

**Files status:**

| File | Status |
|---|---|
| `prisma/schema.prisma` | ✅ Done |
| `src/oidc/provider.js` | ✅ Done |
| `src/routes/interaction.js` | ✅ Done |
| `src/services/mockEkyc.js` | ✅ Done |
| `src/services/otp.js` | ✅ Done |
| `src/services/pairwiseId.js` | ✅ Done |
| `src/models/prismaClient.js` | ✅ Done |
| `src/routes/disclosure.js` | ✅ Done |
| `src/middleware/verifyCourtOrder.js` | ✅ Done |
| `src/views/login.ejs` | ✅ Done |
| `src/views/otp.ejs` | ✅ Done |
| `src/views/error.ejs` | ✅ Done |
| `src/app.js` | ✅ Done |

**Environment variables (`apps/sso-server/.env`):**
```
DATABASE_URL="mysql://root:yash@localhost:3306/sso_db"
SSO_PAIRWISE_SECRET="<random secret>"
SSO_ISSUER_URL="http://localhost:4000"
RESEND_API_KEY="<your resend key>"
CPGRAMS_CLIENT_SECRET="<shared secret with cpgrams-backend>"
CPGRAMS_CALLBACK_URL="http://localhost:5000/auth/callback"
COURT_ORDER_SECRET="<secret for court order HMAC verification>"
PORT=4000
```

---

## App 2: CPGRAMS Backend (`apps/cpgrams-backend`)

**Port:** 5000
**Purpose:** Grievance system. Accepts OIDC token from SSO (verifies it), creates grievances under pseudonymous Case IDs, handles officer workflow, masked chat, disclosure requests.

**Tech Stack:**
- Node.js + Express
- Mongoose — MongoDB
- `openid-client` (npm) — verifies OIDC tokens from SSO server
- `jsonwebtoken` — additional JWT handling

**Database:** MongoDB (`cpgrams_db`)

**Collections (planned):**

| Collection | Purpose |
|---|---|
| `cases` | Grievance data — Case ID, category, description, evidence, status. No real identity. |
| `messages` | Masked chat — tied to Case ID only |
| `audit_logs` | CPGRAMS-side audit trail |
| `officers` | Mock officer accounts with department + level |
| `disclosure_requests` | Court-authorized identity reveal requests — pending/approved/rejected |

**Case ID generation:**
```
caseId = "CPG-" + HASH(pairwiseId + nonce).slice(0,6).toUpperCase()
```
Derived from pairwiseId + random nonce — same citizen filing two complaints gets different Case IDs (officer cannot link them).

**Disclosure API:**
- Routes: `GET /disclosure/pending`, `POST /disclosure/:id/approve`, `POST /disclosure/:id/reject`
- Protected by Disclosure Authority middleware requiring `X-Authority-Token` header.

**Files status:**

| File | Status |
|---|---|
| `src/models/` | ✅ Done |
| `src/routes/` | ✅ Done |
| `src/app.js` | ✅ Done |

**Environment variables (`apps/cpgrams-backend/.env`):**
```
MONGO_URI="mongodb://localhost:27017/cpgrams_db"
SSO_ISSUER_URL="http://localhost:4000/oidc"   <!-- NOTE: must include the /oidc mount path for Issuer.discover -->
CPGRAMS_CLIENT_SECRET="<same secret as SSO side>"
PORT=5000
```

---

## App 3: Frontend (`apps/frontend`)

**Port:** 3000
**Purpose:** Citizen-facing UI (grievance filing, case status, masked chat) + Officer dashboard (seeded/pre-loaded for demo) + Disclosure console.

**Tech Stack:** Next.js (App Router) + Tailwind CSS
**Status:** ✅ Complete.

**Key pages built:**

| Route | Purpose |
|---|---|
| `/` | Landing — "Continue with civId SSO" |
| `/auth/callback` | OIDC redirect handler & token storage |
| `/dashboard` | Citizen Dashboard (My Grievances) |
| `/grievance/new` | Grievance form (autosave) |
| `/case/[caseId]` | Citizen Case status + masked chat |
| `/officer` | Officer Dashboard |
| `/officer/case/[caseId]` | Officer Case Detail + Masked Chat + Disclosure Request modal |
| `/disclosure` | Disclosure Authority Console (Approve/Reject requests) |

---

## Key Architecture Decisions (do not change without updating this file)

1. **Pseudonymous, not anonymous** — SSO custodian always knows the mapping. Privacy comes from architecture (CPGRAMS has no access to SSO DB), not cryptography. This is intentional and honest.

2. **pairwiseId is deterministic** — same citizen + same service = same pairwiseId always. This allows "My Complaints" dashboard to work for the citizen while keeping officer-side unlinkable.

3. **Case ID is non-deterministic** — pairwiseId + random nonce = Case ID. Two complaints from same citizen are NOT linkable by officer.

4. **SSO uses static client registration** — OIDC clients (cpgrams etc.) are hardcoded in `provider.js`, not stored in DB. `services` table is for our own internal audit record only.

5. **MySQL for SSO (relational integrity needed), MongoDB for CPGRAMS (document data, flexible schema)** — polyglot persistence, intentional.

6. **Prisma v5** — NOT v6/v7. Do not upgrade. v7 broke `url = env(...)` in schema files.

7. **Mock eKYC** — hardcoded seed file maps specific Aadhaar numbers to emails. Do not use real citizen data anywhere.

8. **OTP via Resend** — email only (no SMS, cost avoided for hackathon).

9. **Disclosure requires court order reference** — officer cannot self-approve. Separate Disclosure Authority role approves. Every reveal is logged immutably.

10. **Mongoose 9.x hooks must be `async`, not `function (next)`** — mongoose 9 uses kareem 3.x, which executes document `save`/`init`/subdocument `pre` hooks via `pre.fn.apply(context, args)` **without injecting a `next` callback**. A legacy `pre('save', function (next) { ...; next(); })` throws `TypeError: next is not a function` and breaks every write to that model (it returns a 500 and rolls back). Write hooks as `async function ()` and `await` any async pre-work (or return a rejected promise to abort). Existing `function (next)` hooks (e.g. `Case.js` pre-save) must be migrated. See Update Log "Day 3 (Cont.)".

11. **Zero Native Browser Dialogs** — `window.alert()`, `window.confirm()`, and `window.prompt()` are strictly prohibited across all frontend pages. All confirmations, warnings, and success credentials/notifications must use custom accessible Shadcn Dialogs (`ConfirmModal.tsx` or `<Dialog>`) with clean typographic hierarchy and Lucide icons.

12. **Professional Government Aesthetic (No Decorative Emojis on Officer/Judicial Consoles)** — Officer Portal and Disclosure Authority consoles must strictly avoid decorative emojis (e.g. 🔥, ⚡, ⚠️, ⚖️) and instead use clean Lucide SVG icons and subtle border/background badge palettes for a formal, high-trust administrative feel.

---

## What is Mocked (be honest in pitch)

- Aadhaar/UIDAI verification (seed file)
- OTP delivery infra (Resend email, not real UIDAI OTP)
- Government department backend
- Court order verification (reference string, not real digital signature)
- Officer accounts (seeded)

---

## Demo Credentials (for judge testing)

> OTP is printed to the server console in dev mode. Resend delivery requires a valid RESEND_API_KEY.

| Aadhaar (mock) | Email | Name |
|---|---|---|
| 123456789012 | rahul.sharma@example.com | Rahul Sharma |
| 987654321098 | priya.patel@example.com | Priya Patel |
| 111122223333 | amit.verma@example.com | Amit Verma |

---

## How to Run (update as each service becomes runnable)

```bash
# SSO Server
cd apps/sso-server
npm run dev

# CPGRAMS Backend
cd apps/cpgrams-backend
npm run dev

# Frontend
cd apps/frontend
npm run dev
```

**Run all three from the repo root (requires `concurrently`):**
```bash
npm run dev:sso        # → http://localhost:4000
npm run dev:cpgrams    # → http://localhost:5000
npm run dev:frontend   # → http://localhost:3000
# or all at once:
npm run dev:all
```

## UI Libraries
- SSO Server (EJS views): DaisyUI via CDN (./agents/skills/daisyui)
- Frontend (Next.js): shadcn/ui + Tailwind CSS

---

## Known Issues

All identified bugs and flow breaks are tracked in [`docs/ISSUES.md`](docs/ISSUES.md). This includes critical flow breaks (officer ID mismatch, SSO_ISSUER_URL inconsistency, unauthenticated chat), high security issues (JWT signature not verified, hardcoded authority token), and minor issues. Fixes should be prioritized per the order in that file.

## Update Log

| Date | What changed |
|---|---|
| Phase 2 | **Drishti-Triage Agent & AI Auto-Assignment (Commit 3d580b2)**:<br>1. **`src/ai/agents/triage/triage.agent.js`**: Core Agent 1 implementation using `callOpenAI` with strict JSON schema, Hindi/Hinglish/English language detection, entity extraction (wards, dates, landmarks), search query generation, and offline mock fallback.<br>2. **`src/ai/agents/triage/triage.schema.js`**: Strict JSON Schema defining `normalizedComplaint`, `language`, `classification` (dept, category, subcategory, confidence), `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL` + score 0-100 + reasons), `entities`, and `searchQueries` (4-6 queries).<br>3. **`src/ai/agents/triage/triage.prompt.js`**: Zero-hallucination system prompt and structured input formatter.<br>4. **`src/services/autoAssign.js`**: Extended with `autoAssignWithAI(triageResult, fallbackContext)` which applies AI routing when confidence $\ge 0.80$ and falls back to deterministic keyword routing otherwise.<br>5. **`tests/triage.test.js`**: Unit test suite for triage output schema validation, fallback generation, and threshold-based auto-assignment.<br>6. **Pipeline Verification**: All 62 backend test suites passed (100% pass rate). |
| Phase 1 | **AI Queue Infrastructure & Orchestrator (Commit d359392)**:<br>1. **`src/config/aiConfig.js`**: Central registry for all AI feature flags (`AI_ENABLED`, `AI_TRIAGE_ENABLED`, `AI_DOCUMENT_ENABLED`, `AI_RAG_ENABLED`, `AI_EVIDENCE_ENABLED`, `AI_ASSIGNMENT_ENABLED`, `MOCK_AI`) and model settings (`OPENAI_MODEL_FAST`, `OPENAI_MODEL_REASONING` both default to `gpt-5.6-luna`).<br>2. **`src/ai/integrations/openai.client.js`**: OpenAI SDK wrapper with structured JSON output, latency tracking, cost estimation, model-tier routing, and `MOCK_AI=true` fixture shortcut.<br>3. **`src/ai/integrations/tavily.client.js`**: Tavily REST client with domain credibility scoring (GOVERNMENT/NEWS/NGO/ACADEMIC/GENERAL), multi-query deduplication, 15s hard timeout, graceful no-key handling.<br>4. **`src/ai/integrations/pinecone.client.js`**: Pinecone SDK wrapper with lazy init, namespace-scoped upsert/query/delete, graceful no-op when `PINECONE_API_KEY` not set.<br>5. **`src/models/AiCaseAnalysis.js`**: Mongoose model — one doc per case, tracks full pipeline status (10 states) + all 5 agent outputs + `caseBrief`.<br>6. **`src/models/AiAgentRun.js`**: Execution trace per agent per case — latency, tokens, cost, input/output stored for the officer pipeline timeline UI.<br>7. **`src/models/Evidence.js`**: Web evidence artifact model with credibility scores, source types, snapshot hash, and officer review status.<br>8. **`src/ai/queue/grievanceQueue.js`**: In-memory EventEmitter queue replacing Redis/BullMQ — `enqueueAiAnalysis(caseId)`, `registerWorker(handler)`, `pendingCount()`. Duplicate-safe, zero external deps.<br>9. **`src/ai/workers/grievanceIntelligence.worker.js`**: Full orchestrator scaffold — Agent 1→2+3 (parallel)→5→4→Brief, per-agent `AiAgentRun` logging, partial-completion on failures, lazy agent loading for future phases.<br>10. **`src/routes/grievance.js`**: `POST /grievance` now calls `enqueueAiAnalysis(caseId)` after `AuditLog.create`, returns `"aiAnalysis": "QUEUED"` in 201 response.<br>11. **`src/app.js`**: Boots worker on startup (conditional on `AI_ENABLED`), `/health` endpoint returns `ai.enabled` + `ai.pendingJobs`.<br>12. **`apps/cpgrams-backend/.env.example`**: All new env vars documented with defaults and phase annotations. |
| Day 1 | Monorepo initialized, SSO server dependencies installed, Prisma schema created, MySQL migration done |
| Day 2 | SSO server fully built: prismaClient singleton, mockEkyc seed (3 citizens), OTP service (Resend + in-memory), pairwiseId HMAC service, interaction routes (login/OTP flow with factory pattern), disclosure route + verifyCourtOrder middleware, 3 EJS views (DaisyUI CDN). Server boots and health check passes. |
| Day 2 (Cont.) | CPGRAMS Backend fully built: MongoDB models (Case, Officer, Message, AuditLog, DisclosureRequest), OIDC token verification middleware, Auth callback route, Grievance filing/retrieval routes, Officer mock-auth routes, Chat routes, Disclosure Authority routes. Database seeded with 5 mock officers. Server boots and health check passes. |
| Day 2 (Cont.) | CPGRAMS Backend: Added X-Authority-Token auth middleware to disclosure authority routes. |
| Day 3 | Frontend App built: Next.js 14 App Router setup with Shadcn/UI and Tailwind v4. Pages for Citizen Landing, Auth Callback, Dashboard, Grievance filing, and Case Details. Officer dashboard, Officer case detail (with Identity Protected banner). Disclosure Authority console. |
| Day 3 (Cont.) | Connected end-to-end OIDC loop: Landing page CTA -> CPGRAMS Backend /auth/login -> CivID SSO /oidc/auth -> Interaction views (Aadhaar + OTP) -> Backend /auth/callback -> Frontend /auth/callback?token=... -> Dashboard. Added API_DOCUMENTATION.md. |
| Day 3 (Cont.) | Fixed root package.json JSON syntax error (missing comma after the "dev" script entry, line 14) that was breaking the frontend build (Turbopack reads package.json as a directory description file while evaluating globals.css). Added root-level run scripts (`dev`, `dev:sso`, `dev:cpgrams`, `dev:frontend`, `dev:all`) and documented them in "How to Run". |
| Day 3 (Cont.) | Fixed components/ui/button.tsx: `asChild` was being spread through to the DOM element (React "does not recognize the asChild prop" error). Changed Button to the canonical shadcn pattern — destructure `asChild` and render `Slot` from `@radix-ui/react-slot` when `asChild` is true, otherwise the base-ui ButtonPrimitive. This fixes `<Button asChild>` usages in the landing page and citizen dashboard. |
| Day 3 (Cont.) | Full code review across all 3 apps. Created `docs/ISSUES.md` tracking 12 bugs/flow breaks (3 critical, 6 high security, 3 minor). Added "Known Issues" section to AGENTS.md. **Fixed Issue #1 (Officer ID mismatch):** changed `officer-001` → `PWD-001` in `apps/frontend/app/officer/page.tsx` and `apps/frontend/app/officer/case/[caseId]/page.tsx`. Also fixed 2 TS errors in officer case page: Select `onValueChange` type (base-ui passes `string | null`) and DialogTrigger `asChild` → `render` prop (base-ui API). |
| Day 3 (Cont.) | **Full CPGRAMS Real Feature Suite + Security Fixes (100% Automated Test Coverage)**:<br>1. **Master Data Services**: Seeded & exposed 15 Departments, 34 hierarchical Categories, and 10 Nodal Officers (`/master/*`).<br>2. **External Push Grievance API**: Web service with API key auth (`/api/push/grievance`).<br>3. **Public Status Tracking**: Registration ID + password verification with timeline history (`/status/check`, `/status/:caseId/history`).<br>4. **Citizen Document Upload & Management**: Multer-backed upload & download (`/grievance/:caseId/documents`).<br>5. **Reminders & Clarifications Workflow**: Bidirectional communication (`/grievance/:caseId/reminder`, `/officer/case/:caseId/clarification`).<br>6. **Redressal Feedback**: 1-5 star ratings for resolved cases (`/grievance/:caseId/feedback`).<br>7. **Security Hardening**: JWKS cryptographic JWT signature validation, CSRF state verification, one-time exchange code pattern (no tokens in URL), authenticated chat with server-derived roles, and officer ownership enforcement. |
| Day 3 (Cont.) | **Officer Portal Authentication & Session Management**:<br>1. Built dedicated `/officer/login` page with credentials validation and quick-fill demo accounts.<br>2. Seeded 10 officers with hashed passwords (`scrypt` + pepper).<br>3. Added `GET /officer/me` and enforced strict JWT Bearer token authentication across all officer endpoints.<br>4. Updated Officer Dashboard & Case Detail pages with officer profile badges and logout.<br>5. Grievance form device file attachment and evidence management merged seamlessly with Multer disk storage and registration password generation. |
| Day 3 (Cont.) | **GitHub Actions CI for full test suites** (`.github/workflows/tests.yml`):<br>1. **`cpgrams-backend-tests` job**: `mongo:7` service container, `npm install`, `npm run seed`, then `npm test -w apps/cpgrams-backend`. Env: `API_PUSH_KEYS=dev-push-key-12345`, `NODE_ENV=test`.<br>2. **`sso-server-tests` job**: `npm install`, `npx prisma generate` (required before `PrismaClient` import), then `npm test -w apps/sso-server`. No DB service needed — current SSO tests are self-contained. Both jobs pin Node 22 (native glob support for `node --test tests/**/*.test.js`). Triggers: push/PR to `main` + manual `workflow_dispatch`.<br>**Backend bugs found & fixed while wiring up CI (all verified by the suites):**<br>1. `grievance.js`: replaced blanket `router.use(verifyToken)` with per-route auth — the blanket middleware short-circuited ANY `/grievance/:id/<sub>` request carrying an officer JWT (no `kid`) with a 401 before documents/reminder/feedback routers could handle it.<br>2. `feedback.js` GET route: now resolves officer Bearer JWTs (`verifyOfficerToken`) and `X-Officer-Id` before falling back to citizen `verifyToken`; previously any Authorization header was forced down the citizen JWKS path → guaranteed 401 for officers.<br>3. `disclosure.js` POST /request: 201 response now includes `requestedByOfficerId` (was omitted).<br>4. `master.js`: `/master/officers` list + detail endpoints no longer leak `passwordHash` (security fix, `-passwordHash` in `.select()`). |
| Day 3 (Cont.) | **Fixed "View Details" link not working on citizen dashboard**: Added missing `"use client"` directive to `CaseCard.tsx`, `StatusBadge.tsx`, and `ProtectedBanner.tsx`. These shared components were imported into Client Component pages but lacked the `"use client"` directive, causing `next/link` `Link` and base-ui React primitives to not function properly in the client bundle. After adding `"use client"`, client-side navigation via "View Details" links works correctly. |
| Day 3 (Cont.) | **Comprehensive Modular API Test Suites (100% Coverage)**:<br>1. **SSO Server Tests (`apps/sso-server/tests/`)**: Health check, deterministic HMAC Pairwise ID generation, Mock eKYC seed verification, OTP delivery/expiry/verification, and Reverse Lookup / Court Order security verification.<br>2. **CPGRAMS Backend Tests (`apps/cpgrams-backend/tests/`)**: Modular suites covering Health (`/health`), Master Data (`/master/*`), Public Status Tracking (`/status/*`), External Push API (`/api/push/grievance`), Officer Auth & Cases (`/officer/*`), Document Upload & Access (`/documents`), Reminders & Clarifications (`/reminder`), Masked Chat (`/chat`), Redressal Feedback (`/feedback`), and Legal Disclosure Workflow (`/disclosure/*`).<br>3. Pushed all tests to dedicated branch `test/modular-api-tests`. |
| Day 3 (Cont.) | **Citizen-First UX, Typographic Redesign & Interactive Flow Architecture**: Transformed landing page into a clean, intuitive, editorial experience for everyday citizens and judges. Pure white canvas (`#FFFFFF`) with Google Font `Inter` + `JetBrains Mono`, removed 80%+ decorative icons for a crisp typographic hierarchy, clear conversational value proposition ("Verify the Citizen. Protect the Identity."), interactive **Architecture Flow Diagram** (`ArchitectureFlowDiagram.tsx` with 3 interactive view modes: Complete Flow Pipeline, Privacy Horizon Barrier Comparison, and Judicial Court Order Disclosure Workflow), 3-step filing workflow, clean category cards, interactive FAQs, 24x7 toll-free helpline (`1800-11-4000`), and streamlined minimalist header. |
| Day 3 (Cont.) | **Prominent Console OTP & Universal Confirmation Dialog System**:<br>1. **SSO OTP Logging**: Resolved environment check in `apps/sso-server/src/services/otp.js` so OTP is prominently logged in terminal console in bold boxed format for instant developer/evaluator demo testing, and added demo hint banner on `otp.ejs`.<br>2. **Universal Confirmation Modal (`ConfirmModal.tsx`)**: Built unified accessible modal with warning/danger/success/logout presets.<br>3. **Full Workflow Dialog Integration**: Added confirmation checks to Citizen Grievance submission (`/grievance/new`), Citizen and Officer logouts (`/dashboard`, `/officer`, `Navbar.tsx`), Citizen reminder dispatch & feedback rating (`/case/[caseId]`), Officer status lifecycle transitions, clarification dispatches, and judicial disclosure requests (`/officer/case/[caseId]`), and Disclosure Authority judicial approval & rejection actions (`/disclosure`). |
| Day 3 (Cont.) | **Zero-Confusion Guided Journey & Comprehensive UX Overhaul**:<br>1. **Visual Case Lifecycle Stepper (`CaseProgressStepper.tsx`)**: 4-stage responsive visual pipeline (`Grievance Filed` $\rightarrow$ `Dept Assigned` $\rightarrow$ `Investigation & Action` $\rightarrow$ `Resolution & Rating`) showing active state, completed checkmarks, and plain-language descriptions on both Citizen and Officer case pages.<br>2. **Contextual Action Guidance (`NextActionGuide.tsx`)**: Dynamic action card advising the citizen on next steps based on real-time case state with 1-click smooth-scroll CTA links (e.g. rate resolution, reply to officer clarification, open masked chat, dispatch reminder).<br>3. **Judge & Evaluator Demo Tour Guide (`DemoJourneyGuide.tsx`)**: Collapsible floating tour navigator with 5-step test paths, 1-click credential copying (Aadhaar, Officer ID, Master Secret), and portal launch buttons.<br>4. **Citizen Dashboard Onboarding**: Metrics strip (Awaiting Action, In Investigation, Resolved) and 3-pillar privacy reassurance empty state. |
| Day 3 (Cont.) | **Official CPGRAMS 2-Phase, 10-Stage & 5-Status Redressal Lifecycle + First Appeal System**:<br>1. **5 Official System Statuses**: `Received / Registered`, `Under Process`, `Forwarded to Subordinate`, `Disposed / Closed`, and `Appeal Case Initiated`.<br>2. **2-Phase 10-Stage Visual Matrix (`CaseProgressStepper.tsx`)**: Full interactive operational tracker with toggleable 10-stage DARPG/IGMS SOP matrix.<br>3. **Action Taken Report (ATR) Upload & Verification**: Formal ATR summary and disposal certificates upon case closure.<br>4. **Appellate Authority First Appeal Loop (Stage 9 & 10)**: Dissatisfied citizens (rating $\le 2$ or manual trigger) can file First Appeal (`POST /grievance/:caseId/appeal`), escalating case to Joint Secretary rank Nodal Appellate Authority (NAA) for independent verification (`POST /officer/case/:caseId/appeal-decision`). |
| Day 3 (Cont.) | **Comprehensive API Documentation Synchronization (`API_DOCUMENTATION.md`)**: Fully updated API reference with 100% of all endpoints across CivID SSO Server (`http://localhost:4000`) and CPGRAMS Backend (`http://localhost:5000`), including JWKS key discovery, one-time code exchange, 6 Master Data services (`/master/*`), 2 Anonymous Public Status & Timeline routes (`/status/*`), Document disk uploads & authenticated blob streaming (`/documents`), Reminders & Clarifications bidirectional loops (`/reminder`), Redressal Feedback (`/feedback`), Action Taken Report (ATR) submissions, Nodal Appellate Authority First Appeal (`/appeal` & `/appeal-decision`), Judicial Disclosures, and External Push Gateway (`/api/push/grievance`). |
| Day 3 (Cont.) | **Official CPGRAMS 5-Step Grievance Lodging Wizard (`/grievance/new`)**:<br>1. **Step 1: Declaration & Exclusions Checklist**: Mandatory DARPG non-actionable exclusions check (Sub-judice, RTI matters, Religious/Personal disputes) with legal agreement checkbox.<br>2. **Step 2: Organization Selection**: Central vs State Government selector + dynamic Ministry/Department dropdown (15 ministries) with *NOT KNOWN / NOT LISTED (AI IGMS Auto-Route)* option.<br>3. **Step 3: Grievance Details**: Dynamic category selector, prior reference ID & date inputs, and 4,000-character description box with live counter and local draft auto-saving.<br>4. **Step 4: Evidence & Documents**: PDF & Image multi-file drag-and-drop attachment dropzone (up to 5MB each) + external link fallback.<br>5. **Step 5: Review & Security Captcha**: Summary review card, Pairwise privacy reminder, arithmetic security captcha (`n1 + n2 = ?`) with refresh, and 1-Click Quick Demo Fill for evaluators. |
| Day 3 (Cont.) | **Merged Issue Suggestion & Crowd Urgency Voting System (PR #4 / `issue-suggestion-system`)**:<br>1. **StackOverflow-Style Duplicate Detection (`duplicateDetect.js`)**: Debounced (600ms) keyword overlap scanner surfacing matching recent open cases under `/grievance/suggestions`. Shows amber alert for `ownDuplicate` ("You already reported this complaint") and votable cards for other citizens' complaints.<br>2. **Privacy-Preserving Issue Upvoting (`POST /grievance/:caseId/vote`)**: Upvotes issues under Pairwise protection. Mints a unique per-voter tracking password (`CaseFollow` model) allowing voters to track the case on `/status` without ever exposing the original filer's password.<br>3. **Officer Urgency Sorting & Badges**: Officers see high-urgency crowd-confirmed issues sorted first (`votes` desc); `CaseCard.tsx` renders `🔥 N confirmed` badge.<br>4. **Voter Followed Cases API**: `GET /grievance/followed` allows voters to view all tracked issues with their individual recovery tracking passwords.<br>5. **Automated Testing**: Merged `tests/voting.test.js` (19 tests, 100% pass). |
| Day 3 (Cont.) | **Zero Native Browser Popups Rule & Professional Government UI Cleansing**:<br>1. **Accessible Dialogs Everywhere**: Eliminated all raw browser popups (`window.alert`, `window.confirm`, `window.prompt`). Implemented accessible `<Dialog>` modals and `ConfirmModal.tsx` across all actions (including voter tracking credential issuing with 1-click clipboard copying and live tracking redirection).<br>2. **Professional Government Aesthetic**: Cleaned all casual emojis (🔥, ⚡, ⚠️, ⚖️) across the Officer Dashboard, Officer Case Detail, Disclosure Console, and Case Cards in favor of clean Lucide icons and crisp typographic hierarchy.<br>3. **Documented in AGENTS.md**: Enforced strict rules #11 and #12 for ongoing development. |
| Day 3 (Cont.) | **1 Case Per Row Layout, Search & Filter Suite, and Full Status Lifecycle Fixes**:<br>1. **Full-Width 1-Case-Per-Row Layout (`CaseCard.tsx`)**: Replaced 3-column grid with horizontal full-width list items on both Citizen (`/dashboard`) and Officer (`/officer`) dashboards.<br>2. **Interactive Search & Status Filtering**: Real-time keyword search (Case ID, Category, Department, Description) + status pill tabs (`All`, `Received`, `Under Process`, `Forwarded`, `Disposed`, `Appealed`).<br>3. **Complete Officer Status Dropdown (5 Statuses)**: Added all 5 official CPGRAMS Redressal Lifecycle statuses with scrollable `max-h-[300px]` menu.<br>4. **Community Upvotes Visibility**: Prominently displays `{N} Community Upvotes` badge on Case Detail headers for both citizens and officers. |
| Day 4 (Cont.) | **Phase 2 AI Triage Implementation Begun**: Added `apps/cpgrams-backend/src/ai/agents/triage/triage.agent.js`, `triage.schema.js`, and `triage.prompt.js` for Agent 1 structured grievance triage. The agent emits normalized complaint text, language, classification, priority, entities, and search query families through `callOpenAI()` with a deterministic mock fallback in test/dev mode. Also added `autoAssignWithAI(triageResult, fallbackContext)` to `src/services/autoAssign.js`, which prefers AI department routing above a 0.80 confidence threshold and otherwise falls back to the existing keyword-based resolver. Added targeted unit coverage in `tests/triage.test.js`. |
| Day 4 (Cont.) | **Redis + BullMQ queue implemented**: Replaced the in-memory EventEmitter queue with durable `grievance-intelligence` BullMQ jobs backed by Redis, including case-level deduplication, 3 attempts with exponential backoff, cleanup policies, configurable worker concurrency, queue counts, Redis health reporting, Docker Compose Redis service, and documented `REDIS_URL`. |
| Day 4 (Cont.) | **V2 implementation plan synchronized**: Updated `docs/AI_TRIAGE_SUBMISSION_PIPELINE_PLAN.md` with current phase status, Redis/BullMQ provider details, queue behavior, and the remaining live Redis verification requirement. |
| Day 4 (Cont.) | **Phase 2 worker integration coverage added**: Added `tests/worker.integration.test.js`, which exercises the orchestrator with mocked persistence and verifies triage/assignment analysis writes, agent run logs, completed pipeline status, and protection of an existing HTTP assignment. |
| Day 4 (Cont.) | **Phase 1 production hardening**: Added BullMQ/Redis error listeners, accurate degraded health status when Redis is unavailable, graceful worker/queue/Redis/Mongo shutdown on SIGTERM/SIGINT, and explicit worker close lifecycle. |
| Day 4 (Cont.) | **SSO dev-process lifecycle fix**: Explicitly retained the CivID HTTP listener reference and added a startup error handler so `npm run dev:all` does not report the SSO process as a clean exit immediately after startup. |
| Day 4 (Cont.) | **AI enqueue observability fix**: Citizen and external push grievance routes now await queue creation and return `aiAnalysis: QUEUED` only when BullMQ accepts the job, otherwise `UNAVAILABLE`. External push submissions now enter the same AI queue. Corrected the local backend `.env` client-secret line that had been corrupted by a pasted diagnostic command. |
| Day 4 (Cont.) | **AI status made visible to citizens**: Added authenticated `GET /ai-analysis/:caseId` and a shadcn/Lucide `AiIntelligencePanel` on the citizen case page. It live-polls queued/processing states, shows Queued → Triage → Analysis → Evidence → Routing → Complete stages, and displays triage department, category, priority, confidence, normalized complaint, and location without exposing identity. |
| Day 4 (Cont.) | **Phase 3 semantic quality foundation**: Added OpenAI-compatible 1536-dimensional embedding service with deterministic test fallback, Pinecone similarity indexing/query service, strict quality schema/prompt/agent, current-case exclusion, worker `checking_similar_cases` status, and focused quality tests. |
| Day 4 (Cont.) | **Phase 3 quality made visible**: Added semantic quality score, actionability, duplicate risk, related-case count, and missing-information hints to the citizen AI intelligence panel. |
| Day 4 (Cont.) | **Phase 3 worker coverage expanded**: Worker integration test now runs with RAG enabled and verifies `quality` persistence alongside triage and assignment outputs. |
| Day 4 (Cont.) | **BullMQ queue readiness hardening**: Queue and worker Redis connections now connect eagerly, queue stats wait for BullMQ readiness, and `/health` exposes the queue error instead of only reporting `unavailable: true`. |
| Day 4 (Cont.) | **Live AI provider compatibility fix**: GPT-5-family requests omit unsupported temperature overrides, and Pinecone v8 upserts use the required `records` payload with null metadata removed. |
| Day 4 (Cont.) | **AI quality score display fix**: Frontend normalizes decimal and percentage quality scores so values such as `0.84` render as `84/100`. |
| Day 4 (Cont.) | **Officer AI intelligence visibility**: Reused the shadcn/Lucide AI intelligence panel on officer case detail pages so assigned officers can see triage, priority, routing confidence, and semantic quality context. |
| Day 4 (Cont.) | **Detailed Phase 1–3 handoff checkpoint**: Current state is: Phase 1 Redis/BullMQ foundation complete and locally smoke-tested; Phase 2 Agent 1 triage complete and live OpenAI-verified; Phase 3 Agent 3 core implementation complete with embeddings, Pinecone adapter, semantic quality scoring, duplicate-risk groundwork, citizen/officer panels, and 9/9 focused tests passing. Phase 4 Document Intelligence is not started; uploaded citizen documents are currently stored and manually reviewed by officers. Remaining Phase 3 verification is a hosted Pinecone multi-case duplicate retrieval test. Recent commits pushed to `main`: `e75b929`, `748ff9a`, `16aec2d`, `be5ca91`, `db689a9`, `4c0b182`, `ae0f8f0`, `c247486`. |
| Day 4 | **V2 Grievance Intelligence Specification Saved (`docs/V2_ARCHITECTURE_SPEC.md`)**: Comprehensive blueprint defining the asynchronous Grievance Intelligence Orchestrator, Redis/BullMQ background worker queue, 5 specialized agents (Agent 1 Triage, Agent 2 Document AI, Agent 3 Semantic Deduplication via Pinecone, Agent 4 Auto-Assignment, Agent 5 Autonomous Evidence Enrichment via Tavily), structured JSON schemas, Officer Scorecards, and Bilateral Accountability. | Phase 1 is completed
| Day 4 | **Phase 4 Agent 2 Document Intelligence started**: Added `document.agent.js`, strict `document.schema.js`, and `document.prompt.js`. The worker now loads the agent for each uploaded document; PDFs use `pdf-parse` with bounded fallback extraction, images use OpenAI multimodal input, and test/offline mode uses deterministic relevance/entity fixtures. Added `tests/document.test.js` covering notice images, PDF extraction, and irrelevant selfies. Focused Phase 3/4/worker tests pass 9/9. | Phase 4 is in progress; production vision verification and document-analysis UI remain |
| Day 4 | **Phase 4 document analysis API added**: Added authenticated `GET /grievance/:caseId/documents/:docId/analysis` for the owning citizen or assigned officer. It returns the stored Agent 2 result, processing status, document metadata, and the mandatory authenticity limitation. Extended `tests/documents.test.js` with success and unauthorized-access coverage and synchronized `API_DOCUMENTATION.md`. | Phase 4 API layer is complete; production vision verification and document-analysis UI remain |
| Day 4 | **Phase 5 Agent 5 Evidence Enrichment started**: Added `evidence.agent.js`, strict evidence summary schema/prompt, and `evidenceRanker.js`. Agent 5 now scopes public-web usefulness, executes the existing Tavily multi-search adapter, scores source relevance/credibility/geo/time/entity matches, detects corroboration signals, stores review-pending `Evidence` records with SHA-256 snapshot hashes, and treats web results as untrusted data. Added `tests/evidence.test.js`; 5/5 focused tests pass. `AI_EVIDENCE_ENABLED` remains false pending live Tavily verification. | Phase 5 is in progress; live Tavily verification and evidence UI remain |
| Day 4 | **Phase 4 officer Document Intelligence UI completed**: Added reusable `DocumentAnalysisPanel.tsx` to the officer case page. Each uploaded document can load its authenticated Agent 2 result on demand, showing processing status, relevance/confidence, extracted entities, supporting claims, review flags, extracted text, and the authenticity disclaimer. Frontend production build passed. | Phase 4 UI is complete; live OpenAI OCR/vision verification remains |
| Day 4 | **Phase 5 public evidence visibility completed**: Added authenticated `GET /grievance/:caseId/evidence` and connected the officer AI intelligence panel to display Tavily-researched source title, domain/type, excerpt, confidence, review status, and source link. Added API coverage for evidence retrieval. Frontend production build passed. | Evidence research is now visible to officers; live Tavily verification remains |
| Day 4 | **Evidence UI status transparency fix**: The AI panel now displays Agent 5 research status, query count, source count, corroboration signal, and reason even when Tavily returns no sources or the search is skipped/unavailable. This prevents a blank evidence section from hiding what the system did. Frontend production build passed. | Officers can distinguish searched-with-results, searched-without-results, skipped, and unavailable states |
| Day 4 | **Document analysis reprocessing fix**: A completed BullMQ job remained deduplicated for its retention window, so a later document upload could not trigger a fresh analysis. Document uploads now remove stale completed/failed/delayed jobs before re-enqueueing; active jobs remain untouched. Completed-but-empty document analysis now has an accurate UI message. Document API tests pass 7/7. | Existing cases can be reprocessed after a document upload |
| Day 4 | **Case detail navigation tabs**: Added reusable `CaseSectionTabs.tsx` to citizen and officer case-detail pages. Sticky, keyboard-focusable section navigation provides one-click access to Overview, AI Intelligence, Evidence, Chat, and Actions; it remains horizontally scrollable on short/mobile screens and uses smooth in-page navigation without removing existing content. Frontend production build passed. | Reduces long-page scrolling while preserving the complete case workflow |
| Day 4 | **Case detail tabs converted to true single-view workspace**: Tabs now manage active state and conditionally render only Overview, AI Intelligence, Evidence, Chat, or Actions, instead of scrolling to anchors. The sticky tab bar remains available while switching sections, reducing page length and keeping chat/actions one click away. Frontend production build passed. | Each case-detail tab owns its content and users can switch directly without returning to the top |
| Day 4 | **Agent 2 worker input mapping fix**: The worker now explicitly maps MongoDB document `_id` to Agent 2 `documentId` and `storagePath` to `filePath`. Previously the agent received an undefined ID and no file path, so the UI could not match stored analysis to uploaded PDFs/images. | Enables actual per-document analysis results and file content processing |
| Day 4 | **AI worker/document-upload reliability hardening**: Increased configurable BullMQ job lock duration to `AI_JOB_LOCK_DURATION_MS` (default 300000ms) to cover long Pinecone/OpenAI stages, and document upload routes now re-enqueue the case for analysis so files added after initial grievance creation are processed. Fixed document API test setup to tolerate a live worker's idempotent analysis upsert. | Prevents lock-loss duplicate processing and closes the standalone-upload analysis gap |
| Day 4 | **Live triage priority scale normalization**: Live OpenAI returned a priority score such as `0.8` while the contract is `0–100`, producing `0.8/100` in the UI. Added a backend normalization boundary that converts scores in `[0,1]` to integer percentages before persistence/consumption, with regression coverage. | Prevents inconsistent priority display across citizen/officer consumers |
| Day 4 (Cont.) | **Shared-device logout now ends the CivID SSO session**: Previously citizen logout in the Navbar only cleared `sessionStorage`; the oidc-provider session cookie survived, so the next person on a shared device silently resumed the previous user. Added `apps/sso-server/src/routes/endSession.js` exposing `GET /oidc/logout` which reads the oidc-provider `_session` cookie (resolved via `provider.cookieName('session')`), destroys the matching `provider.Session` record, and clears the `_session`/`_session.sig` cookies (verified: `Set-Cookie: _session=; Expires=1970`), and redirects back to the frontend `/?logged_out=1`. Mounted it in `app.js` BEFORE `provider.callback()`. `Navbar.tsx` `handleCitizenLogout` now calls CPGRAMS `/auth/logout` then hard-redirects to the SSO logout endpoint so the next login on that browser shows the Aadhaar screen fresh. TSC and node syntax checks pass. |
