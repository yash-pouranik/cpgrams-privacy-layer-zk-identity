"use client";

import { ShieldCheck, Clock, Star, FolderCheck, AlertTriangle, Inbox } from "lucide-react";

export interface OfficerMetrics {
  totalCasesHandled: number;
  activeCases: number;
  resolvedCases: number;
  overdueCases: number;
  averageResolutionDays: number;
  slaComplianceRate: number;
  citizenSatisfaction: number;
  totalFeedbackCount: number;
  appealRate: number;
  performanceTier: "A+" | "A" | "B" | "C" | "NEEDS_ATTENTION";
  lastUpdated: string;
}

const TIER_STYLES: Record<string, { label: string; cls: string; note: string }> = {
  "A+": { label: "A+ Exemplary", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", note: "SLA ≥ 95% and citizen rating ≥ 4.5" },
  A: { label: "A On-Track", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", note: "SLA ≥ 85% and citizen rating ≥ 4.0" },
  B: { label: "B Satisfactory", cls: "bg-sky-50 text-sky-700 border-sky-200", note: "SLA ≥ 70% and citizen rating ≥ 3.5" },
  C: { label: "C Needs Improvement", cls: "bg-amber-50 text-amber-700 border-amber-200", note: "SLA ≥ 50%" },
  NEEDS_ATTENTION: { label: "Needs Attention", cls: "bg-rose-50 text-rose-700 border-rose-200", note: "SLA below 50%" },
};

export function TierBadge({ tier }: { tier: string }) {
  const t = TIER_STYLES[tier] ?? TIER_STYLES.C;
  return (
    <span
      title={`Performance tier: ${t.note}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t.cls}`}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      {t.label}
    </span>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <Icon className={`h-3.5 w-3.5 ${tone ?? "text-slate-400"}`} aria-hidden />
        {label}
      </span>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </div>
  );
}

/**
 * OfficerScorecard — reusable accountability scorecard (Phase 8).
 * Radial-gauge-free, crisp typographic variant per government aesthetic rules.
 */
export function OfficerScorecard({ metrics, compact = false }: { metrics: OfficerMetrics; compact?: boolean }) {
  const sla = Math.min(100, Math.max(0, metrics.slaComplianceRate));
  const stars = Math.round(metrics.citizenSatisfaction);

  return (
    <div className="space-y-4">
      {/* SLA compliance bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium uppercase tracking-wide text-slate-500">
            <Clock className="h-3.5 w-3.5" aria-hidden /> 14-Day SLA Compliance
          </span>
          <span className="font-mono font-bold text-slate-900">{sla}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={sla} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-all ${sla >= 85 ? "bg-emerald-500" : sla >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${sla}%` }}
          />
        </div>
      </div>

      {/* Citizen satisfaction stars */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium uppercase tracking-wide text-slate-500">
          <Star className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Citizen Satisfaction
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i <= stars ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
              />
            ))}
          </span>
          <span className="font-mono font-bold text-slate-900">
            {metrics.citizenSatisfaction.toFixed(1)}
            <span className="ml-1 text-[10px] font-normal text-slate-400">({metrics.totalFeedbackCount})</span>
          </span>
        </span>
      </div>

      {/* Case statistics */}
      <div className={`grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4 ${compact ? "" : "sm:grid-cols-5"}`}>
        <Stat icon={Inbox} label="Total Handled" value={String(metrics.totalCasesHandled)} />
        <Stat icon={FolderCheck} label="Resolved" value={String(metrics.resolvedCases)} tone="text-emerald-500" />
        <Stat icon={Clock} label="Active" value={String(metrics.activeCases)} tone="text-sky-500" />
        <Stat icon={AlertTriangle} label="Overdue" value={String(metrics.overdueCases)} tone={metrics.overdueCases > 0 ? "text-rose-500" : "text-slate-400"} />
        {!compact && <Stat icon={Clock} label="Avg Resolution" value={`${metrics.averageResolutionDays}d`} />}
      </div>
    </div>
  );
}
