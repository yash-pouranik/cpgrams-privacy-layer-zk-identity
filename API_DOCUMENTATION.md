# API Documentation — Privacy-Preserving CPGRAMS

This document lists all API endpoints available across the **CivID SSO Server** and the **CPGRAMS Backend**.

---

## 1. CivID SSO Server (`http://localhost:4000`)

The identity custodian service. Operates OIDC/OAuth2 protocols and maintains citizen identity mapping.

### OIDC Endpoints
- **`GET /oidc/.well-known/openid-configuration`**
  - **Description:** Standard OIDC discovery document listing authorization, token, and userinfo endpoints.
- **`GET /oidc/auth`**
  - **Description:** OIDC Authorization Endpoint. Initiated by CPGRAMS backend with `client_id`, `code_challenge`, and `redirect_uri`.
- **`POST /oidc/token`**
  - **Description:** OIDC Token Endpoint. Exchanges authorization `code` for ID Token / Access Token containing `sub = pairwiseId`.

### Interaction Routes (EJS Views & Auth Flow)
- **`GET /interaction/:uid`**
  - **Description:** Renders the CivID login view (Aadhaar input).
- **`POST /interaction/:uid/login`**
  - **Body:** `{ "aadhaar": "123456789012" }`
  - **Description:** Validates Aadhaar, sends OTP via email, renders OTP verification view.
- **`POST /interaction/:uid/verify`**
  - **Body:** `{ "aadhaar": "123456789012", "otp": "123456" }`
  - **Description:** Verifies OTP, generates/fetches `pairwiseId`, logs event to `audit_logs`, and redirects back to CPGRAMS backend callback.

### Disclosure API (Internal)
- **`POST /internal/reverse-lookup`**
  - **Headers:** `X-Court-Order-Signature: <HMAC signature>`
  - **Body:** `{ "pairwiseId": "...", "courtOrderRef": "..." }`
  - **Description:** Reverses the `pairwiseId` to reveal minimal citizen identity (email only) for court-approved disclosures. Every request is recorded in `audit_logs`.

### Utility Endpoints
- **`GET /health`**
  - **Description:** Health check. Returns `{ "status": "ok", "service": "CivID SSO", "port": 4000 }`.

---

## 2. CPGRAMS Backend (`http://localhost:5000`)

The grievance redressal backend system.

### Auth Routes
- **`GET /auth/login`**
  - **Description:** Initiates OIDC authorization flow. Generates PKCE parameters and redirects browser to CivID SSO.
- **`GET /auth/callback`**
  - **Params:** `?code=...`
  - **Description:** Receives authorization code from SSO, exchanges it for ID token, and redirects browser to frontend `http://localhost:3000/auth/callback?token=<id_token>`.
- **`GET /auth/logout`**
  - **Description:** Destroys user session.

### Citizen Grievance Routes
*All routes require header `Authorization: Bearer <id_token>`*

- **`POST /grievance`**
  - **Content-Type:** `multipart/form-data`
  - **Fields:** `category` (text), `description` (text), `urls` (text — JSON array or comma-separated list of external evidence links, optional), `files` (file — image or PDF, up to 5 files, 5MB each, field name `files`)
  - **Description:** Files a new grievance under a pseudonymous Case ID. Uploaded images/PDFs are stored on disk under `/uploads` and referenced by absolute URL in `evidenceUrls`; external link-based evidence is merged into the same array. Auto-assigns department and available officer.
- **`GET /grievance/my`**
  - **Description:** Retrieves all grievances filed by the authenticated citizen.
- **`GET /grievance/:caseId`**
  - **Description:** Retrieves details for a single grievance belonging to the authenticated citizen.

### Officer Routes
*All routes require header `X-Officer-Id: officer-001`*

- **`GET /officer/cases`**
  - **Description:** Retrieves all cases assigned to the requesting officer.
- **`GET /officer/case/:caseId`**
  - **Description:** Retrieves full details for an assigned case. Citizen `pairwiseId` is stripped from response to protect identity.
- **`PATCH /officer/case/:caseId/status`**
  - **Body:** `{ "status": "in_progress" | "resolved" }`
  - **Description:** Updates case status.

### Masked Chat Routes
- **`GET /chat/:caseId`**
  - **Description:** Retrieves all chat messages for a case.
- **`POST /chat/:caseId`**
  - **Body:** `{ "senderRole": "citizen" | "officer", "content": "..." }`
  - **Description:** Posts a new message in the case thread. Display names are masked to "You", "Citizen", or "Officer".

### Disclosure Authority Routes
- **`POST /disclosure/request`**
  - **Headers:** `X-Officer-Id: officer-001`
  - **Body:** `{ "caseId": "...", "justification": "..." }`
  - **Description:** Officer submits a formal request to reveal citizen identity.
- **`GET /disclosure/pending`**
  - **Headers:** `X-Authority-Token: authority-secret-change-me`
  - **Description:** Lists all pending disclosure requests for the Disclosure Authority.
- **`POST /disclosure/:id/approve`**
  - **Headers:** `X-Authority-Token: authority-secret-change-me`
  - **Body:** `{ "courtOrderRef": "..." }`
  - **Description:** Approves disclosure, queries SSO reverse-lookup, and returns citizen identity (email).
- **`POST /disclosure/:id/reject`**
  - **Headers:** `X-Authority-Token: authority-secret-change-me`
  - **Description:** Rejects disclosure request.

### Utility Endpoints
- **`GET /health`**
  - **Description:** Health check. Returns `{ "status": "ok", "service": "CPGRAMS Backend", "port": 5000 }`.
