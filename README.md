# Privacy-Preserving CPGRAMS — CivID SSO

> **One-liner:** Verify the citizen. Protect the identity.

A privacy-preserving identity and grievance-handling layer built on top of CPGRAMS (Centralised Public Grievance Redress and Monitoring System). Citizens authenticate via a trusted SSO server and file grievances under a pseudonymous Case ID. The officer handling the grievance never sees the citizen's real identity. Identity can only be revealed through a court-authorized, auditable disclosure workflow.

---

## ⚡ Quick Start (Windows)

After cloning the repository, simply double-click or run:

```cmd
setup-and-run.bat
```

This single script will:
1. Install all dependencies across the monorepo workspaces.
2. Generate Prisma Client for the CivID SSO Server.
3. Seed CPGRAMS Backend mock officers in MongoDB.
4. Launch all 3 services in parallel Command Prompt windows:
   - **Frontend UI:** `http://localhost:3000`
   - **CivID SSO Server:** `http://localhost:4000`
   - **CPGRAMS Backend API:** `http://localhost:5000`

### Quick Launch (After setup)
If dependencies are already installed, run:
```cmd
start.bat
```

---

## 🔑 Demo Credentials (Mock eKYC)

| Aadhaar (mock) | Name | Email | Mobile |
|---|---|---|---|
| `123456789012` | Rahul Sharma | rahul.sharma@example.com | +91 9876543210 |
| `987654321098` | Priya Patel | priya.patel@example.com | +91 9123456780 |
| `111122223333` | Amit Verma | amit.verma@example.com | +91 9988776655 |

> **OTP Note:** In development mode without a live Resend API Key, the 6-digit OTP will be printed directly in the **CivID SSO Server terminal window**.

---

## 🛠️ Tech Stack & Monorepo Structure

```
cpgrams-privacy-layer-zk-identity/
├── setup-and-run.bat                ← Setup dependencies & launch all 3 servers
├── start.bat                        ← Quick start all 3 servers
├── API_DOCUMENTATION.md             ← Full API endpoint reference
├── AGENTS.md                        ← Monorepo source of truth
│
├── apps/
│   ├── sso-server/                  ← Node.js + Express + Prisma (MySQL) + oidc-provider (Port 4000)
│   ├── cpgrams-backend/             ← Node.js + Express + Mongoose (MongoDB) + openid-client (Port 5000)
│   └── frontend/                    ← Next.js 14 App Router + Tailwind CSS + shadcn/ui (Port 3000)
```

---

## 📖 Key Flow & Roles

1. **Citizen Portal (`http://localhost:3000`)**:
   - Click **Continue with CivID** → Authenticate with Mock Aadhaar & OTP → Redirect to Citizen Dashboard.
   - File grievances under pseudonymous Case IDs (e.g., `CPG-A1B2C3`).
   - Chat with assigned officers without revealing real names.

2. **Officer Dashboard (`http://localhost:3000/officer`)**:
   - View assigned cases with prominent **🔒 CITIZEN IDENTITY: PROTECTED** warning.
   - Update case status & chat with citizen.
   - Submit formal Identity Disclosure Request if legally mandated.

3. **Disclosure Authority Console (`http://localhost:3000/disclosure`)**:
   - Review pending officer disclosure requests.
   - Approve (with Court Order reference) or Reject requests.
   - Fully audit-logged identity reveal mechanism.