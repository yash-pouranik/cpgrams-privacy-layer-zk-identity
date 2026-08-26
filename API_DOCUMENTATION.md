# API Documentation — Privacy-Preserving CPGRAMS

Complete technical reference for all API endpoints exposed across the **CivID SSO Server** (`http://localhost:4000`) and the **CPGRAMS Grievance Backend** (`http://localhost:5000`).

---

## 1. CivID SSO Server (`http://localhost:4000`)

Trusted identity custodian. Operates OIDC/OAuth2 protocol, executes eKYC & OTP verification, manages deterministic Pairwise Pseudonymous Identity mappings, and serves public cryptographic verification keys.

### 🔑 OIDC & Key Discovery Endpoints
- **`GET /oidc/.well-known/openid-configuration`**
  - **Description:** Standard OIDC discovery document listing endpoints, supported scopes, and response types.
- **`GET /oidc/jwks`**
  - **Description:** JSON Web Key Set (JWKS) containing the RSA-256 public keys used to cryptographically verify CivID tokens in memory.
- **`GET /oidc/auth`**
  - **Description:** OIDC Authorization endpoint initiated by CPGRAMS backend with `client_id=cpgrams`, `code_challenge`, `state`, and `redirect_uri`.
- **`POST /oidc/token`**
  - **Description:** OIDC Token endpoint. Exchanges authorization code for ID Token and Access Token containing `sub = pairwiseId`.

### 📱 Citizen Authentication Flow (EJS Views)
- **`GET /interaction/:uid`**
  - **Description:** Renders the CivID Aadhaar login screen.
- **`POST /interaction/:uid/login`**
  - **Body:** `{ "aadhaar": "123456789012" }`
  - **Description:** Validates Aadhaar against mock eKYC, dispatches OTP (logged prominently in terminal console and emailed via Resend in production), and renders the OTP verification screen.
- **`POST /interaction/:uid/verify`**
  - **Body:** `{ "aadhaar": "123456789012", "otp": "123456" }`
  - **Description:** Verifies OTP, resolves or generates the deterministic `pairwiseId = HMAC-SHA256(userId + ":cpgrams", SSO_PAIRWISE_SECRET)`, logs an immutable audit event, and redirects to CPGRAMS callback.

### ⚖️ Judicial Identity Disclosure (Internal Reverse-Lookup)
- **`POST /internal/reverse-lookup`**
  - **Headers:** `X-Court-Order-Signature: <HMAC-SHA256 signature>`
  - **Body:** `{ "pairwiseId": "...", "courtOrderRef": "..." }`
  - **Description:** Reverses the `pairwiseId` to reveal minimal citizen identity (email only) under court authorization. Records every query in immutable audit trail.

### 🩺 Health Check
- **`GET /health`**
  - **Description:** Returns `{ "status": "ok", "service": "CivID SSO", "port": 4000 }`.

---

## 2. CPGRAMS Backend (`http://localhost:5000`)

Core grievance redressal system. Operates pseudonymous case management, masked communications, master directories, public tracking, and the 2-phase 10-stage DARPG lifecycle.

### 🔐 Authentication & Token Exchange
- **`GET /auth/login`**
  - **Description:** Initiates OIDC loop. Generates CSRF state and redirects user to CivID SSO.
- **`GET /auth/callback`**
  - **Params:** `?code=...&state=...`
  - **Description:** Validates CSRF state, exchanges OIDC code for token, creates a short-lived exchange code, and redirects to frontend `/auth/callback?code=...`.
- **`GET /auth/exchange`**
  - **Params:** `?code=<oneTimeCode>`
  - **Description:** Exchanges one-time code for session token `{ "token": "<jwt>" }`.
- **`GET /auth/logout`**
  - **Description:** Destroys active backend session.

---

### 🏛️ Master Data Services (Public Directory)
*All master data endpoints are read-only and require no authentication.*

- **`GET /master/departments`**
  - **Query:** `?type=central|state|ut`, `?search=keyword`
  - **Description:** Lists all 15 active government departments and nodal ministries.
- **`GET /master/departments/:deptCode`**
  - **Description:** Retrieves department details and designated nodal officers.
- **`GET /master/categories`**
  - **Query:** `?department=PWD`, `?parent=INFRA`, `?search=keyword`
  - **Description:** Lists 34+ hierarchical grievance categories.
- **`GET /master/categories/:code`**
  - **Description:** Retrieves details for a specific category.
- **`GET /master/officers`**
  - **Query:** `?department=PWD`, `?level=1`, `?available=true`
  - **Description:** Returns public officer directory (excluding sensitive password hashes).
- **`GET /master/officers/:officerId`**
  - **Description:** Retrieves single officer profile.

---

### 🔍 Public Status Tracking (Anonymous)
*Allows citizens to check grievance status from cyber cafes without logging in.*

- **`POST /status/check`**
  - **Body:** `{ "caseId": "CPG-XXXXXX", "registrationPassword": "..." }`
  - **Description:** Verifies password hash and returns basic case status, department, and category. Never leaks citizen `pairwiseId`.
- **`GET /status/:caseId/history`**
  - **Query:** `?password=...`
  - **Description:** Verifies password and returns complete chronological timeline of status transitions and filed events.

---

### 👤 Citizen Grievance Lifecycle (Authenticated)
*Requires `Authorization: Bearer <citizen_token>`*

- **`POST /grievance`**
  - **Content-Type:** `multipart/form-data`
  - **Fields:** `category`, `description`, `sourcePortal` (optional), `urls` (optional), `files` (up to 5 PDF/Image files, 10MB each)
  - **Description:** Lodges grievance under Pairwise ID. Generates Case ID, bcrypt-hashed 8-char Registration Password, creates `Document` records, auto-assigns nodal officer, and sets status to `received`.
- **`GET /grievance/my`**
  - **Description:** Retrieves all grievances filed by the authenticated citizen.
- **`GET /grievance/suggestions`**
  - **Query:** `?category=Roads%20%26%20Highways&q=description_text`
  - **Description:** StackOverflow-style duplicate detection. Scans recent open cases within 90 days matching category and keyword overlap. Returns `{ suggestions: [], ownDuplicate: null }`.
- **`POST /grievance/:caseId/vote`**
  - **Description:** Citizen upvotes an existing issue to boost crowd urgency. Mints and returns a private tracking password for the voter `{ votes, trackingCaseId, trackingPassword }`.
- **`GET /grievance/followed`**
  - **Description:** Retrieves all cases the authenticated citizen has upvoted/followed, including their personal tracking passwords.
- **`GET /grievance/:caseId`**
  - **Description:** Retrieves full case details (stripped of `pairwiseId`) including Action Taken Report (ATR) remarks and First Appeal data.
- **`POST /grievance/:caseId/appeal`**
  - **Body:** `{ "appealReason": "..." }`
  - **Description:** **Stage 9 & 10 First Appeal**. Dissatisfied citizen escalates disposed case to Nodal Appellate Authority (NAA). Sets status to `appealed`.

---

### 📁 Document Management & Uploads
*Supports PDF, PNG, JPG, JPEG (Max 10MB per file).*

- **`POST /grievance/:caseId/documents`** (Citizen)
  - **Headers:** `Authorization: Bearer <citizen_token>`
  - **Body:** `multipart/form-data` with `files`
  - **Description:** Citizen uploads evidence files to active case.
- **`GET /grievance/:caseId/documents`** (Citizen)
  - **Headers:** `Authorization: Bearer <citizen_token>`
  - **Description:** Lists all case documents sorted by newest first with rich metadata (`originalName`, `sizeBytes`, `uploadedByRole`, `createdAt`).
- **`GET /grievance/:caseId/documents/:docId/download`** (Citizen)
  - **Headers:** `Authorization: Bearer <citizen_token>` or `?token=<jwt>`
  - **Description:** Streams secure file attachment to browser.
- **`POST /officer/case/:caseId/documents`** (Officer)
  - **Headers:** `Authorization: Bearer <officer_token>` or `X-Officer-Id`
  - **Body:** `multipart/form-data` with `files`
  - **Description:** Officer attaches official investigation report.
- **`GET /officer/case/:caseId/documents`** (Officer)
  - **Headers:** `Authorization: Bearer <officer_token>` or `X-Officer-Id`
  - **Description:** Officer lists all attached case evidence.
- **`GET /officer/case/:caseId/documents/:docId/download`** (Officer)
  - **Headers:** `Authorization: Bearer <officer_token>` or `?token=<jwt>`
  - **Description:** Streams file to officer portal.
- **`GET /grievance/:caseId/documents/:docId/analysis`** (Citizen or assigned Officer)
  - **Headers:** `Authorization: Bearer <citizen_token>` or `Authorization: Bearer <officer_token>`
  - **Description:** Returns Agent 2 document classification, relevance, extracted entities, supporting claims, and the mandatory authenticity limitation. Returns `analysis: null` while background processing is queued or incomplete.

---

### 🔔 Reminders & Clarifications Workflow
*Bidirectional official communication loop.*

- **`POST /grievance/:caseId/reminder`** (Citizen)
  - **Headers:** `Authorization: Bearer <citizen_token>`
  - **Body:** `{ "type": "reminder" | "clarification_response", "content": "..." }`
  - **Description:** Citizen submits reminder or replies to officer clarification.
- **`GET /grievance/:caseId/reminders`** (Citizen)
  - **Headers:** `Authorization: Bearer <citizen_token>`
  - **Description:** Retrieves communication timeline.
- **`POST /officer/case/:caseId/clarification`** (Officer)
  - **Headers:** `Authorization: Bearer <officer_token>` or `X-Officer-Id`
  - **Body:** `{ "content": "..." }`
  - **Description:** Officer requests ground clarification from citizen.
- **`GET /officer/case/:caseId/reminders`** (Officer)
  - **Headers:** `Authorization: Bearer <officer_token>` or `X-Officer-Id`
  - **Description:** Officer lists reminder & clarification timeline.

---

### ⭐ Redressal Feedback
- **`POST /grievance/:caseId/feedback`** (Citizen)
  - **Headers:** `Authorization: Bearer <citizen_token>`
  - **Body:** `{ "rating": 1-5, "comment": "..." }`
  - **Description:** Citizen rates resolution quality on a 1-5 star scale.
- **`GET /grievance/:caseId/feedback`** (Citizen & Officer)
  - **Headers:** `Authorization: Bearer <token>`
  - **Description:** Retrieves submitted redressal rating and comments.

---

### 🛡️ Officer Case Management & Appellate Review
*Requires `Authorization: Bearer <officer_token>` or `X-Officer-Id: PWD-001`*

- **`POST /officer/login`** (Public)
  - **Body:** `{ "officerId": "PWD-001", "password": "Officer@123" }`
  - **Description:** Authenticates officer with hashed credentials and returns signed JWT.
- **`GET /officer/me`**
  - **Description:** Returns profile of authenticated officer.
- **`GET /officer/cases`**
  - **Description:** Lists all grievances assigned to officer.
- **`GET /officer/case/:caseId`**
  - **Description:** Returns case details (pairwiseId stripped).
- **`PATCH /officer/case/:caseId/status`**
  - **Body:** `{ "status": "under_process" | "forwarded" | "disposed", "atrRemarks": "..." }`
  - **Description:** Updates case status. When set to `disposed`, saves formal **Action Taken Report (ATR)** remarks.
- **`POST /officer/case/:caseId/appeal-decision`**
  - **Body:** `{ "decision": "upheld" | "fresh_action_ordered", "appealOrderRemarks": "..." }`
  - **Description:** **Stage 10 Appellate Review**. Nodal Appellate Authority issues final order. If `fresh_action_ordered`, re-opens case to `under_process` for field correction.
- **`GET /officer/case/:caseId/disclosure`**
  - **Description:** If judicial disclosure was approved, returns decrypted citizen email and court order reference.

---

### 💬 Masked Communication Thread
*Direct case-scoped messaging channel. Server derives senderRole automatically.*

- **`GET /chat/:caseId`**
  - **Headers:** `Authorization: Bearer <citizen_token>` (Citizen) OR `Authorization: Bearer <officer_token>` / `X-Officer-Id` (Officer)
  - **Description:** Returns chat history for the case.
- **`POST /chat/:caseId`**
  - **Headers:** Same as GET
  - **Body:** `{ "content": "..." }`
  - **Description:** Posts message in thread. Server automatically binds `senderRole` from auth context.

---

### ⚖️ Disclosure Authority Console (Judicial Identity Reveal)
*Requires `X-Authority-Token: authority-secret-change-me`*

- **`POST /disclosure/request`** (Officer)
  - **Headers:** `Authorization: Bearer <officer_token>` or `X-Officer-Id`
  - **Body:** `{ "caseId": "...", "justification": "..." }`
  - **Description:** Officer submits legal disclosure request with court order reference.
- **`GET /disclosure/pending`**
  - **Headers:** `X-Authority-Token`
  - **Description:** Lists all pending judicial disclosure requests.
- **`POST /disclosure/:id/approve`**
  - **Headers:** `X-Authority-Token`
  - **Body:** `{ "courtOrderRef": "HC-2026-881" }`
  - **Description:** Approves request, calls CivID SSO `/internal/reverse-lookup`, decrypts citizen email, and logs immutable audit trail.
- **`POST /disclosure/:id/reject`**
  - **Headers:** `X-Authority-Token`
  - **Description:** Rejects disclosure request.

---

### 🌐 External State / Ministry Push Web Service
*Integration gateway for external government portals (UMANG, State Portals).*

- **`POST /api/push/grievance`**
  - **Headers:** `X-API-Key: dev-push-key-12345`
  - **Body:** `{ "sourcePortal": "UMANG", "sourceRefId": "UMG-902", "category": "Roads & Highways", "description": "...", "citizenPairwiseId": "...", "evidenceUrls": [] }`
  - **Description:** Programmatically ingests grievance, auto-assigns nodal officer, and returns registration ID.

---

### 🩺 Health Check
- **`GET /health`**
  - **Description:** Health check. Returns `{ "status": "ok", "service": "CPGRAMS Backend", "port": 5000 }`.
