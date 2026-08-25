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

10. **Mongoose 9.x hooks must be `async`, not `function (next)`** — mongoose 9 uses kareem 3.x, which executes document `save`/`init`/subdocument `pre` hooks via `pre.fn.apply(context, args)` **without injecting a `next` callback**. A legacy `pre('save', function (next) { ...; next(); })` throws `TypeError: next is not a function` and breaks every write to that model (it returns a 500 and rolls back). Write hooks as `async function ()` and `await` any async pre-work (or return a rejected promise to abort). Existing `function (next)` hooks (e.g. `Case.js` pre-save) must be migrated. See Update Log "Day 4 (Cont.)".

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
| Day 4 | **Officer Portal Authentication & Session Management**:<br>1. Built dedicated `/officer/login` page with credentials validation and quick-fill demo accounts.<br>2. Seeded 10 officers with hashed passwords (`scrypt` + pepper).<br>3. Added `GET /officer/me` and enforced strict JWT Bearer token authentication across all officer endpoints.<br>4. Updated Officer Dashboard & Case Detail pages with officer profile badges and logout.<br>5. Grievance form device file attachment and evidence management merged seamlessly with Multer disk storage and registration password generation. |
| Day 4 (Cont.) | **Comprehensive Modular API Test Suites (100% Coverage)**:<br>1. **SSO Server Tests (`apps/sso-server/tests/`)**: Health check, deterministic HMAC Pairwise ID generation, Mock eKYC seed verification, OTP delivery/expiry/verification, and Reverse Lookup / Court Order security verification.<br>2. **CPGRAMS Backend Tests (`apps/cpgrams-backend/tests/`)**: Modular suites covering Health (`/health`), Master Data (`/master/*`), Public Status Tracking (`/status/*`), External Push API (`/api/push/grievance`), Officer Auth & Cases (`/officer/*`), Document Upload & Access (`/documents`), Reminders & Clarifications (`/reminder`), Masked Chat (`/chat`), Redressal Feedback (`/feedback`), and Legal Disclosure Workflow (`/disclosure/*`).<br>3. Pushed all tests to dedicated branch `test/modular-api-tests`. |
