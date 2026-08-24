# Issues & Flow Breaks — Privacy-Preserving CPGRAMS

> **Status:** All Critical and High Security issues resolved and verified via automated test suite.
> **Date:** 2026-08-24

---

## 🔴 CRITICAL FLOW BREAKS (Resolved)

### 1. Officer ID mismatch ✅ FIXED
- **Status:** ✅ Fixed — `officer/page.tsx` and `officer/case/[caseId]/page.tsx` use seeded ID `PWD-001`.

### 2. SSO_ISSUER_URL inconsistency ✅ FIXED
- **Status:** ✅ Fixed — Normalized `SSO_ISSUER_URL` handling across `verifyToken.js`, `disclosure.js`, and `auth.js`. SSO base URL is cleanly separated for internal reverse-lookup (`/internal/reverse-lookup`) and token validation (`http://localhost:4000/oidc`).

### 3. ChatThread Authentication ✅ FIXED
- **Status:** ✅ Fixed — Implemented `flexAuth` middleware in `chat.js` verifying JWT tokens for citizens and officer identities for officers with strict case ownership checks.

---

## 🟠 HIGH SECURITY ISSUES (Resolved)

### 4. verifyToken JWT Cryptographic Verification ✅ FIXED
- **Status:** ✅ Fixed — Rewrote `verifyToken.js` to fetch SSO JWKS (`/oidc/jwks`), match key IDs (`kid`), convert JWK to PEM, and verify RS256 JWT signature cryptographically.

### 5. Chat senderRole Server-Side Derivation ✅ FIXED
- **Status:** ✅ Fixed — `senderRole` in `POST /chat/:caseId` is derived on the server from authenticated context (`req.authType`), ignoring any client-sent payload.

### 6. Officer Ownership Checks ✅ FIXED
- **Status:** ✅ Fixed — Added strict assignment authorization checks in `officer.js` preventing officers from viewing or mutating cases assigned to other officers.

### 7. Disclosure Authority Token Configuration ✅ FIXED
- **Status:** ✅ Fixed — Migrated authority token from hardcoded strings to `process.env.NEXT_PUBLIC_AUTHORITY_TOKEN` in frontend.

### 8. OIDC Token URL Query Parameter Leak ✅ FIXED
- **Status:** ✅ Fixed — Implemented a secure one-time exchange code pattern. SSO redirects to `/auth/callback?code=...` and frontend securely exchanges the code for the JWT via `GET /auth/exchange`.

### 9. OIDC State Parameter (CSRF Protection) ✅ FIXED
- **Status:** ✅ Fixed — Added cryptographic `state` generation in `GET /auth/login` and validation on `GET /auth/callback`.

---

## 🟡 MINOR / LOW

### 10. Case ID Collision Risk ✅ FIXED
- **Status:** ✅ Fixed — Added async retry loop (up to 5 attempts) against MongoDB in `services/caseId.js`.

### 11. OTP in-memory store
- **Status:** Dev mode in-memory Map with console log + Resend email delivery.

### 12. SSO static public dir
- **Status:** Static asset path configured.

---

## ✅ Full CPGRAMS Feature Suite Implemented & Verified
1. **Grievance Ingestion & Push Services**:
   - `POST /grievance`: Registration password generation with bcrypt hashing.
   - `POST /api/push/grievance`: External state/ministry web service with API Key validation (`X-API-Key`).
   - Document Upload API: `POST /grievance/:caseId/documents` and `GET /grievance/:caseId/documents/:docId/download` with multer.
2. **Status Tracking & Pull Services**:
   - `POST /status/check`: Public status check with Registration Password (no login required).
   - `GET /status/:caseId/history`: Audit log history timeline.
   - `POST /grievance/:caseId/reminder` & `POST /officer/case/:caseId/clarification`: Reminders & clarifications workflow.
   - `POST /grievance/:caseId/feedback`: Redressal satisfaction rating (1-5 stars).
3. **Master Data & Configuration Services**:
   - `GET /master/departments`: 15 Central, State, and UT departments.
   - `GET /master/categories`: 34 standardized categories with parent-child hierarchy.
   - `GET /master/officers`: Nodal officers directory.