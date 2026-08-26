# Implementation Plan: Grievance Intelligence Platform

> **Product Thesis**: India has 1.4 billion citizens and zero infrastructure where a complaint is automatically understood, verified against public evidence, deduplicated across semantic meaning, and routed to the exact right officer — all while the citizen's identity remains cryptographically sealed. This is that infrastructure.

---

## The Architecture in One Sentence

> The citizen submits the grievance once. The system does the investigation groundwork automatically. The officer receives a pre-analyzed, evidence-enriched, priority-scored intelligence brief. Every officer action is measured and publicly accountable.

---

## What Already Exists (Audited, Verified, 100% Tests Passing)

| Layer | What's Built | Files | Tests |
|---|---|---|---|
| **CivID SSO** | OIDC Provider, Mock eKYC, Pairwise HMAC Identity, Court-Order Reverse Lookup | 14 source files, 5 Prisma tables | 16/16 pass |
| **CPGRAMS Backend** | Grievance CRUD, Officer Auth (scrypt), Masked Chat, Documents (Multer), Reminders/Clarifications, Feedback (1-5★), First Appeal, Disclosure Authority, Public Status Tracking, Duplicate Detection (keyword overlap), Auto-Assignment (keyword→department), External Push API, Master Data (15 depts, 34 categories, 10 officers) | 22 source files, 11 Mongoose models, 11 route modules | 11 test suites pass |
| **Frontend** | 12 pages (Landing, Auth Callback, Dashboard, 5-Step Grievance Wizard, Case Detail, Officer Login, Officer Dashboard, Officer Case Detail, Disclosure Console, Public Status), 22 components | Next.js 16 + React 19 + Tailwind v4 | Build clean (exit 0) |

**Critical architectural guarantee already enforced**: CivID SSO (MySQL) is completely isolated from CPGRAMS (MongoDB). AI layer will NEVER touch SSO. Zero PII crosses the privacy horizon.

---

## Phase 1: Queue Infrastructure & AI Foundation

> **Goal**: Establish the asynchronous processing backbone so complaint creation never blocks on AI.

### Backend Changes

#### [NEW] `apps/cpgrams-backend/src/config/redis.js`
- Initialize `ioredis` connection using `REDIS_URL` env var
- Export singleton Redis client with reconnect strategy and error logging
- Connection health check function for `/health` endpoint

#### [NEW] `apps/cpgrams-backend/src/config/aiConfig.js`
- Centralized AI feature toggles reading from environment:
  ```
  AI_ENABLED, AI_TRIAGE_ENABLED, AI_DOCUMENT_ENABLED,
  AI_RAG_ENABLED, AI_EVIDENCE_ENABLED, AI_ASSIGNMENT_ENABLED
  ```
- Model tier selection: `OPENAI_MODEL_FAST` (gpt-5.6-luna) for classification/extraction, `OPENAI_MODEL_REASONING` (gpt-5.6-luna) for synthesis/briefs
- Concurrency limits: `AI_WORKER_CONCURRENCY`, `TAVILY_MAX_RESULTS`, `AI_MAX_RETRIES`

#### [NEW] `apps/cpgrams-backend/src/ai/integrations/openai.client.js`
- OpenAI SDK wrapper with structured JSON output enforcement (`response_format: { type: "json_schema" }`)
- Model-tier routing: fast model for extraction, reasoning model for synthesis
- Token counting, latency measurement, cost estimation per call
- Graceful error handling (rate limit backoff, timeout, invalid response)

#### [NEW] `apps/cpgrams-backend/src/ai/integrations/pinecone.client.js`
- Pinecone SDK wrapper for index `cpgrams-index`
- Namespaces: `complaints`, `evidence`, `documents`
- Upsert, query, and delete operations with metadata filtering
- Embedding generation via OpenAI `text-embedding-3-small` (1536 dimensions)

#### [NEW] `apps/cpgrams-backend/src/ai/integrations/tavily.client.js`
- Tavily Search API wrapper with configurable `max_results` and `search_depth`
- Domain priority scoring (`.gov.in` > established news > general web)
- Result sanitization (strip tracking params, normalize URLs)
- Rate limiting via semaphore pattern

#### [NEW] `apps/cpgrams-backend/src/models/AiCaseAnalysis.js`
Mongoose schema — one record per grievance case:
```javascript
{
  caseId:            String (required, unique, indexed),
  status:            String (enum: ['queued','processing','triaging','analyzing_documents',
                     'checking_similar_cases','enriching_evidence','assigning',
                     'completed','partial','failed']),
  triage:            Mixed,      // Agent 1 structured output
  documentAnalysis:  [Mixed],    // Agent 2 per-document results
  quality:           Mixed,      // Agent 3 quality + duplicate output
  evidenceSummary:   Mixed,      // Agent 5 enrichment output
  assignment:        Mixed,      // Agent 4 recommendation
  caseBrief:         String,     // Final synthesized intelligence brief
  startedAt:         Date,
  completedAt:       Date,
  error:             String,
  retryCount:        Number (default: 0)
}
```

#### [NEW] `apps/cpgrams-backend/src/models/AiAgentRun.js`
Mongoose schema — execution trace per agent per case:
```javascript
{
  runId:      String (required, unique),
  caseId:     String (required, indexed),
  agent:      String (enum: ['triage','document','quality','evidence','assignment','brief']),
  status:     String (enum: ['running','completed','failed','skipped']),
  input:      Mixed,
  output:     Mixed,
  model:      String,
  latencyMs:  Number,
  tokensUsed: { prompt: Number, completion: Number },
  cost:       Number,
  error:      String,
  createdAt:  Date (default: Date.now)
}
```

#### [NEW] `apps/cpgrams-backend/src/models/Evidence.js`
Mongoose schema — discovered evidence artifacts:
```javascript
{
  evidenceId:        String (required, unique),
  caseId:            String (required, indexed),
  type:              String (enum: ['WEB_SOURCE','RELATED_CASE','DOCUMENT_FINDING','CORROBORATION']),
  title:             String,
  url:               String,
  domain:            String,
  sourceType:        String (enum: ['GOVERNMENT','NEWS','ACADEMIC','NGO','GENERAL']),
  publishedAt:       Date,
  excerpt:           String,
  relevanceScore:    Number (0-1),
  sourceCredibility: Number (0-1),
  evidenceConfidence:Number (0-1),
  supports:          [String],     // Human-readable reasons
  discoveredBy:      String,
  snapshotHash:      String,       // SHA-256 of retrieved content at discovery time
  retrievedAt:       Date,
  status:            String (enum: ['REVIEW_PENDING','ACCEPTED','REJECTED'], default: 'REVIEW_PENDING')
}
```

#### [NEW] `apps/cpgrams-backend/src/ai/queue/grievanceQueue.js`
- BullMQ queue named `grievance-intelligence`
- Job creation function: `enqueueAiAnalysis(caseId)` — called from `POST /grievance` after case creation
- Job options: 3 retries, exponential backoff (1s, 4s, 16s), 5-minute timeout
- Dead letter queue for permanently failed jobs

#### [NEW] `apps/cpgrams-backend/src/ai/workers/grievanceIntelligence.worker.js`
- BullMQ Worker consuming from `grievance-intelligence` queue
- Orchestration sequence:
  1. Create/update `AiCaseAnalysis` → status `processing`
  2. Run Agent 1 (Triage) → status `triaging`
  3. Run Agent 2 (Document AI) in parallel with Agent 3 (Quality/RAG) → status `analyzing_documents` / `checking_similar_cases`
  4. Run Agent 5 (Evidence Enrichment) → status `enriching_evidence`
  5. Run Agent 4 (Assignment) → status `assigning`
  6. Generate final Case Brief → status `completed`
- Each agent run logged to `AiAgentRun`
- Partial completion: if any agent fails, mark `status: 'partial'`, persist what succeeded
- Feature toggle checks: skip disabled agents gracefully

#### [MODIFY] [apps/cpgrams-backend/src/routes/grievance.js](file:///d:/cpgrams-privacy-layer-zk-identity/apps/cpgrams-backend/src/routes/grievance.js)
- After case creation in `POST /` handler (after line ~100 where `Case` is saved):
  - If `AI_ENABLED === true`: call `enqueueAiAnalysis(savedCase.caseId)`
  - Add `aiAnalysis: AI_ENABLED ? 'QUEUED' : 'DISABLED'` to 201 response

#### [MODIFY] [apps/cpgrams-backend/src/app.js](file:///d:/cpgrams-privacy-layer-zk-identity/apps/cpgrams-backend/src/app.js)
- Import and start BullMQ worker on server boot (conditional on `AI_ENABLED`)
- Add Redis connection status to `/health` endpoint
- Mount new AI routes (Phase 7)

#### [NEW] `apps/cpgrams-backend/.env.example`
```env
# Existing
MONGO_URI="mongodb://localhost:27017/cpgrams_db"
SSO_ISSUER_URL="http://localhost:4000/oidc"
CPGRAMS_CLIENT_SECRET=""
PORT=5000

# V2 AI Infrastructure
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY=""
OPENAI_MODEL_FAST="gpt-5.6-luna"
OPENAI_MODEL_REASONING="gpt-5.6-luna"
PINECONE_API_KEY=""
PINECONE_INDEX="cpgrams-index"
PINECONE_ENVIRONMENT=""
TAVILY_API_KEY=""

# Feature Toggles
AI_ENABLED=true
AI_TRIAGE_ENABLED=true
AI_DOCUMENT_ENABLED=true
AI_RAG_ENABLED=true
AI_EVIDENCE_ENABLED=true
AI_ASSIGNMENT_ENABLED=true

# Worker Config
AI_WORKER_CONCURRENCY=5
TAVILY_MAX_RESULTS=5
AI_MAX_RETRIES=3
```

### New Dependencies
```bash
npm install ioredis bullmq openai @pinecone-database/pinecone -w apps/cpgrams-backend
```
Tavily has a REST API — no SDK needed, use native `fetch`.

### Verification
- Redis connection health check passes at `/health`
- BullMQ worker starts and logs ready status
- `POST /grievance` returns `"aiAnalysis": "QUEUED"` with `AI_ENABLED=true`
- `POST /grievance` returns `"aiAnalysis": "DISABLED"` with `AI_ENABLED=false` (zero regression)
- All 11 existing test suites continue to pass (AI disabled in test env)

---

## Phase 2: Agent 1 — Intelligent Triage & Routing

> **Goal**: Every complaint is automatically classified, prioritized, geolocated, and tagged with search queries for downstream agents.

### New Files

#### [NEW] `apps/cpgrams-backend/src/ai/agents/triage/triage.agent.js`
- Input: `{ caseId, category, description, department, orgType, evidenceUrls }`
- Calls OpenAI (`OPENAI_MODEL_FAST`) with structured output schema
- Output (`TriageResult`):
  ```json
  {
    "normalizedComplaint": "Road in Ward 12, Indore damaged for 6 months...",
    "language": "hi-en",
    "classification": {
      "department": "PWD",
      "category": "Road Maintenance",
      "subcategory": "Pothole / Road Damage",
      "confidence": 0.94
    },
    "priority": {
      "level": "HIGH",
      "score": 87,
      "reasons": ["Public safety risk", "Repeated infrastructure issue"]
    },
    "entities": {
      "location": { "city": "Indore", "state": "Madhya Pradesh", "ward": "12", "landmark": "MG Road" },
      "organizations": ["Municipal Corporation"],
      "contractors": ["ABC Infra"],
      "projects": ["Ward 12 Road Repair"],
      "dates": ["2026-02-14"]
    },
    "searchQueries": [
      "Indore Ward 12 road pothole complaint",
      "ABC Infra Indore road contract",
      "Indore Ward 12 tender road repair",
      "Indore road damage news 2026"
    ]
  }
  ```

#### [NEW] `apps/cpgrams-backend/src/ai/agents/triage/triage.schema.js`
- JSON Schema definition for OpenAI structured output validation

#### [NEW] `apps/cpgrams-backend/src/ai/agents/triage/triage.prompt.js`
- System prompt: Government grievance classifier for Indian CPGRAMS
- Instructions: Normalize Hinglish/Hindi/English text, extract entities, classify across 15 departments & 34 categories, estimate urgency 0-100, generate 4-6 diverse search query families (direct issue, entity-based, public record, news, regulatory)

### Integration with Existing System

#### [MODIFY] [apps/cpgrams-backend/src/services/autoAssign.js](file:///d:/cpgrams-privacy-layer-zk-identity/apps/cpgrams-backend/src/services/autoAssign.js)
- Add new exported function: `autoAssignWithAI(triageResult)`
  - If `triageResult.classification.confidence >= 0.80`: use AI-recommended department
  - Else: fall back to existing `resolveDepartment(category, description)` keyword matching
- Existing `autoAssign()` and `resolveDepartment()` remain untouched as deterministic fallback
- Officer selection logic unchanged: least-loaded in department, fallback to any

### Verification
- Unit test: Agent 1 processes a sample Hindi/English complaint and returns valid `TriageResult` matching JSON schema
- Integration test: Enqueued job triggers Agent 1, persists result to `AiCaseAnalysis.triage`
- Fallback test: With `AI_TRIAGE_ENABLED=false`, existing `autoAssign.js` keyword routing still works identically
- All existing test suites pass unchanged

---

## Phase 3: Agent 3 — Semantic Quality & Deduplication (Pinecone RAG)

> **Goal**: Move from keyword overlap to semantic understanding. Find truly similar complaints across departments and geographies.

### New Files

#### [NEW] `apps/cpgrams-backend/src/ai/services/embedding.service.js`
- Generates text embeddings via OpenAI `text-embedding-3-small` (1536d)
- Batch embedding support for bulk indexing
- Caching layer to avoid re-embedding identical text

#### [NEW] `apps/cpgrams-backend/src/ai/services/similarity.service.js`
- `indexComplaint(caseId, text, metadata)`: Embeds and upserts to Pinecone namespace `complaints`
- `findSimilar(text, filters, topK)`: Queries Pinecone with metadata filters (department, status, geography)
- Metadata per vector:
  ```json
  {
    "caseId": "CPG-123",
    "departmentId": "PWD",
    "categoryId": "ROAD",
    "status": "received",
    "state": "MP",
    "district": "Indore",
    "createdAt": "2026-08-26",
    "priority": "HIGH"
  }
  ```

#### [NEW] `apps/cpgrams-backend/src/ai/agents/quality/quality.agent.js`
- Input: `{ caseId, description, category, triageResult, pairwiseId }`
- Step 1: Embed complaint → Pinecone query (top 10, exclude same caseId, prefer same/related department + recent + open)
- Step 2: OpenAI reranking — classify each result as `DUPLICATE`, `RELATED`, `POSSIBLY_RELATED`, `UNRELATED`
- Step 3: Quality assessment — completeness, specificity, location, evidence, timeframe, actionability
- Output (`QualityResult`):
  ```json
  {
    "qualityScore": 82,
    "isActionable": true,
    "missingInformation": ["Exact GPS coordinates"],
    "duplicateRisk": 0.14,
    "relatedCases": [
      { "caseId": "CPG-82719", "similarity": 0.92, "relationship": "DUPLICATE", "confidence": 0.88 },
      { "caseId": "CPG-29381", "similarity": 0.87, "relationship": "RELATED", "confidence": 0.91 }
    ]
  }
  ```

#### [NEW] `apps/cpgrams-backend/src/ai/agents/quality/quality.schema.js`
#### [NEW] `apps/cpgrams-backend/src/ai/agents/quality/quality.prompt.js`

### Integration with Existing System

#### Existing `duplicateDetect.js` is NOT replaced
- It continues to power the real-time `GET /grievance/suggestions` endpoint during form filling (synchronous, fast, no AI dependency)
- Agent 3 runs asynchronously post-submission for deeper semantic analysis
- Two layers: instant keyword suggestions → deep semantic deduplication

#### [MODIFY] Worker orchestrator
- After Agent 1 completes, index the complaint embedding in Pinecone
- Run Agent 3 with triage context for richer similarity search

### Verification
- Unit test: Embedding service generates 1536-dimensional vectors
- Unit test: Pinecone upsert and query return expected results
- Integration test: Similar complaints (paraphrased text) score > 0.85 similarity
- Integration test: Unrelated complaints score < 0.40
- Existing `duplicateDetect.js` tests pass unchanged

---

## Phase 4: Agent 2 — Document Intelligence

> **Goal**: Every uploaded file is automatically classified, analyzed for relevance, and entities extracted — before the officer opens the case.

### New Files

#### [NEW] `apps/cpgrams-backend/src/ai/agents/documents/document.agent.js`
- Input: `{ caseId, documentId, filePath, mimeType, originalName, triageContext }`
- For images/photos: OpenAI Vision API (`gpt-5.6-luna`) — scene understanding, text extraction, document type detection
- For PDFs: Text extraction first, then OpenAI analysis
- Output (`DocumentAnalysisResult`):
  ```json
  {
    "documentId": "DOC-123",
    "documentType": "Work Order",
    "language": "en",
    "isRelevant": true,
    "relevanceScore": 0.93,
    "supportsComplaint": true,
    "supportingClaims": [
      "Road repair contract was issued to ABC Infra",
      "Contract date matches complaint timeframe"
    ],
    "extractedText": "...",
    "detectedEntities": {
      "contractor": "ABC Infra",
      "project": "Ward 12 Road Repair",
      "amount": "₹45,00,000",
      "date": "2026-02-14"
    },
    "flags": [],
    "confidence": 0.91
  }
  ```
- **Explicit limitation**: Agent classifies relevance and extracts information. It does NOT determine authenticity — that remains the officer's legal responsibility.

#### [NEW] `apps/cpgrams-backend/src/ai/agents/documents/document.schema.js`
#### [NEW] `apps/cpgrams-backend/src/ai/agents/documents/document.prompt.js`

### Integration
- Worker orchestrator runs Agent 2 for each document attached to the case
- Results stored in `AiCaseAnalysis.documentAnalysis[]` array
- Runs in parallel with Agent 3 (no dependency between them)

### Verification
- Unit test: Image of a government notice → correct document type classification
- Unit test: PDF work order → correct entity extraction (contractor, amount, date)
- Unit test: Irrelevant image (selfie) → `isRelevant: false`, low relevance score
- Existing document upload/download routes unchanged

---

## Phase 5: Agent 5 — Autonomous Evidence Enrichment Engine

> **Goal**: The innovation showcase. Automatically discover, verify, score, and snapshot public evidence that corroborates or contextualizes the grievance.

### New Files

#### [NEW] `apps/cpgrams-backend/src/ai/agents/evidence/evidence.agent.js`
- **Scope Control First**: Not every complaint needs web search
  - Useful: infrastructure, corruption, public project, environmental, contractor, govt scheme
  - Skip: personal dispute, password issue, simple service request
  - OpenAI determines if external evidence is useful (fast model, binary decision)
- **Search Strategy** (when useful):
  - OpenAI generates 4-6 diverse search queries from Agent 1's `searchQueries` + entities
  - Query families: Direct issue, Entity-based, Public record, News, Regulatory
- **Tavily Execution**:
  - Execute queries with `search_depth: "advanced"`, `max_results: 5` per query
  - Deduplicate by URL across queries
- **Source Trust Scoring**:
  - `.gov.in` / `.nic.in` → `GOVERNMENT` (credibility 0.90-0.98)
  - Established news domains → `NEWS` (credibility 0.75-0.90)
  - Academic / NGO → `ACADEMIC` / `NGO` (credibility 0.70-0.85)
  - General web → `GENERAL` (credibility 0.30-0.60)
- **Evidence Scoring Formula**:
  $$\text{Confidence} = 0.40 \times \text{Relevance} + 0.25 \times \text{Credibility} + 0.15 \times \text{GeoMatch} + 0.10 \times \text{TemporalMatch} + 0.10 \times \text{EntityMatch}$$
- **Cross-Source Corroboration**:
  - If 2+ independent sources mention same entity + location + issue → `CORROBORATION_SIGNAL: HIGH`
  - This is the actual wow factor for judges
- **Snapshot**: For each evidence item, store `title + url + excerpt + retrievedAt + SHA-256(content)` in `Evidence` collection
- **Security**: Web content is injected as tool-result data, NEVER as system instructions (prompt injection defense)

#### [NEW] `apps/cpgrams-backend/src/ai/agents/evidence/evidence.schema.js`
#### [NEW] `apps/cpgrams-backend/src/ai/agents/evidence/evidence.prompt.js`
#### [NEW] `apps/cpgrams-backend/src/ai/services/evidenceRanker.js`
- Source credibility heuristic engine
- Cross-source corroboration detector
- Evidence confidence calculator

### Verification
- Unit test: Infrastructure complaint → generates relevant search queries
- Unit test: Personal dispute complaint → skips web search (`SKIPPED`)
- Integration test: Tavily returns results → Evidence documents created with scores
- Integration test: `.gov.in` source scores higher than random blog
- Security test: Web content containing prompt injection text is treated as data, not instructions

---

## Phase 6: Agent 4 — Intelligent Assignment & Notifications

> **Goal**: AI recommends the optimal officer based on workload, jurisdiction, category expertise, and SLA risk — but a deterministic validator makes the final decision.

### New Files

#### [NEW] `apps/cpgrams-backend/src/ai/agents/assignment/assignment.agent.js`
- Input: `{ caseId, triageResult, qualityResult, currentOfficerAssignment }`
- Evaluates:
  - Department match (from Agent 1 classification)
  - Officer workload (`currentCaseCount`)
  - Geographic jurisdiction alignment
  - Category expertise
  - SLA risk (officer's historical resolution time)
- Output (`AssignmentResult`):
  ```json
  {
    "recommendedDepartment": "PWD",
    "recommendedOfficerId": "PWD-001",
    "reason": ["Correct department", "Handles road infrastructure", "Low active workload", "District match"],
    "confidence": 0.91,
    "currentOfficerValid": true
  }
  ```
- **Critical design**: AI recommends, deterministic `autoAssign.js` validates and executes. If AI recommendation passes validation rules (department match, officer available, jurisdiction match), use it. Otherwise fall back to rule-based assignment.

#### [NEW] `apps/cpgrams-backend/src/ai/agents/assignment/assignment.schema.js`
#### [NEW] `apps/cpgrams-backend/src/ai/agents/assignment/assignment.prompt.js`

#### [NEW] `apps/cpgrams-backend/src/ai/services/briefGenerator.js`
- Takes outputs from all 5 agents and synthesizes a human-readable **AI Case Intelligence Brief**:
  ```
  CASE INTELLIGENCE BRIEF — CPG-8A19F2
  ─────────────────────────────────────
  Complaint: Road damage in Ward 12, Indore. Contractor XYZ received payment but repair not completed.
  Priority: HIGH (Score: 87/100)
  Reasons: Public safety risk · Similar complaints detected · Contractor identified in public records
  ─────────────────────────────────────
  Related Cases: 3 found (92%, 87%, 82% similarity)
  Documents: 2 relevant (Work Order, Site Photo) · 0 flagged
  Public Evidence: 4 sources discovered (Gov 96%, News 88%, Tender 83%, Inspection 79%)
  Cross-Source Corroboration: HIGH — Same contractor + ward + project across 3 independent sources
  ─────────────────────────────────────
  Recommended Action: Inspect site and verify contractor work order completion status.
  AI Confidence: 87%
  ─────────────────────────────────────
  IMPORTANT: External sources do not establish legal truth. Officer verification required.
  ```
- Stored as `AiCaseAnalysis.caseBrief`

### Verification
- Unit test: AI recommends officer that matches department + low workload
- Integration test: Full pipeline (Agent 1→2→3→5→4→Brief) completes for a sample case
- Fallback test: With AI disabled, existing `autoAssign.js` routing works identically
- Brief generation test: All agent outputs synthesized into readable brief

---

## Phase 7: AI Intelligence APIs & Officer Experience

> **Goal**: Expose AI analysis results to the frontend. Transform the officer case page from a passive form into an AI-augmented investigation desk.

### New Backend Routes

#### [NEW] `apps/cpgrams-backend/src/routes/aiAnalysis.js`
Routes (all require `requireOfficer` middleware):
- `GET /grievance/:caseId/ai-analysis` — Full `AiCaseAnalysis` document for the case
- `GET /grievance/:caseId/ai-timeline` — Ordered `AiAgentRun` records showing pipeline execution trace with latency per agent
- `GET /grievance/:caseId/evidence` — All `Evidence` documents discovered by Agent 5
- `GET /grievance/:caseId/similar` — Related cases from Agent 3's Pinecone results
- `GET /grievance/:caseId/documents/:docId/analysis` — Agent 2's analysis for a specific document
- `POST /grievance/:caseId/ai/reprocess` — Re-trigger AI pipeline for a case (admin/debug)

Citizen-facing (requires `verifyToken`):
- `GET /grievance/:caseId/ai-status` — Simplified AI processing status for citizen case page:
  ```json
  {
    "status": "completed",
    "summary": {
      "qualityScore": 82,
      "relatedCasesFound": 3,
      "documentsAnalyzed": 2,
      "evidenceSourcesFound": 4
    }
  }
  ```
  (No internal scores, no search queries, no raw agent outputs exposed to citizens)

#### [MODIFY] [apps/cpgrams-backend/src/app.js](file:///d:/cpgrams-privacy-layer-zk-identity/apps/cpgrams-backend/src/app.js)
- Mount `aiAnalysis` routes: `app.use('/', aiAnalysisRoutes)`

### Frontend Changes

#### [MODIFY] [apps/frontend/app/officer/case/[caseId]/page.tsx](file:///d:/cpgrams-privacy-layer-zk-identity/apps/frontend/app/officer/case/%5BcaseId%5D/page.tsx)
Add new sections above existing case details:

1. **AI Case Intelligence Brief Card** (top of page, prominent):
   - Priority badge (HIGH/MEDIUM/LOW with color)
   - Quality Score gauge (0-100)
   - Duplicate Risk percentage
   - Evidence count badge
   - Full brief text in clean monospace block
   - "AI analysis partially completed" warning state for `status: 'partial'`
   - "AI analysis in progress" spinner for `status: 'processing'`

2. **AI Pipeline Execution Timeline**:
   ```
   ✓ Triage completed          1.2s
   ✓ Document analysis          2.8s
   ✓ Duplicate search           0.9s
   ✓ Evidence enrichment        4.1s
   ✓ Assignment recommendation  0.4s
   ```

3. **Related Complaints Panel**:
   - Cards showing similar cases with similarity %, relationship type, excerpt

4. **Document Intelligence Panel**:
   - Per-document: type classification, relevance score, extracted entities, supporting claims

5. **External Evidence Panel**:
   - Evidence cards with source domain, credibility badge, relevance score, excerpt, and "Open Source" link
   - Cross-source corroboration signal banner

6. **AI Assignment Recommendation** (if different from current):
   - "AI recommends Officer PWD-002 (lower workload, jurisdiction match)"

#### [NEW] `apps/frontend/components/AiCaseBrief.tsx`
- Renders the intelligence brief with priority badge, quality gauge, and evidence summary

#### [NEW] `apps/frontend/components/AiPipelineTimeline.tsx`
- Visual step-by-step execution trace with status icons and latency

#### [NEW] `apps/frontend/components/EvidenceCard.tsx`
- Individual evidence source card with credibility badge, relevance bar, excerpt

#### [NEW] `apps/frontend/components/SimilarCasesList.tsx`
- Related cases list with similarity percentages and relationship badges

#### [MODIFY] [apps/frontend/app/case/[caseId]/page.tsx](file:///d:/cpgrams-privacy-layer-zk-identity/apps/frontend/app/case/%5BcaseId%5D/page.tsx)
- Add citizen-facing AI status section (simplified):
  ```
  AI Case Verification
  ✓ 2 submitted documents analyzed
  ✓ 3 similar public complaints found
  ✓ 4 related public information sources discovered
  Your complaint is ready for officer review.
  ```

#### [MODIFY] [apps/frontend/app/grievance/new/page.tsx](file:///d:/cpgrams-privacy-layer-zk-identity/apps/frontend/app/grievance/new/page.tsx)
- After successful submission, show AI processing status:
  ```
  Complaint Registered: CPG-8A19F2
  ✓ Complaint registered
  ◌ AI is analyzing your complaint...
  ◌ Checking submitted evidence
  ◌ Searching related complaints
  ◌ Discovering public information
  ◌ Preparing case brief for officer
  ```

### Verification
- Officer case page loads AI brief, evidence cards, similar cases, document analysis
- Citizen case page shows simplified AI status
- Grievance submission shows AI processing progress
- Pages gracefully handle `AI_ENABLED=false` (sections hidden, not broken)
- Build clean: `npm run build -w apps/frontend`

---

## Phase 8: Officer Accountability & Public Registry

> **Goal**: Bilateral accountability — the system doesn't only record complaints, it measures how institutions respond to them.

### Backend Changes

#### [NEW] `apps/cpgrams-backend/src/models/OfficerMetrics.js`
Mongoose schema — aggregated accountability metrics:
```javascript
{
  officerId:             String (required, unique, indexed),
  totalCasesHandled:     Number (default: 0),
  activeCases:           Number (default: 0),
  resolvedCases:         Number (default: 0),
  overdueCases:          Number (default: 0),       // > 14 days without resolution
  averageResolutionDays: Number (default: 0),
  slaComplianceRate:     Number (default: 0),       // % resolved within 14 days
  citizenSatisfaction:   Number (default: 0),       // Average feedback rating (1-5)
  totalFeedbackCount:    Number (default: 0),
  appealRate:            Number (default: 0),       // % of closed cases that received appeal
  performanceTier:       String (enum: ['A+','A','B','C','NEEDS_ATTENTION']),
  lastUpdated:           Date (default: Date.now)
}
```

#### [MODIFY] [apps/cpgrams-backend/src/routes/officer.js](file:///d:/cpgrams-privacy-layer-zk-identity/apps/cpgrams-backend/src/routes/officer.js)
Add new endpoint:
- `GET /officer/:officerId/scorecard` (public, no auth required):
  - Aggregates from `Case` collection: total handled, active, resolved, overdue (createdAt > 14 days ago and not resolved/disposed)
  - Aggregates from `Feedback` collection: average rating, count
  - Computes SLA compliance (% resolved within 14 days of filing)
  - Computes appeal rate
  - Assigns performance tier:
    - **A+ Exemplary**: SLA ≥ 95% AND satisfaction ≥ 4.5
    - **A On-Track**: SLA ≥ 85% AND satisfaction ≥ 4.0
    - **B Satisfactory**: SLA ≥ 70% AND satisfaction ≥ 3.5
    - **C Needs Improvement**: SLA ≥ 50%
    - **Needs Attention**: SLA < 50%
  - Returns `OfficerMetrics` JSON (no `passwordHash`, no PII, no citizen data)

#### [MODIFY] [apps/cpgrams-backend/src/routes/master.js](file:///d:/cpgrams-privacy-layer-zk-identity/apps/cpgrams-backend/src/routes/master.js)
Add new endpoint:
- `GET /master/officers/public-registry` (public):
  - Returns all officers with their scorecard metrics, department, designation
  - Sortable by SLA compliance, satisfaction rating, case volume
  - Filterable by department
  - Excludes `passwordHash`, `_id`, `__v`

### Frontend Changes

#### [NEW] `apps/frontend/app/officers/page.tsx`
**Public Officer Accountability Registry** page:
- Search bar (by name, department, designation)
- Department filter tabs
- Sort by: SLA Compliance, Citizen Rating, Cases Handled, Avg Resolution Time
- Officer cards showing:
  - Name, Department, Designation, Level badge
  - Performance Tier badge (A+/A/B/C with color coding)
  - SLA Compliance % with progress bar
  - Avg Resolution Time (days)
  - Citizen Satisfaction ★ rating
  - Active / Resolved / Overdue case counts
- Click to expand: historical performance detail

#### [NEW] `apps/frontend/components/OfficerScorecard.tsx`
- Reusable scorecard component for officer profile pages
- Radial gauge for SLA compliance
- Star rating display for citizen satisfaction
- Performance tier badge with tooltip explanation

#### [MODIFY] [apps/frontend/app/page.tsx](file:///d:/cpgrams-privacy-layer-zk-identity/apps/frontend/app/page.tsx)
Add **Bilateral Accountability** section to landing page:
- Two-pillar layout:
  - **Pillar 1: Citizen Protection** — 100% Identity Shield, Masked Chat, Zero Retaliation, Court-Only Disclosure
  - **Pillar 2: Officer Accountability** — Public Performance Registry, 14-Day SLA Monitoring, Transparent Scorecards, First Appeal Escalation
- Direct CTA link to `/officers` public registry
- Core message: *"The system doesn't only record complaints. It records how institutions respond to them."*

#### [MODIFY] [apps/frontend/components/Navbar.tsx](file:///d:/cpgrams-privacy-layer-zk-identity/apps/frontend/components/Navbar.tsx)
- Add "Officer Registry" link to main navigation pointing to `/officers`

---

## Security Architecture (Enforced Across All Phases)

### What AI Agents NEVER Receive
- Aadhaar numbers, phone numbers, email addresses, exact citizen identity
- Internal authentication tokens or OIDC secrets
- SSO database connection strings or Prisma client access

### What AI Agents Receive
- Anonymized complaint text (via `caseId`, never `pairwiseId` in prompts)
- Public-facing category, department, location entities
- Document content (when analyzing uploaded evidence)
- Tavily web search results (as untrusted data, never as system instructions)

### Prompt Injection Defense
- All web content from Tavily is injected as `tool_result` / data context
- System instructions are always separate from retrieved content
- LLM output is validated against JSON schemas before persistence

### Failure Isolation
- AI failure never blocks complaint creation (async queue)
- Partial agent failures result in `status: 'partial'`, not data loss
- Dead letter queue captures permanently failed jobs for manual review
- Every agent run logged with input/output/latency/cost for full auditability

---

## File Structure (What Gets Created)

```
apps/cpgrams-backend/
├── src/
│   ├── ai/
│   │   ├── integrations/
│   │   │   ├── openai.client.js          [Phase 1]
│   │   │   ├── pinecone.client.js        [Phase 1]
│   │   │   └── tavily.client.js          [Phase 1]
│   │   ├── agents/
│   │   │   ├── triage/
│   │   │   │   ├── triage.agent.js       [Phase 2]
│   │   │   │   ├── triage.schema.js      [Phase 2]
│   │   │   │   └── triage.prompt.js      [Phase 2]
│   │   │   ├── quality/
│   │   │   │   ├── quality.agent.js      [Phase 3]
│   │   │   │   ├── quality.schema.js     [Phase 3]
│   │   │   │   └── quality.prompt.js     [Phase 3]
│   │   │   ├── documents/
│   │   │   │   ├── document.agent.js     [Phase 4]
│   │   │   │   ├── document.schema.js    [Phase 4]
│   │   │   │   └── document.prompt.js    [Phase 4]
│   │   │   ├── evidence/
│   │   │   │   ├── evidence.agent.js     [Phase 5]
│   │   │   │   ├── evidence.schema.js    [Phase 5]
│   │   │   │   └── evidence.prompt.js    [Phase 5]
│   │   │   └── assignment/
│   │   │       ├── assignment.agent.js   [Phase 6]
│   │   │       ├── assignment.schema.js  [Phase 6]
│   │   │       └── assignment.prompt.js  [Phase 6]
│   │   ├── services/
│   │   │   ├── embedding.service.js      [Phase 3]
│   │   │   ├── similarity.service.js     [Phase 3]
│   │   │   ├── evidenceRanker.js         [Phase 5]
│   │   │   └── briefGenerator.js         [Phase 6]
│   │   ├── queue/
│   │   │   └── grievanceQueue.js         [Phase 1]
│   │   └── workers/
│   │       └── grievanceIntelligence.worker.js  [Phase 1]
│   ├── config/
│   │   ├── db.js                         (existing)
│   │   ├── redis.js                      [Phase 1]
│   │   └── aiConfig.js                   [Phase 1]
│   ├── models/
│   │   ├── AiCaseAnalysis.js             [Phase 1]
│   │   ├── AiAgentRun.js                 [Phase 1]
│   │   ├── Evidence.js                   [Phase 1]
│   │   └── OfficerMetrics.js             [Phase 8]
│   └── routes/
│       └── aiAnalysis.js                 [Phase 7]

apps/frontend/
├── app/
│   └── officers/
│       └── page.tsx                      [Phase 8]
└── components/
    ├── AiCaseBrief.tsx                   [Phase 7]
    ├── AiPipelineTimeline.tsx            [Phase 7]
    ├── EvidenceCard.tsx                  [Phase 7]
    ├── SimilarCasesList.tsx              [Phase 7]
    └── OfficerScorecard.tsx              [Phase 8]
```

---

## Open Questions

> [!IMPORTANT]
> **Redis Provider**: Do you want to use a local Redis instance (requires installation) or a managed Redis cloud service (e.g. Upstash, Redis Cloud)? Upstash has a free tier that works for hackathon demos.

> [!IMPORTANT]
> **Pinecone Index**: Have you already created the Pinecone index? If so, what's the index name and environment? If not, I'll create it programmatically on first boot.

> [!IMPORTANT]
> **API Keys Ready**: Do you have `OPENAI_API_KEY`, `PINECONE_API_KEY`, and `TAVILY_API_KEY` ready? The system is designed to work with `AI_ENABLED=false` as a complete fallback, so we can build and test the infrastructure even without keys initially.

> [!NOTE]
> **Build Order Optimization**: Phases 1→2 are foundational. Phases 3, 4, 5 can run in parallel once Phase 2 is done. Phase 6 depends on all agents. Phase 7 (UI) can start as soon as Phase 2 produces data. Phase 8 (Accountability) is independent and can run anytime.

---

## Verification Plan

### Automated Tests
```bash
# All existing tests must continue passing (zero regression)
npm test -w apps/sso-server          # 16 tests
npm test -w apps/cpgrams-backend     # 11 test suites

# New AI agent tests
node --test apps/cpgrams-backend/tests/ai/*.test.js

# Frontend build
npm run build -w apps/frontend
```

### Integration Verification
1. File a grievance → verify `aiAnalysis: "QUEUED"` in response
2. Check Redis queue → job appears
3. Wait for worker → `AiCaseAnalysis` created with `status: completed`
4. Open officer case page → AI brief, evidence cards, similar cases visible
5. Open `/officers` → public accountability registry with scorecard metrics
6. Toggle `AI_ENABLED=false` → entire system works identically to current production (zero regression)

### Demo Flow (Judge Walkthrough)
1. Citizen files "Ward 12 road broken, contractor XYZ paid but no repair"
2. System instantly returns `CPG-XXXXXX` (no wait)
3. Background: AI triages → finds 3 similar complaints → analyzes work order photo → discovers government tender page + news article about same contractor → generates intelligence brief
4. Officer opens case → sees pre-analyzed brief with 87% confidence, 4 corroborating sources, contractor entity match across sources
5. Judge checks `/officers` → sees officer SLA compliance, citizen rating, performance tier
6. The pitch: *"The citizen filed once. The system investigated automatically. The officer is measured publicly."*
