"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, FileSearch, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DocumentAnalysis = {
  documentType?: string;
  language?: string;
  isRelevant?: boolean;
  relevanceScore?: number;
  supportsComplaint?: boolean;
  supportingClaims?: string[];
  extractedText?: string;
  detectedEntities?: { contractor?: string | null; project?: string | null; amount?: string | null; date?: string | null };
  flags?: string[];
  confidence?: number;
};

type Props = { caseId: string; documentId: string; token: string; className?: string };

export function DocumentAnalysisPanel({ caseId, documentId, token, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<{ status: string; analysis: DocumentAnalysis | null; authenticityNotice: string } | null>(null);
  const [error, setError] = useState(false);

  const loadAnalysis = async () => {
    if (payload || loading) return;
    setLoading(true);
    setError(false);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/grievance/${caseId}/documents/${documentId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("analysis unavailable");
      setPayload(await response.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) loadAnalysis();
  };

  const analysis = payload?.analysis;
  const relevance = typeof analysis?.relevanceScore === "number" ? Math.round(analysis.relevanceScore * 100) : null;
  const confidence = typeof analysis?.confidence === "number" ? Math.round(analysis.confidence * 100) : null;
  const entities = Object.entries(analysis?.detectedEntities || {}).filter(([, value]) => value);

  return (
    <div className={`mt-3 w-full border-t border-indigo-100 pt-3 ${className}`}>
      <Button type="button" variant="ghost" size="sm" onClick={toggle} className="h-8 px-2 text-xs text-indigo-700 hover:bg-indigo-50">
        <FileSearch className="mr-1.5 h-3.5 w-3.5" />
        {open ? "Hide AI document analysis" : "View AI document analysis"}
        <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/30 p-3">
          {loading && <div className="flex items-center gap-2 text-xs text-gray-600"><Loader2 className="h-4 w-4 animate-spin text-indigo-600" />Analyzing document…</div>}
          {error && <div className="flex items-center gap-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4" />Analysis is temporarily unavailable. The document remains available for manual review.</div>}
          {payload && !analysis && <p className="text-xs text-gray-600">{payload.status === "completed" ? "No document-level AI result was produced for this file. Uploading it again will re-run the document analysis." : <>Analysis status: <span className="font-semibold capitalize">{payload.status.replace(/_/g, " ")}</span>. Results will appear after the background worker finishes.</>}</p>}
          {analysis && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{analysis.documentType || "Document"}</Badge>
                <Badge variant="outline" className={analysis.isRelevant ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{analysis.isRelevant ? "Relevant" : "Needs review"}</Badge>
                {relevance !== null && <Badge variant="outline">Relevance {relevance}%</Badge>}
                {confidence !== null && <Badge variant="outline">Confidence {confidence}%</Badge>}
              </div>
              {entities.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Extracted entities</p><div className="mt-1 grid gap-1 sm:grid-cols-2">{entities.map(([key, value]) => <p key={key} className="text-xs text-gray-700"><span className="font-semibold capitalize">{key}:</span> {value}</p>)}</div></div>}
              {analysis.supportingClaims?.length ? <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Potentially supporting claims</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-700">{analysis.supportingClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul></div> : null}
              {analysis.flags?.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"><p className="font-semibold">Review flags</p><ul className="mt-1 list-disc space-y-1 pl-4">{analysis.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div> : null}
              {analysis.extractedText && <details className="text-xs text-gray-700"><summary className="cursor-pointer font-semibold text-indigo-700">View extracted text</summary><p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded border bg-white p-2">{analysis.extractedText}</p></details>}
              <div className="flex gap-2 rounded-md border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />{payload.authenticityNotice}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
