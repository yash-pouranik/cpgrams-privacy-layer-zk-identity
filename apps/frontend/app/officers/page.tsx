"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OfficerScorecard, TierBadge, type OfficerMetrics } from "@/components/OfficerScorecard";
import { Search, Scale, ChevronDown, Loader2, ShieldCheck } from "lucide-react";

interface RegistryOfficer {
  officerId: string;
  name: string;
  department: string;
  level: number;
  isAvailable: boolean;
  expertise: string[];
  jurisdictions: string[];
  metrics: OfficerMetrics;
}

const SORTS = [
  { key: "sla", label: "SLA Compliance" },
  { key: "rating", label: "Citizen Rating" },
  { key: "volume", label: "Cases Handled" },
  { key: "resolution", label: "Avg Resolution Time" },
] as const;

export default function PublicOfficerRegistry() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [registry, setRegistry] = useState<RegistryOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("sla");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/master/officers/public-registry?sort=${sort}`);
        if (!res.ok) throw new Error(`Registry request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) setRegistry(data.registry ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load registry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, sort]);

  const departments = useMemo(
    () => Array.from(new Set(registry.map((o) => o.department))).sort(),
    [registry]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registry.filter((o) => {
      if (dept !== "all" && o.department !== dept) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.department.toLowerCase().includes(q) ||
        o.officerId.toLowerCase().includes(q)
      );
    });
  }, [registry, query, dept]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#EA580C]">
            <Scale className="h-4 w-4" aria-hidden /> Bilateral Accountability
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Public Officer Performance Registry
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            The system doesn&apos;t only record complaints — it records how institutions respond
            to them. Every officer&apos;s resolution record is public, transparent, and measured
            against the 14-day CPGRAMS service-level standard.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, department, or officer ID…"
                className="pl-9"
                aria-label="Search officers"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sort by
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", ...departments].map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  dept === d
                    ? "border-orange-300 bg-orange-50 text-[#EA580C]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {d === "all" ? "All Departments" : d}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading registry…
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="py-8 text-center text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">No officers match your search.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((o, idx) => (
              <Card key={o.officerId} className="border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 hidden font-mono text-xs font-bold text-slate-300 sm:block">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                          {o.name}
                          <TierBadge tier={o.metrics.performanceTier} />
                          {!o.isAvailable && (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              Unavailable
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {o.department} · Level {o.level} · ID {o.officerId}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(expanded === o.officerId ? null : o.officerId)}
                      className="text-xs text-slate-500"
                      aria-expanded={expanded === o.officerId}
                    >
                      {expanded === o.officerId ? "Hide details" : "View details"}
                      <ChevronDown
                        className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded === o.officerId ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <OfficerScorecard metrics={o.metrics} compact={expanded !== o.officerId} />
                  {expanded === o.officerId && (
                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                        <div>
                          <p className="font-medium uppercase tracking-wide text-slate-500">Appeal Rate</p>
                          <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">{o.metrics.appealRate}%</p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wide text-slate-500">Avg Resolution</p>
                          <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                            {o.metrics.averageResolutionDays} days
                          </p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wide text-slate-500">Feedback Received</p>
                          <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                            {o.metrics.totalFeedbackCount}
                          </p>
                        </div>
                      </div>
                      {(o.expertise?.length > 0 || o.jurisdictions?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {(o.expertise ?? []).map((e) => (
                            <Badge key={e} variant="outline" className="text-[10px] font-normal">
                              {e}
                            </Badge>
                          ))}
                          {(o.jurisdictions ?? []).map((j) => (
                            <Badge key={j} variant="outline" className="text-[10px] font-normal text-slate-500">
                              {j}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                        Metrics recalculated live from case records · No citizen data is exposed ·
                        Last updated {new Date(o.metrics.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="text-xs font-semibold text-[#EA580C] hover:underline">
            ← Back to CPGRAMS home
          </Link>
        </div>
      </main>
    </div>
  );
}
