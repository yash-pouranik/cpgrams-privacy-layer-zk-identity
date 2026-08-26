"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Clock3, ExternalLink, MapPin, Sparkles, TriangleAlert, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Triage = {
  normalizedComplaint?: string;
  classification?: { department?: string; category?: string; subcategory?: string; confidence?: number };
  priority?: { level?: string; score?: number };
  entities?: { location?: { city?: string | null; state?: string | null; ward?: string | null; landmark?: string | null } };
};
type Analysis = {
  status: string;
  triage?: Triage | null;
  quality?: { qualityScore?: number; isActionable?: boolean; duplicateRisk?: number; missingInformation?: string[]; relatedCases?: { caseId: string; similarity: number; relationship: string }[] } | null;
  evidenceSummary?: { status?: string; reason?: string; queryCount?: number; resultCount?: number; corroborationSignal?: string } | null;
};
type Evidence = { evidenceId: string; title?: string; url?: string; domain?: string; sourceType?: string; excerpt?: string; evidenceConfidence?: number; status?: string };

const stages = [
  ["queued", "processing", "Queued"], ["triaging", "Triage"],
  ["analyzing_documents", "checking_similar_cases", "Analysis"], ["enriching_evidence", "Evidence"],
  ["assigning", "Routing"], ["completed", "partial", "Complete"],
];

export function AiIntelligencePanel({ caseId, token }: { caseId: string; token: string }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/ai-analysis/${caseId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("unavailable");
        const next = await response.json();
        if (!active) return;
        setAnalysis(next); setUnavailable(false);
        const evidenceResponse = await fetch(`${apiUrl}/grievance/${caseId}/evidence`, { headers: { Authorization: `Bearer ${token}` } });
        if (evidenceResponse.ok && active) setEvidence(await evidenceResponse.json());
        if (!["completed", "partial", "failed"].includes(next.status)) timer = setTimeout(load, 3000);
      } catch { if (active) setUnavailable(true); }
    };
    if (caseId && token) load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [caseId, token]);

  const status = analysis?.status || "queued";
  const current = Math.max(0, stages.findIndex((stage) => stage.slice(0, -1).includes(status)));
  const triage = analysis?.triage;
  const quality = analysis?.quality;
  const evidenceSummary = analysis?.evidenceSummary;
  const qualityScore = typeof quality?.qualityScore === "number"
    ? Math.round(Math.max(0, Math.min(100, quality.qualityScore <= 1 ? quality.qualityScore * 100 : quality.qualityScore)))
    : null;
  const location = triage?.entities?.location;
  const locationLabel = [location?.city, location?.state, location?.ward ? `Ward ${location.ward}` : null, location?.landmark].filter(Boolean).join(", ");

  return (
    <Card className="border-indigo-200 bg-white shadow-sm">
      <CardHeader className="border-b border-indigo-100 bg-indigo-50/50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-indigo-950"><Sparkles className="h-4 w-4 text-indigo-600" /> AI Grievance Intelligence</CardTitle>
          <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700"><Activity className="mr-1 h-3 w-3" /> {status.replace(/_/g, " ")}</Badge>
        </div>
        <p className="text-xs text-indigo-900/70">Automated screening runs after registration. Your identity is never sent to the AI layer.</p>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          {stages.map((stage, index) => {
            const complete = status === "completed" || status === "partial" ? index < stages.length - 1 : index < current;
            const active = index === current;
            return <div key={stage.at(-1)} className="space-y-1.5"><div className={`h-1.5 rounded-full ${complete ? "bg-emerald-500" : active ? "bg-indigo-600" : "bg-gray-200"}`} /><div className={`flex items-center gap-1 text-[10px] font-semibold ${active ? "text-indigo-700" : complete ? "text-emerald-700" : "text-gray-400"}`}>{complete ? <CheckCircle2 className="h-3 w-3" /> : active ? <Clock3 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />}{stage.at(-1)}</div></div>;
          })}
        </div>
        {unavailable && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><TriangleAlert className="h-4 w-4" /> AI status is temporarily unavailable. Your grievance remains active.</div>}
        {triage ? <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-gray-50 p-3"><p className="text-[10px] font-semibold uppercase text-gray-500">Recommended department</p><p className="mt-1 text-sm font-bold">{triage.classification?.department || "Human review"}</p></div>
            <div className="rounded-lg border bg-gray-50 p-3"><p className="text-[10px] font-semibold uppercase text-gray-500">Issue category</p><p className="mt-1 text-sm font-bold">{triage.classification?.category || "General grievance"}</p></div>
            <div className="rounded-lg border bg-gray-50 p-3"><p className="text-[10px] font-semibold uppercase text-gray-500">Priority</p><p className="mt-1 flex items-center gap-2 text-sm font-bold">{triage.priority?.level || "REVIEW"}{typeof triage.priority?.score === "number" && <Badge className="bg-amber-100 text-amber-800">{triage.priority.score}/100</Badge>}</p></div>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3"><p className="text-[10px] font-semibold uppercase text-indigo-700">What triage did</p><p className="mt-1 text-sm leading-relaxed text-gray-800">{triage.normalizedComplaint || "Complaint was normalized for routing."}</p></div>
          <div className="flex flex-wrap gap-2">{locationLabel && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{locationLabel}</Badge>}{triage.classification?.subcategory && <Badge variant="outline">{triage.classification.subcategory}</Badge>}{typeof triage.classification?.confidence === "number" && <Badge variant="outline">Confidence {Math.round(triage.classification.confidence * 100)}%</Badge>}</div>
          {quality && <div className="border-t border-gray-100 pt-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Semantic quality review</p><div className="flex flex-wrap gap-2"><Badge variant="outline">Quality {qualityScore ?? "-"}/100</Badge><Badge variant="outline">{quality.isActionable ? "Actionable" : "Needs more detail"}</Badge><Badge variant="outline">Duplicate risk {Math.round((quality.duplicateRisk || 0) * 100)}%</Badge>{(quality.relatedCases?.length || 0) > 0 && <Badge variant="outline">{quality.relatedCases?.length} related case(s)</Badge>}</div>{quality.missingInformation?.length ? <p className="mt-2 text-xs text-gray-600">Additional details that may help: {quality.missingInformation.join(", ")}</p> : null}</div>}
          {evidenceSummary && <div className="border-t border-gray-100 pt-4"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Public-source research</p><Badge variant="outline">{evidenceSummary.status || "PROCESSING"}</Badge></div><div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline">{evidenceSummary.queryCount || 0} quer{evidenceSummary.queryCount === 1 ? "y" : "ies"}</Badge><Badge variant="outline">{evidenceSummary.resultCount || evidence.length} source{(evidenceSummary.resultCount || evidence.length) === 1 ? "" : "s"}</Badge>{evidenceSummary.corroborationSignal && <Badge variant="outline">Corroboration {evidenceSummary.corroborationSignal}</Badge>}</div>{evidence.length > 0 ? <div className="space-y-2">{evidence.map((source) => <div key={source.evidenceId} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-slate-900">{source.title || "Untitled source"}</p><p className="mt-0.5 text-[11px] text-slate-500">{source.domain || "Unknown domain"} · {source.sourceType || "GENERAL"}</p></div>{source.url && <a href={source.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-indigo-700" aria-label={`Open ${source.title || "source"}`}><ExternalLink className="h-3.5 w-3.5" /></a>}</div>{source.excerpt && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-700">{source.excerpt}</p>}<div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">Confidence {Math.round((source.evidenceConfidence || 0) * 100)}%</Badge><Badge variant="outline">{(source.status || "REVIEW_PENDING").replace(/_/g, " ")}</Badge></div></div>)}</div> : <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{evidenceSummary.reason || "No public sources were returned for this grievance."}</p>}<p className="mt-2 text-[11px] leading-relaxed text-slate-500">Sources provide context only and do not establish legal truth. Officer verification is required.</p></div>}
        </div> : status === "failed" ? <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"><XCircle className="h-4 w-4" /> Automated analysis could not complete. Human processing is still active.</div> : <div className="flex items-center gap-2 text-xs text-gray-600"><Clock3 className="h-4 w-4 text-indigo-600" /> The system is screening your grievance in the background.</div>}
      </CardContent>
    </Card>
  );
}
