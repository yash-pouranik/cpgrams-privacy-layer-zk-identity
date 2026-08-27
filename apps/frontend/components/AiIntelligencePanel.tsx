"use client";

/**
 * AiIntelligencePanel — Live AI Execution Console
 *
 * Displays the full Drishti AI pipeline as a real-time execution timeline.
 *
 * Data flow:
 * 1. On mount: fetch /ai-analysis/:caseId (snapshot) + /ai-analysis/:caseId/timeline (runs).
 * 2. If pipeline is running: connect to /ai-analysis/:caseId/stream (SSE).
 * 3. SSE events update stage state in real time as agents complete.
 * 4. On page refresh: reconstruct completed stages from persisted AiAgentRun timeline.
 * 5. Polling fallback if SSE fails.
 *
 * Safety:
 * - No raw prompts, no chain-of-thought, no model internals displayed.
 * - Only auditable execution metadata: status, latency, high-level summaries.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  FileSearch,
  Globe,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  ScanSearch,
  Shield,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ConfirmModal";

// ─── Types ───────────────────────────────────────────────────────────────────

type StageStatus = "queued" | "running" | "completed" | "failed" | "skipped";

type TriageSummary = {
  department?: string | null;
  category?: string | null;
  subcategory?: string | null;
  confidence?: number | null;
  priorityLevel?: string | null;
  priorityScore?: number | null;
  location?: { city?: string | null; state?: string | null; ward?: string | null; landmark?: string | null } | null;
  searchQueryCount?: number | null;
  language?: string | null;
  normalizedComplaint?: string | null;
};

type ClusterSummary = {
  qualityScore?: number | null;
  isActionable?: boolean | null;
  duplicateRisk?: number | null;
  relatedCaseCount?: number;
  topSimilarity?: number | null;
  missingInformation?: string[];
  relatedCases?: { caseId: string; similarity: number; relationship: string }[];
};

type VisionSummary = {
  documentType?: string | null;
  isRelevant?: boolean | null;
  relevanceScore?: number | null;
  supportsComplaint?: boolean | null;
  supportingClaims?: string[];
  detectedEntities?: Record<string, string | null> | null;
  flags?: string[];
};

type EvidenceSummary = {
  status?: string | null;
  reason?: string | null;
  queryCount?: number | null;
  resultCount?: number | null;
  corroborationSignal?: string | null;
  sourceTypes?: Record<string, number> | null;
};

type RouteSummary = {
  recommendedOfficerId?: string | null;
  recommendedDepartment?: string | null;
  assignmentScore?: number | null;
  confidence?: number | null;
  slaRisk?: number | null;
  assignmentApplied?: boolean | null;
  currentOfficerValid?: boolean | null;
  aiRecommendationAccepted?: boolean | null;
  selectionMethod?: string | null;
  validator?: string | null;
  reason?: string[];
  candidateShortlist?: {
    officerId: string;
    department?: string;
    level?: number;
    assignmentScore?: number;
    slaRisk?: number;
    currentCaseCount?: number;
    averageResolutionDays?: number;
    matchingFactors?: { departmentMatch?: boolean; expertiseMatch?: boolean; jurisdictionMatch?: boolean; workloadScore?: number; prioritySupport?: boolean };
  }[];
};

type AgentRun = {
  runId: string;
  agent: "triage" | "quality" | "document" | "evidence" | "assignment" | "brief";
  status: StageStatus;
  latencyMs?: number | null;
  model?: string | null;
  error?: string | null;
  createdAt?: string;
  summary?: TriageSummary | ClusterSummary | VisionSummary | EvidenceSummary | RouteSummary | { briefGenerated?: boolean } | null;
};

type PipelineAnalysis = {
  status: string;
  caseBrief?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  triage?: { normalizedComplaint?: string } | null;
  quality?: { qualityScore?: number; isActionable?: boolean; duplicateRisk?: number; relatedCases?: { caseId: string; similarity: number; relationship: string }[] } | null;
  evidenceSummary?: EvidenceSummary | null;
  assignment?: RouteSummary | null;
  documentAnalysis?: VisionSummary[] | null;
};

type EvidenceItem = {
  evidenceId: string;
  title?: string;
  url?: string;
  domain?: string;
  sourceType?: string;
  excerpt?: string;
  evidenceConfidence?: number;
  status?: string;
};

// ─── Pipeline stage definitions ───────────────────────────────────────────────

type StageDef = {
  id: string;
  agent: AgentRun["agent"] | null;
  label: string;
  description: string;
  icon: typeof Circle;
};

const PIPELINE_STAGES: StageDef[] = [
  { id: "intake", agent: null, label: "Intake", description: "Complaint registered", icon: Shield },
  { id: "triage", agent: "triage", label: "Drishti-Triage", description: "Classification & priority", icon: ScanSearch },
  { id: "cluster", agent: "quality", label: "Drishti-Cluster", description: "Semantic quality & duplicates", icon: Layers },
  { id: "vision", agent: "document", label: "Drishti-Vision", description: "Document intelligence", icon: FileSearch },
  { id: "evidence", agent: "evidence", label: "Drishti-Evidence", description: "Public-source research", icon: Globe },
  { id: "route", agent: "assignment", label: "Drishti-Route", description: "Intelligent assignment", icon: Route },
  { id: "brief", agent: "brief", label: "Drishti-Brief", description: "Executive action brief", icon: Sparkles },
];

const TERMINAL_STATUSES = new Set(["completed", "partial", "failed"]);

// Map AiCaseAnalysis.status → which pipeline stage is currently active
const STATUS_TO_ACTIVE_STAGE: Record<string, string> = {
  queued: "intake",
  processing: "intake",
  triaging: "triage",
  analyzing_documents: "vision",
  checking_similar_cases: "cluster",
  enriching_evidence: "evidence",
  assigning: "route",
  completed: "complete",
  partial: "complete",
  failed: "complete",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms?: number | null): string {
  if (!ms && ms !== 0) return "";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function pct(v?: number | null): string {
  if (v == null) return "—";
  return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
}

function clampScore(v?: number | null): number | null {
  if (v == null) return null;
  return Math.round(v <= 1 ? v * 100 : v);
}

function priorityColor(level?: string | null) {
  switch (level?.toUpperCase()) {
    case "CRITICAL": return "bg-red-600 text-white";
    case "HIGH": return "bg-orange-500 text-white";
    case "MEDIUM": return "bg-amber-500 text-white";
    case "LOW": return "bg-emerald-600 text-white";
    default: return "bg-gray-400 text-white";
  }
}

function sourceTypeBadgeClass(type?: string) {
  switch (type?.toUpperCase()) {
    case "GOVERNMENT": return "border-blue-300 bg-blue-50 text-blue-800";
    case "NEWS": return "border-indigo-300 bg-indigo-50 text-indigo-800";
    case "ACADEMIC": return "border-purple-300 bg-purple-50 text-purple-800";
    case "NGO": return "border-teal-300 bg-teal-50 text-teal-800";
    default: return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function corrobBadgeClass(signal?: string | null) {
  switch (signal?.toUpperCase()) {
    case "HIGH": return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "MEDIUM": return "bg-amber-100 text-amber-800 border-amber-300";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StageIcon({ status, className = "" }: { status: StageStatus; className?: string }) {
  const base = `w-4 h-4 shrink-0 ${className}`;
  switch (status) {
    case "completed": return <CheckCircle2 className={`${base} text-emerald-600`} />;
    case "failed": return <XCircle className={`${base} text-red-500`} />;
    case "skipped": return <AlertTriangle className={`${base} text-amber-500`} />;
    case "running": return (
      <span className={`${base} relative flex`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600" />
      </span>
    );
    default: return <Circle className={`${base} text-gray-300`} />;
  }
}

// ─── Per-agent detail renderers ───────────────────────────────────────────────

function TriageDetail({ summary }: { summary: TriageSummary }) {
  const loc = summary.location;
  const locStr = [loc?.ward ? `Ward ${loc.ward}` : null, loc?.city, loc?.state, loc?.landmark].filter(Boolean).join(", ");
  return (
    <div className="space-y-3 text-xs">
      {summary.normalizedComplaint && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed text-gray-700 italic">
          &ldquo;{summary.normalizedComplaint}&rdquo;
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {summary.department && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Department</p>
            <p className="font-bold text-gray-900">{summary.department}</p>
          </div>
        )}
        {summary.category && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Category</p>
            <p className="font-bold text-gray-900">{summary.category}</p>
            {summary.subcategory && <p className="text-[10px] text-gray-500 mt-0.5">{summary.subcategory}</p>}
          </div>
        )}
        {summary.priorityLevel && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Priority</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityColor(summary.priorityLevel)}`}>
                {summary.priorityLevel}
              </span>
              {summary.priorityScore != null && (
                <span className="text-[11px] font-semibold text-gray-700">{summary.priorityScore}/100</span>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {locStr && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
            <MapPin className="w-3 h-3 text-indigo-500" /> {locStr}
          </span>
        )}
        {summary.confidence != null && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
            Confidence {Math.round(summary.confidence * 100)}%
          </span>
        )}
        {summary.searchQueryCount != null && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
            <Zap className="w-3 h-3 text-indigo-500" /> {summary.searchQueryCount} search {summary.searchQueryCount === 1 ? "query" : "queries"} generated
          </span>
        )}
        {summary.language && summary.language !== "en" && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
            Lang: {summary.language}
          </span>
        )}
      </div>
    </div>
  );
}

function ClusterDetail({ summary }: { summary: ClusterSummary }) {
  const qs = clampScore(summary.qualityScore);
  const dup = summary.duplicateRisk;
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {qs != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Quality</p>
            <p className="font-bold text-gray-900 text-sm">{qs}<span className="text-gray-400 text-xs font-normal">/100</span></p>
          </div>
        )}
        {dup != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Dup. Risk</p>
            <p className="font-bold text-gray-900 text-sm">{pct(dup)}</p>
          </div>
        )}
        {summary.relatedCaseCount != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Related</p>
            <p className="font-bold text-gray-900 text-sm">{summary.relatedCaseCount} case{summary.relatedCaseCount === 1 ? "" : "s"}</p>
          </div>
        )}
        {summary.topSimilarity != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Top Match</p>
            <p className="font-bold text-gray-900 text-sm">{pct(summary.topSimilarity)}</p>
          </div>
        )}
      </div>
      {summary.isActionable != null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${summary.isActionable ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {summary.isActionable ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span className="font-semibold">{summary.isActionable ? "Actionable — ready for officer review" : "Needs more detail before routing"}</span>
        </div>
      )}
      {(summary.relatedCases?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide">Related cases found</p>
          {summary.relatedCases!.map((c) => (
            <div key={c.caseId} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="font-mono text-[11px] text-gray-800 font-semibold">{c.caseId}</span>
              <div className="flex gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">{pct(c.similarity)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600">{c.relationship}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {(summary.missingInformation?.length ?? 0) > 0 && (
        <p className="text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <span className="font-semibold text-amber-800">May benefit from:</span> {summary.missingInformation!.join(", ")}
        </p>
      )}
    </div>
  );
}

function VisionDetail({ summaries, docCount }: { summaries: VisionSummary[]; docCount: number }) {
  if (docCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500 bg-gray-50">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        No documents were attached to this grievance.
      </div>
    );
  }
  return (
    <div className="space-y-2 text-xs">
      <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide">{docCount} document{docCount === 1 ? "" : "s"} analyzed</p>
      {summaries.map((s, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-gray-900">{s.documentType || "Document"} #{i + 1}</span>
            <div className="flex gap-1.5 flex-wrap">
              {s.isRelevant != null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.isRelevant ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                  {s.isRelevant ? "Relevant" : "Not relevant"}
                </span>
              )}
              {s.relevanceScore != null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-50 border border-gray-200 text-gray-600">
                  {pct(s.relevanceScore)} relevance
                </span>
              )}
            </div>
          </div>
          {s.supportingClaims && s.supportingClaims.length > 0 && (
            <div className="space-y-1">
              {s.supportingClaims.slice(0, 3).map((claim, j) => (
                <div key={j} className="flex items-start gap-1.5 text-gray-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{claim}</span>
                </div>
              ))}
            </div>
          )}
          {s.detectedEntities && Object.entries(s.detectedEntities).some(([, v]) => v) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(s.detectedEntities).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-800">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
          {s.flags && s.flags.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-semibold">{s.flags.join(", ")}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EvidenceDetail({ summary }: { summary: EvidenceSummary }) {
  if (summary.status === "SKIPPED" || summary.status === "NOT_APPLICABLE") {
    return (
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500 bg-gray-50">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
        <span>{summary.reason || "External evidence search was not applicable for this complaint type."}</span>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-3 gap-2">
        {summary.queryCount != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Queries</p>
            <p className="font-bold text-gray-900 text-sm">{summary.queryCount}</p>
          </div>
        )}
        {summary.resultCount != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Sources found</p>
            <p className="font-bold text-gray-900 text-sm">{summary.resultCount}</p>
          </div>
        )}
        {summary.corroborationSignal && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Corroboration</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${corrobBadgeClass(summary.corroborationSignal)}`}>
              {summary.corroborationSignal}
            </span>
          </div>
        )}
      </div>
      {summary.sourceTypes && Object.keys(summary.sourceTypes).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide mb-1.5">Source breakdown</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.sourceTypes).map(([type, count]) => (
              <span key={type} className={`px-2 py-1 rounded-md border text-[10px] font-semibold ${sourceTypeBadgeClass(type)}`}>
                {type} {count}
              </span>
            ))}
          </div>
        </div>
      )}
      {summary.reason && (
        <p className="text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 italic">{summary.reason}</p>
      )}
    </div>
  );
}

function RouteDetail({ summary }: { summary: RouteSummary }) {
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summary.recommendedOfficerId && (
          <div className="bg-white border border-indigo-100 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Recommended</p>
            <p className="font-mono font-bold text-indigo-950">{summary.recommendedOfficerId}</p>
            {summary.recommendedDepartment && <p className="text-[10px] text-gray-500 mt-0.5">{summary.recommendedDepartment}</p>}
          </div>
        )}
        {summary.assignmentScore != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Policy score</p>
            <p className="font-bold text-gray-900">{Math.round(summary.assignmentScore)}<span className="text-gray-400 text-[10px] font-normal">/130</span></p>
          </div>
        )}
        {summary.confidence != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">AI confidence</p>
            <p className="font-bold text-gray-900">{pct(summary.confidence)}</p>
          </div>
        )}
        {summary.slaRisk != null && (
          <div className="bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-0.5">SLA risk</p>
            <p className="font-bold text-gray-900">{pct(summary.slaRisk)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {summary.assignmentApplied && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Applied by Drishti AI
          </span>
        )}
        {summary.aiRecommendationAccepted === false && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-800">
            <Shield className="w-3 h-3" /> Deterministic policy override
          </span>
        )}
        {summary.validator && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-600">
            Validated by: {summary.validator}
          </span>
        )}
      </div>

      {summary.reason && summary.reason.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide mb-1">Routing basis</p>
          <div className="space-y-1">
            {summary.reason.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-gray-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
        AI recommendation validated by deterministic officer policy. Human officer retains final authority.
      </p>
    </div>
  );
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({
  stage,
  status,
  run,
  latencyMs,
  isActive,
  summaryLine,
  error,
  // vision-specific
  docCount,
  docSummaries,
  // brief
  isBriefCompleted,
}: {
  stage: StageDef;
  status: StageStatus;
  run: AgentRun | null;
  latencyMs?: number | null;
  isActive: boolean;
  summaryLine: string;
  error?: string | null;
  docCount?: number;
  docSummaries?: VisionSummary[];
  isBriefCompleted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = status === "completed" || status === "failed" || status === "skipped";
  const Icon = stage.icon;

  return (
    <div className={`relative rounded-xl border transition-all ${
      isActive ? "border-indigo-300 bg-indigo-50/30" :
      status === "completed" ? "border-gray-200 bg-white" :
      status === "failed" ? "border-red-200 bg-red-50/20" :
      status === "skipped" ? "border-gray-100 bg-gray-50/50" :
      "border-gray-100 bg-white/50"
    }`}>
      <div
        className={`flex items-start gap-3 px-4 py-3 ${hasDetail && status !== "skipped" || (status === "skipped" && stage.agent === "document") ? "cursor-pointer select-none" : ""}`}
        onClick={() => {
          if (hasDetail) setExpanded(v => !v);
        }}
      >
        {/* Status icon column */}
        <div className="flex flex-col items-center pt-0.5 gap-2">
          <StageIcon status={status} />
          {/* Connector line */}
          <div className="w-px h-3 bg-gray-200" style={{ display: stage.id === "brief" ? "none" : undefined }} />
        </div>

        {/* Stage content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${
                status === "completed" ? "text-emerald-600" :
                isActive ? "text-indigo-600" :
                "text-gray-400"
              }`} />
              <span className={`text-xs font-bold tracking-wide ${
                status === "completed" ? "text-gray-900" :
                isActive ? "text-indigo-900" :
                status === "failed" ? "text-red-700" :
                status === "skipped" ? "text-gray-400" :
                "text-gray-400"
              }`}>
                {stage.label}
              </span>
              {status === "running" && (
                <span className="text-[10px] font-semibold text-indigo-600 animate-pulse">ACTIVE</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {latencyMs != null && status === "completed" && (
                <span className="text-[11px] font-mono text-gray-400">{formatMs(latencyMs)}</span>
              )}
              {hasDetail && (
                expanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
          </div>

          <p className={`mt-0.5 text-[11px] leading-relaxed ${
            isActive ? "text-indigo-700" :
            status === "completed" ? "text-gray-600" :
            status === "skipped" ? "text-gray-400" :
            status === "failed" ? "text-red-600" :
            "text-gray-400"
          }`}>
            {error && status === "failed" ? error : summaryLine}
          </p>
        </div>
      </div>

      {/* Expandable detail panel */}
      {expanded && hasDetail && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          {stage.agent === "triage" && run?.summary && (
            <TriageDetail summary={run.summary as TriageSummary} />
          )}
          {stage.agent === "quality" && run?.summary && (
            <ClusterDetail summary={run.summary as ClusterSummary} />
          )}
          {stage.agent === "document" && (
            <VisionDetail summaries={docSummaries || []} docCount={docCount || 0} />
          )}
          {stage.agent === "evidence" && run?.summary && (
            <EvidenceDetail summary={run.summary as EvidenceSummary} />
          )}
          {stage.agent === "assignment" && run?.summary && (
            <RouteDetail summary={run.summary as RouteSummary} />
          )}
          {stage.agent === "brief" && isBriefCompleted && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Executive Action Brief generated — see below
            </div>
          )}
          {status === "failed" && error && (
            <div className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Error: {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tools used panel ─────────────────────────────────────────────────────────

function ToolsUsed({ runs }: { runs: AgentRun[] }) {
  const [expanded, setExpanded] = useState(false);
  const completedAgents = new Set(runs.filter(r => r.status === "completed").map(r => r.agent));
  const evidenceRun = runs.find(r => r.agent === "evidence" && r.status === "completed");
  const evidenceSummary = evidenceRun?.summary as EvidenceSummary | undefined;
  const qualityRun = runs.find(r => r.agent === "quality" && r.status === "completed");
  const qualitySummary = qualityRun?.summary as ClusterSummary | undefined;

  const tools = [
    {
      name: "OpenAI",
      used: completedAgents.size > 0,
      items: [
        completedAgents.has("triage") && "Triage classification",
        completedAgents.has("triage") && "Entity extraction",
        completedAgents.has("quality") && "Semantic reranking",
        completedAgents.has("document") && "Document intelligence",
        completedAgents.has("brief") && "Brief synthesis",
      ].filter(Boolean) as string[],
    },
    {
      name: "Pinecone",
      used: completedAgents.has("quality") && (qualitySummary?.relatedCaseCount != null),
      items: [
        "Semantic case index query",
        qualitySummary?.relatedCaseCount != null
          ? `${qualitySummary.relatedCaseCount} candidate case${qualitySummary.relatedCaseCount === 1 ? "" : "s"} evaluated`
          : null,
      ].filter(Boolean) as string[],
    },
    {
      name: "Tavily",
      used: completedAgents.has("evidence") && (evidenceSummary?.resultCount ?? 0) > 0,
      items: [
        evidenceSummary?.queryCount != null && `${evidenceSummary.queryCount} queries executed`,
        evidenceSummary?.resultCount != null && `${evidenceSummary.resultCount} sources retrieved`,
      ].filter(Boolean) as string[],
    },
    {
      name: "Vision",
      used: completedAgents.has("document"),
      items: ["Document classification", "Entity extraction"],
    },
  ].filter(t => t.used);

  if (tools.length === 0) return null;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-indigo-500" />
          Integrations used ({tools.length})
        </span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tools.map(tool => (
            <div key={tool.name} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase text-gray-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {tool.name}
              </p>
              {tool.items.map((item, i) => (
                <p key={i} className="text-[10px] text-gray-500 pl-4">{item}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Evidence cards ───────────────────────────────────────────────────────────

function EvidenceCards({
  evidence,
  reviewable,
  onReview,
}: {
  evidence: EvidenceItem[];
  reviewable: boolean;
  onReview: (item: EvidenceItem, status: "ACCEPTED" | "REJECTED") => void;
}) {
  if (evidence.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Public source evidence</p>
      {evidence.map(source => (
        <div key={source.evidenceId} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-snug">{source.title || "Untitled source"}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-gray-500 font-mono">{source.domain || "Unknown domain"}</span>
                {source.sourceType && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${sourceTypeBadgeClass(source.sourceType)}`}>
                    {source.sourceType}
                  </span>
                )}
              </div>
            </div>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-indigo-600 hover:text-indigo-800 transition"
                aria-label={`Open ${source.title || "source"}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {source.excerpt && (
            <p className="line-clamp-3 text-xs leading-relaxed text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
              {source.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {source.evidenceConfidence != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[10px] text-gray-600 font-semibold">
                  Confidence {Math.round((source.evidenceConfidence || 0) * 100)}%
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                source.status === "ACCEPTED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                source.status === "REJECTED" ? "border-red-200 bg-red-50 text-red-700" :
                "border-gray-200 bg-gray-50 text-gray-500"
              }`}>
                {(source.status || "REVIEW_PENDING").replace(/_/g, " ")}
              </span>
            </div>
            {reviewable && source.status === "REVIEW_PENDING" && (
              <div className="flex gap-1.5 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onReview(source, "ACCEPTED")}
                  className="h-7 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3 w-3" /> Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(source, "REJECTED")}
                  className="h-7 border-red-200 px-2.5 text-[11px] text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-3 w-3" /> Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-gray-400 leading-relaxed">
        Sources provide context only and do not establish legal truth. Officer verification is required.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiIntelligencePanel({
  caseId,
  token,
  reviewable = false,
}: {
  caseId: string;
  token: string;
  reviewable?: boolean;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Pipeline state
  const [analysis, setAnalysis] = useState<PipelineAnalysis | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // Evidence review state
  const [reviewTarget, setReviewTarget] = useState<{ item: EvidenceItem; status: "ACCEPTED" | "REJECTED" } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isTerminal = (status: string) => ["completed", "partial", "failed"].includes(status);

  // ── Fetch snapshot + timeline (for initial load and page refresh) ──────────
  const fetchSnapshot = useCallback(async () => {
    try {
      const [snapshotRes, timelineRes, evidenceRes] = await Promise.all([
        fetch(`${apiUrl}/ai-analysis/${caseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/ai-analysis/${caseId}/timeline`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/grievance/${caseId}/evidence`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!snapshotRes.ok) throw new Error("unavailable");
      const snap: PipelineAnalysis = await snapshotRes.json();
      setAnalysis(snap);
      setUnavailable(false);
      if (timelineRes.ok) {
        const runs: AgentRun[] = await timelineRes.json();
        setAgentRuns(runs);
      }
      if (evidenceRes.ok) setEvidence(await evidenceRes.json());
      return snap;
    } catch {
      setUnavailable(true);
      return null;
    }
  }, [caseId, token, apiUrl]);

  // ── SSE connection ──────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `${apiUrl}/ai-analysis/${caseId}/stream`;
    // EventSource does not support custom headers; pass token as query param
    // The backend accepts the token via Authorization header for non-SSE.
    // For SSE we fall back to poll if the server requires auth headers.
    // Attempt SSE with credentials. If it fails, polling handles it.
    try {
      const es = new EventSource(url, { withCredentials: false });

      es.onopen = () => setSseConnected(true);

      es.addEventListener("PIPELINE_SNAPSHOT", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (data.analysis) setAnalysis(data.analysis);
          if (data.agentRuns) setAgentRuns(data.agentRuns.map((r: AgentRun) => r));
        } catch { /* ignore parse error */ }
      });

      es.addEventListener("PIPELINE_STATUS", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setAnalysis(prev => prev ? { ...prev, status: data.status } : prev);
        } catch { /* */ }
      });

      const agentEventHandler = (e: Event) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (data.run) {
            setAgentRuns(prev => {
              const idx = prev.findIndex(r => r.agent === data.run.agent);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = data.run;
                return next;
              }
              return [...prev, data.run];
            });
          }
        } catch { /* */ }
      };

      ["AGENT_COMPLETED", "AGENT_FAILED", "AGENT_SKIPPED"].forEach(evt => {
        es.addEventListener(evt, agentEventHandler);
      });

      es.addEventListener("EVIDENCE_FOUND", () => {
        // Re-fetch evidence on discovery
        fetch(`${apiUrl}/grievance/${caseId}/evidence`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setEvidence(data); })
          .catch(() => { /* ignore */ });
      });

      es.addEventListener("PIPELINE_COMPLETED", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (data.analysis) setAnalysis(data.analysis);
          if (data.agentRuns) setAgentRuns(data.agentRuns);
          // Fetch final evidence
          fetch(`${apiUrl}/grievance/${caseId}/evidence`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(ev => { if (ev) setEvidence(ev); })
            .catch(() => { /* ignore */ });
        } catch { /* */ }
        es.close();
        setSseConnected(false);
        eventSourceRef.current = null;
      });

      es.onerror = () => {
        // SSE failed — fall through to polling
        es.close();
        setSseConnected(false);
        eventSourceRef.current = null;
      };

      eventSourceRef.current = es;
    } catch {
      // EventSource not available or failed — polling handles it
      setSseConnected(false);
    }
  }, [caseId, token, apiUrl]);

  // ── Polling fallback ────────────────────────────────────────────────────────
  const pollOnce = useCallback(async () => {
    const snap = await fetchSnapshot();
    if (snap && !isTerminal(snap.status) && !eventSourceRef.current) {
      pollingTimerRef.current = setTimeout(pollOnce, 3000);
    }
  }, [fetchSnapshot]);

  // ── Mount: load snapshot, then connect SSE or fall back to polling ─────────
  useEffect(() => {
    if (!caseId || !token) return;

    let mounted = true;
    fetchSnapshot().then(snap => {
      if (!mounted) return;
      if (snap && !isTerminal(snap.status)) {
        // Pipeline still running — connect SSE for live updates
        connectSSE();
        // Start polling as fallback (stops itself when SSE is active or terminal)
        pollingTimerRef.current = setTimeout(pollOnce, 3500);
      }
    });

    return () => {
      mounted = false;
      if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, [caseId, token, fetchSnapshot, connectSSE, pollOnce]);

  // ── Evidence review ─────────────────────────────────────────────────────────
  const handleEvidenceReview = async () => {
    if (!reviewTarget) return;
    setReviewing(true);
    setReviewError(null);
    try {
      const response = await fetch(`${apiUrl}/officer/case/${caseId}/evidence/${reviewTarget.item.evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: reviewTarget.status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Evidence review could not be completed.");
      setEvidence(current => current.map(item => item.evidenceId === payload.evidenceId ? payload : item));
      setReviewTarget(null);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Evidence review could not be completed.");
    } finally {
      setReviewing(false);
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const status = analysis?.status || "queued";
  const terminal = isTerminal(status);
  const activeStageId = STATUS_TO_ACTIVE_STAGE[status] || "intake";

  // Build a map from agent → AgentRun
  const runsByAgent = new Map<string, AgentRun>();
  for (const run of agentRuns) {
    // If multiple runs for same agent (retries), keep most recent
    const existing = runsByAgent.get(run.agent);
    if (!existing || new Date(run.createdAt || 0) > new Date(existing.createdAt || 0)) {
      runsByAgent.set(run.agent, run);
    }
  }

  // Compute document count from analysis or agent run
  const docSummaries: VisionSummary[] = [];
  if (analysis?.documentAnalysis && Array.isArray(analysis.documentAnalysis)) {
    docSummaries.push(...analysis.documentAnalysis);
  }
  const docRun = runsByAgent.get("document");

  // Compute pipeline total duration
  let totalDurationStr = "";
  if (analysis?.startedAt && analysis?.completedAt) {
    const ms = new Date(analysis.completedAt).getTime() - new Date(analysis.startedAt).getTime();
    totalDurationStr = formatMs(ms);
  }

  // Compute per-stage status
  function getStageStatus(stage: StageDef): StageStatus {
    if (stage.id === "intake") {
      return status === "queued" ? "queued" : "completed";
    }
    if (!stage.agent) return "queued";
    const run = runsByAgent.get(stage.agent);
    if (!run) {
      // No run yet — if this is the active stage, it's running
      if (stage.id === activeStageId) return "running";
      return "queued";
    }
    return run.status as StageStatus;
  }

  function getStageSummaryLine(stage: StageDef, stageStatus: StageStatus): string {
    if (stage.id === "intake") return "Complaint registered";
    if (!stage.agent || stageStatus === "queued") return stage.description;
    if (stageStatus === "running") return "Processing...";
    const run = runsByAgent.get(stage.agent);
    if (!run) return stage.description;

    switch (stage.agent) {
      case "triage": {
        const s = run.summary as TriageSummary;
        const parts: string[] = [];
        if (s?.department) parts.push(s.department);
        if (s?.category) parts.push(s.category);
        if (s?.priorityLevel) parts.push(`Priority ${s.priorityLevel}`);
        return parts.length > 0 ? parts.join(" · ") : "Classification complete";
      }
      case "quality": {
        const s = run.summary as ClusterSummary;
        const parts: string[] = [];
        if (s?.relatedCaseCount != null) parts.push(`${s.relatedCaseCount} related case${s.relatedCaseCount === 1 ? "" : "s"}`);
        if (s?.topSimilarity != null) parts.push(`${pct(s.topSimilarity)} similarity`);
        if (s?.qualityScore != null) parts.push(`Quality ${clampScore(s.qualityScore)}/100`);
        return parts.length > 0 ? parts.join(" · ") : "Semantic analysis complete";
      }
      case "document": {
        if (stageStatus === "skipped") return "No documents were attached to this grievance.";
        const count = docSummaries.length || (docRun?.summary as VisionSummary)?.documentType ? 1 : 0;
        return count > 0 ? `${count} document${count === 1 ? "" : "s"} analyzed` : "Document analysis complete";
      }
      case "evidence": {
        const s = run.summary as EvidenceSummary;
        if (stageStatus === "skipped") return s?.reason || "Not applicable for this complaint type";
        const parts: string[] = [];
        if (s?.resultCount != null) parts.push(`${s.resultCount} sources`);
        if (s?.corroborationSignal) parts.push(`Corroboration: ${s.corroborationSignal}`);
        return parts.length > 0 ? parts.join(" · ") : "Evidence research complete";
      }
      case "assignment": {
        const s = run.summary as RouteSummary;
        const parts: string[] = [];
        if (s?.recommendedOfficerId) parts.push(s.recommendedOfficerId);
        if (s?.assignmentApplied) parts.push("applied");
        if (s?.validator) parts.push(`${s.validator} validated`);
        return parts.length > 0 ? parts.join(" · ") : "Assignment complete";
      }
      case "brief":
        return "Executive action brief generated";
      default:
        return stage.description;
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (unavailable && !analysis) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-3">
        <div className="p-3 bg-gray-100 rounded-xl w-fit mx-auto">
          <ScanSearch className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI analysis temporarily unavailable</p>
          <p className="text-xs text-gray-500 mt-1">
            The grievance is registered and active. Continue with the standard officer workflow.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSnapshot()}
          className="text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScanSearch className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Drishti AI · Grievance Intelligence</h2>
              {!terminal && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
            {terminal ? (
              <p className="text-[11px] text-gray-500">
                Analysis {status === "partial" ? "completed with limited information" : status === "failed" ? "failed" : "completed"}
                {totalDurationStr && ` · ${totalDurationStr} total`}
                {" · "}
                <span className="font-semibold text-gray-700">Intelligence ready for officer review</span>
              </p>
            ) : (
              <p className="text-[11px] text-gray-500">
                Analyzing this grievance across 7 intelligence stages — triage, semantic search, document intelligence, public-source research and policy-based routing.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status === "partial" && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700">
                <AlertTriangle className="w-3 h-3" /> Partial
              </span>
            )}
            {status === "failed" && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-red-200 bg-red-50 text-[10px] font-bold text-red-700">
                <XCircle className="w-3 h-3" /> Failed
              </span>
            )}
            {terminal && status !== "failed" && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Complete
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-[10px] text-gray-400">
          Your identity is never sent to the AI layer. Only anonymized complaint text and public case metadata are processed.
        </p>
      </div>

      {/* ── Pipeline timeline ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
        {PIPELINE_STAGES.map((stage) => {
          const stageStatus = getStageStatus(stage);
          const isActive = stage.id === activeStageId && !terminal;
          const run = stage.agent ? runsByAgent.get(stage.agent) || null : null;
          const summaryLine = getStageSummaryLine(stage, stageStatus);

          return (
            <StageCard
              key={stage.id}
              stage={stage}
              status={stageStatus}
              run={run}
              latencyMs={run?.latencyMs}
              isActive={isActive}
              summaryLine={summaryLine}
              error={run?.error}
              docCount={docSummaries.length}
              docSummaries={docSummaries}
              isBriefCompleted={Boolean(analysis?.caseBrief)}
            />
          );
        })}

        {/* Complete indicator */}
        {terminal && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
            status === "failed" ? "border-red-200 bg-red-50" :
            status === "partial" ? "border-amber-200 bg-amber-50" :
            "border-emerald-200 bg-emerald-50"
          }`}>
            {status === "failed"
              ? <XCircle className="w-4 h-4 text-red-500" />
              : status === "partial"
              ? <AlertTriangle className="w-4 h-4 text-amber-500" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            }
            <span className={`text-xs font-bold ${
              status === "failed" ? "text-red-700" :
              status === "partial" ? "text-amber-700" :
              "text-emerald-700"
            }`}>
              {status === "failed" ? "Pipeline failed — grievance remains active" :
               status === "partial" ? "Pipeline completed with partial results" :
               "Pipeline complete"}
            </span>
            {totalDurationStr && status !== "failed" && (
              <span className="ml-auto text-[11px] font-mono text-gray-400">{totalDurationStr}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Evidence section ──────────────────────────────────────────────── */}
      {(evidence.length > 0 || analysis?.evidenceSummary) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Public-source research
            </p>
            {analysis?.evidenceSummary?.corroborationSignal && (
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${corrobBadgeClass(analysis.evidenceSummary.corroborationSignal)}`}>
                Corroboration: {analysis.evidenceSummary.corroborationSignal}
              </span>
            )}
          </div>
          {reviewError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{reviewError}</div>
          )}
          {evidence.length > 0 ? (
            <EvidenceCards
              evidence={evidence}
              reviewable={reviewable}
              onReview={(item, status) => setReviewTarget({ item, status })}
            />
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">
              {analysis?.evidenceSummary?.reason || "No public sources were returned for this grievance."}
            </p>
          )}
        </div>
      )}

      {/* ── Executive Action Brief ────────────────────────────────────────── */}
      {analysis?.caseBrief && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Executive Action Brief</h3>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">IAS / Nodal Officer summary synthesized from all intelligence stages</p>
          </div>
          <div className="px-5 py-4">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 font-mono bg-gray-50 border border-gray-100 rounded-lg p-4 max-h-80 overflow-auto">
              {analysis.caseBrief}
            </pre>
            <p className="mt-3 text-[10px] leading-relaxed text-gray-400 border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-500">Important:</span> External sources do not establish legal truth. Officer verification is required before any administrative action.
            </p>
          </div>
        </div>
      )}

      {/* ── Tools used ────────────────────────────────────────────────────── */}
      {agentRuns.length > 0 && <ToolsUsed runs={agentRuns} />}

      {/* ── Failed state call-to-action ───────────────────────────────────── */}
      {status === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-700">AI analysis unavailable</p>
            <p className="text-[11px] text-red-600 leading-relaxed">
              The grievance was registered successfully and is fully active. Continue with the standard officer workflow.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSnapshot()}
              className="mt-2 text-xs flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* ── Availability warning ──────────────────────────────────────────── */}
      {unavailable && analysis && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          AI status temporarily unavailable. Your grievance remains active and the last known state is shown above.
        </div>
      )}

      {/* ── Loading indicator ─────────────────────────────────────────────── */}
      {!terminal && !analysis && !unavailable && (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          Loading AI pipeline state...
        </div>
      )}

      {/* ── Evidence review confirmation ──────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        onConfirm={handleEvidenceReview}
        loading={reviewing}
        title={`${reviewTarget?.status === "ACCEPTED" ? "Accept" : "Reject"} evidence source?`}
        icon={reviewTarget?.status === "ACCEPTED" ? "success" : "warning"}
        variant={reviewTarget?.status === "ACCEPTED" ? "success" : "warning"}
        confirmText={reviewTarget?.status === "ACCEPTED" ? "Accept Source" : "Reject Source"}
        description={
          <p>
            Record your decision for <strong>{reviewTarget?.item.title || "this source"}</strong>.
            This action will be added to the immutable audit trail.
          </p>
        }
      />
    </div>
  );
}
