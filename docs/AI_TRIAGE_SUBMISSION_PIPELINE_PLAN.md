# Plan: Real Multi-Lingual AI Semantic Auto-Triage & Live Submission Progress Pipeline

This document archives the complete architecture and implementation plan for the **Multi-Lingual AI Semantic Auto-Triage Engine (IGMS 2.0)** and the **Real-Time Live Submission Progress Pipeline Modal**.

---

## 1. Overview & Problem Statement

### Current Limitation:
The initial auto-routing utilized basic static keyword matching in `autoAssign.js`. While functional for exact English terms, it could not handle:
- Multi-lingual inputs (Hindi, Hinglish, regional phrases).
- Informal phrasing, spelling mistakes, or complex descriptive complaints.
- Live real-time visual feedback during the submission lifecycle.

### Proposed Upgrade:
1. **Multi-Lingual Semantic Auto-Triage Engine (`aiClassifier.js`)**:
   - Understands English, Hindi, Hinglish (e.g., *"sadak toot gayi"*, *"dawai nahi mil rahi"*, *"khasra zameen vivad"*), typos, and informal language.
   - Computes TF-IDF vector scores across all 15 Ministries $\times$ 1,000+ semantic intents with dynamic confidence scoring (e.g. `97%`) and urgency assessment (1–5).
   - Zero-shot Gemini LLM connector if `GEMINI_API_KEY` is configured.
2. **Real-Time Live Submission Progress Pipeline Modal (`LiveSubmissionModal.tsx`)**:
   - Displays animated step-by-step resolution stages upon grievance submission:
     1. `[✓] Stage 1: Citizen Auth & Pairwise Encryption` (Seals real identity into Pairwise ID)
     2. `[✓] Stage 2: AI IGMS Semantic Scanning` (Processes multi-lingual semantic context)
     3. `[✓] Stage 3: Department Identified` (e.g., *Public Works Department • Confidence 97%*)
     4. `[✓] Stage 4: Nodal Officer Matching` (Assigns least-loaded available officer)
     5. `[✓] Stage 5: Registration Complete` (Generates Registration ID & Password)
3. **Live AI Triage Preview Badge**:
   - Real-time badge in Step 3 of the Grievance Lodging Wizard (`/grievance/new`).

---

## 2. Planned Architecture

### Backend (`apps/cpgrams-backend`):
- `src/services/aiClassifier.js`: Multi-lingual semantic engine with 15 ministry dictionaries, phonetic Hindi/Hinglish tokenizers, weighted vector scoring, and confidence calculation.
- `src/services/autoAssign.js`: Integrated with `aiClassifier` for smart load-balanced dispatch.
- `src/routes/grievance.js`: Returns rich `aiTriage` metadata in `POST /grievance`.
- `src/routes/master.js`: Endpoint `POST /master/ai-triage` for client-side live preview.

### Frontend (`apps/frontend`):
- `components/LiveSubmissionModal.tsx`: Real-time HUD/terminal modal rendering animated execution stages.
- `app/grievance/new/page.tsx`: Integrated live pipeline modal and real-time AI triage badge.
