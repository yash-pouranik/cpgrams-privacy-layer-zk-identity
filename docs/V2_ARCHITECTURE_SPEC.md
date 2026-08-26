# Privacy-Preserving CPGRAMS V2 Architecture Specification
## Grievance Intelligence Orchestrator & Autonomous Multi-Agent Layer

> **Single Source of Truth for V2 Architecture & Multi-Agent Implementation**

---

## 1. Executive Summary & Core Architectural Principle

Existing system ko replace nahi karna hai; uske upar ek **asynchronous AI intelligence layer** add karni hai.
5 independent "AI agents" ke bajay ek **Grievance Intelligence Orchestrator** specialized agents/services ko controlled, predictable workflow mein chalayega.

Isse system reliable, debuggable aur live judge demo mein genuinely impressive banta hai.

### Current System Recap (What already works)
```
Citizen ──► CivID SSO ──► CPGRAMS Backend ──► Create Grievance ──► Rule-based Auto Assignment ──► Officer ──► Status / ATR / Chat / Appeal / Reminder ──► Feedback
```
Already built & verified:
- Document upload & streaming download
- StackOverflow-style duplicate suggestion
- Privacy-preserving crowd upvote (`CaseFollow`)
- Officer dashboard with ATR & Clarifications
- Judicial disclosure with HMAC court-order verification
- Public tracking without login (`/status`)
- Chronological audit timeline
- Redressal feedback ratings (1-5★) + First Appeal escalation loop

**V2 ka kaam basic grievance management banana nahi hai.**
**V2 ka kaam hai:** Har complaint ko automatically understand, verify, enrich, compare, prioritize aur intelligently route karna.

---

## 2. Final V2 Architecture Diagram

```
┌──────────────────────┐
│       CITIZEN        │
│   Submit Grievance   │
└──────────┬───────────┘
           │
           ▼ Existing POST /grievance (Synchronous)
┌──────────────────────────────┐
│       CPGRAMS BACKEND        │
│  - Create Case (CPG-XXXXXX)  │
│  - Save Documents            │
│  - Return Case ID immediately│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────┐
│  REDIS / QUEUE   │
│  BullMQ Worker   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────┐
│    GRIEVANCE INTELLIGENCE   │
│         ORCHESTRATOR        │
└──────────────┬──────────────┘
               │
   ┌───────────┴───────────┬───────────────────────┐
   │                       │                       │
   ▼                       ▼                       ▼
┌─────────────┐     ┌─────────────┐         ┌─────────────┐
│   AGENT 1   │     │   AGENT 2   │         │   AGENT 3   │
│   TRIAGE    │     │ DOCUMENT AI │         │ QUALITY/RAG │
└──────┬──────┘     └──────┬──────┘         └──────┬──────┘
       │                   │                       │
       └───────────────────┼───────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                        AGENT 5                          │
│              EVIDENCE ENRICHMENT ENGINE                 │
└──────────────────────────┬──────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Tavily    │    │   Pinecone   │    │    OpenAI    │
│  Web Search  │    │Related Cases │    │  Reasoning   │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                        AGENT 4                          │
│             INTEL ASSIGNMENT + NOTIFICATION             │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    OFFICER PORTAL                       │
│  - AI Case Intelligence Brief                           │
│  - Human Decision / Action Taken Report (ATR)           │
│  - Accountability Metrics                               │
│  - Officer Scorecard                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Synchronous vs Asynchronous Boundary

**Complaint creation synchronous rahega.**

Existing `POST /grievance` ko AI processing ke liye wait nahi karwana:
```
POST /grievance ──► Create CPG-XXXXXX ──► Save complaint ──► Create AI analysis job ──► Return immediately
```

**Response:**
```json
{
  "caseId": "CPG-8A19F2",
  "status": "Received / Registered",
  "aiAnalysis": "QUEUED"
}
```

Background worker AI pipeline chalayega. Agar Tavily 5 sec le raha hai ya OpenAI temporarily slow hai, citizen ka complaint creation fail nahi hoga.

---

## 4. Infrastructure Components

1. **MongoDB**: CPGRAMS backend primary database. Holds `AiCaseAnalysis`, `AiAgentRun`, `Evidence`, `OfficerMetrics`.
2. **MySQL + Prisma**: CivID SSO identity custodian. Untouched by AI layer to strictly isolate PII.
3. **OpenAI API**: Complaint normalization, classification, priority estimation, location/entity extraction, keyword generation, document analysis, evidence relevance evaluation, final case brief generation.
4. **Pinecone**: Semantic retrieval layer (similar complaints + relevant past evidence).
5. **Tavily**: Autonomous external web search for public evidence, tender records, news, and official gazettes.
6. **Redis + BullMQ**: Background job queue, retries, concurrency control, rate limiting, and failure handling.
7. **Local Storage / Object Storage**: Multer disk storage abstraction for attachments and generated evidence snapshots.

---

## 5. Multi-Agent Pipeline Specifications

### Agent 1 — Triage + Routing
- **Purpose**: Classify department, category, subcategory, priority level, location entities, and search query families.
- **Fallback**: Existing `src/services/autoAssign.js` acts as deterministic fallback if AI confidence is below threshold or service unavailable.
- **Output Schema**:
```json
{
  "normalizedComplaint": "...",
  "classification": {
    "department": "PWD",
    "category": "Road Maintenance",
    "subcategory": "Pothole",
    "confidence": 0.94
  },
  "priority": {
    "level": "HIGH",
    "score": 0.87,
    "reasons": [
      "Public safety risk",
      "Repeated infrastructure issue"
    ]
  },
  "entities": {
    "location": "Indore, Madhya Pradesh",
    "organization": "Municipal Corporation",
    "project": null,
    "contractor": "ABC Infra"
  },
  "searchTerms": [
    "Indore road pothole ABC Infra",
    "Indore road maintenance complaint",
    "ABC Infra road project"
  ]
}
```

### Agent 2 — Document Intelligence
- **Purpose**: Analyzes uploaded PDFs/images (work orders, bills, notices, photographs, government letters).
- **Stance**: Determines if document appears relevant and supports claim X (authenticity determination remains human authority's role).
- **Output Schema**:
```json
{
  "documentId": "DOC-123",
  "documentType": "Work Order",
  "isRelevant": true,
  "relevanceScore": 0.93,
  "supportsComplaint": true,
  "supportingClaims": [
    "Road repair contract was issued",
    "Contractor ABC Infra is listed"
  ],
  "detectedEntities": {
    "contractor": "ABC Infra",
    "project": "Ward 12 Road Repair",
    "date": "2026-02-14"
  },
  "flags": []
}
```

### Agent 3 — Quality + Duplicate + RAG
- **Purpose**: Pinecone semantic similarity retrieval + OpenAI reranking + Actionability quality score (0-100).
- **Output Schema**:
```json
{
  "qualityScore": 82,
  "missingInformation": ["Exact road location"],
  "isActionable": true,
  "duplicateRisk": 0.14,
  "relatedCases": [
    { "caseId": "CPG-82719", "similarity": 0.92, "relationship": "RELATED" }
  ]
}
```

### Agent 5 — Autonomous Evidence Enrichment Engine
- **Purpose**: Multi-query search strategy (Direct issue, Entity-based, Public record, News, Regulatory) via Tavily + source credibility weighting (Gov > Official News > Blogs) + snapshot creation + cross-source corroboration.
- **Evidence Scoring Heuristic**:
  $$\text{Score} = 40\% \text{ Relevance} + 25\% \text{ Credibility} + 15\% \text{ Geo Match} + 10\% \text{ Temporal Match} + 10\% \text{ Entity Match}$$
- **Output Schema**:
```json
{
  "evidenceId": "EVD-392",
  "caseId": "CPG-123",
  "type": "WEB_SOURCE",
  "title": "Indore road project under inspection",
  "url": "https://example.gov.in/project-inspection",
  "domain": "example.gov.in",
  "sourceType": "GOVERNMENT",
  "publishedAt": "2026-02-10",
  "excerpt": "...",
  "relevanceScore": 0.94,
  "sourceCredibility": 0.96,
  "supports": [
    "Location matches complaint",
    "Project name matches"
  ],
  "discoveredBy": "agent5",
  "status": "REVIEW_PENDING"
}
```

### Agent 4 — Intelligent Assignment & Event Notifications
- **Purpose**: Recommends officer based on workload, category, jurisdiction match + deterministic validator + event-driven notification dispatch (`CASE_ASSIGNED`, `CASE_HIGH_PRIORITY`, `AI_EVIDENCE_FOUND`).
- **Output Schema**:
```json
{
  "recommendedOfficerId": "OFF-194",
  "reason": [
    "Correct department",
    "Handles road infrastructure",
    "Low active workload",
    "District match"
  ],
  "confidence": 0.91
}
```

---

## 6. AI Case Intelligence Brief

Final synthesis displayed at the top of `/officer/case/[caseId]`:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CASE INTELLIGENCE BRIEF
Complaint: Road damage in Ward 12, Indore.
Priority: HIGH
Why: • Public safety concern • Similar complaints detected • Contractor identified
Related Cases: 3 cases found (92%, 87%, 82% similarity)
Documents: 2 relevant, 1 requires manual review
Public Evidence: 4 verified sources (Gov domain 96%, News 88%)
Recommended Action: Inspect site and verify contractor work order.
AI Confidence: 87%
Important Limitation: External sources do not establish legal factual truth. Officer verification required.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. Officer Accountability & Public Registry

### Officer Scorecard API (`GET /officer/:officerId/scorecard`)
```json
{
  "resolved": 142,
  "pending": 18,
  "overdue": 3,
  "averageResolutionDays": 4.7,
  "slaCompliance": 0.93,
  "citizenRating": 4.4,
  "workloadPercentile": 71
}
```

### Public Officer Registry (`/officers`)
Public directory displaying Officer Name, Department, Jurisdiction, Cases Handled, Average Resolution Time, SLA Compliance %, and Citizen Satisfaction Rating $\bigstar$.

### Bilateral Accountability Pitch
```
                  ┌────────────────────────┐
                  │ BILATERAL ACCOUNTABILITY│
                  └───────────┬────────────┘
               ┌──────────────┴──────────────┐
               ▼                             ▼
      Citizen Protection             Officer Accountability
   - Verified & Shielded          - Measured & Accountable
   - 100% Identity Privacy        - Transparent SLA Scorecards
   - Zero Fear of Retaliation     - Public Performance Registry
```
*"The citizen submits the grievance once. The system does the investigation groundwork automatically."*

---

## 8. Database Collections (New Collections for CPGRAMS Backend)

1. `AiCaseAnalysis`: `caseId`, `status`, `triage`, `quality`, `duplicate`, `documentAnalysis`, `evidenceSummary`, `assignment`, `startedAt`, `completedAt`, `error`
2. `AiAgentRun`: `runId`, `caseId`, `agent`, `status`, `input`, `output`, `model`, `latency`, `tokens`, `error`, `createdAt`
3. `Evidence`: `evidenceId`, `caseId`, `type`, `title`, `url`, `domain`, `sourceType`, `publishedAt`, `excerpt`, `relevanceScore`, `sourceCredibility`, `supports`, `discoveredBy`, `status`
4. `OfficerMetrics`: Aggregated SLA compliance, resolution time, feedback ratings.

---

## 9. Environment Variables Specification

```env
# AI Services & Models
OPENAI_API_KEY=""
OPENAI_MODEL_FAST="gpt-4o-mini"
OPENAI_MODEL_REASONING="gpt-4o"
PINECONE_API_KEY=""
PINECONE_INDEX="cpgrams-index"
PINECONE_ENVIRONMENT=""
TAVILY_API_KEY=""

# Queue & Workers
REDIS_URL="redis://localhost:6379"
AI_WORKER_CONCURRENCY=5
TAVILY_MAX_RESULTS=5
AI_MAX_RETRIES=3

# Feature Toggles
AI_ENABLED=true
AI_TRIAGE_ENABLED=true
AI_DOCUMENT_ENABLED=true
AI_RAG_ENABLED=true
AI_EVIDENCE_ENABLED=true
AI_ASSIGNMENT_ENABLED=true
```

---

## 10. Recommended Implementation Sequence

1. **Phase 1: Infrastructure & Queue** — Redis + BullMQ connection, OpenAI & Pinecone & Tavily clients, `AiCaseAnalysis` & `AiAgentRun` schemas, background worker.
2. **Phase 2: Agent 1 (Triage & Routing)** — Category classification, priority score, entity extraction, search query generation, integration with `autoAssign.js` fallback.
3. **Phase 3: Agent 3 (Quality + Semantic Deduplication)** — Pinecone embeddings, semantic case matching, quality scoring.
4. **Phase 4: Agent 2 (Document Intelligence)** — Multer integration, OCR/vision document classification, claim extraction.
5. **Phase 5: Agent 5 (Evidence Enrichment Engine)** — Smart Tavily search, source credibility heuristic, evidence snapshotting, cross-source matching.
6. **Phase 6: Agent 4 (Assignment & Notification)** — Deterministic assignment validator, event-driven notifications.
7. **Phase 7: Officer Intelligence UI** — AI Case Brief on `/officer/case/[caseId]`, evidence cards, duplicate list.
8. **Phase 8: Accountability & Scorecards** — `GET /officer/:officerId/scorecard`, Public Registry `/officers`, Bilateral Accountability on landing page.
