"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, History, Clock, CheckCircle, ShieldCheck, Loader2 } from "lucide-react";

interface StatusData {
  caseId: string;
  status: string;
  department: string | null;
  category: string;
  createdAt: string;
  updatedAt?: string;
}

interface HistoryItem {
  _id: string;
  title?: string;
  status?: string;
  eventType?: string;
  notes?: string;
  createdAt: string;
}

function StatusContent() {
  const searchParams = useSearchParams();
  const [caseId, setCaseId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);

  // Auto-check when page is reached via URL query params (/status?caseId=...&password=...)
  useEffect(() => {
    const qCase = searchParams.get("caseId");
    const qPwd = searchParams.get("password");
    if (!qCase || !qPwd) return;
    setCaseId(qCase);
    setPassword(qPwd);

    const runAutoCheck = async () => {
      setLoading(true);
      setError(null);
      setStatusData(null);
      setHistory(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/status/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: qCase.trim().toUpperCase(), registrationPassword: qPwd.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Case ID or Registration/Tracking Password not found");
        }
        const data = await res.json();
        setStatusData(data);
      } catch (err: any) {
        setError(err.message || "Failed to retrieve status.");
      } finally {
        setLoading(false);
      }
    };
    runAutoCheck();
  }, [searchParams]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !password) return;
    
    setLoading(true);
    setError(null);
    setStatusData(null);
    setHistory(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/status/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseId.trim().toUpperCase(),
          registrationPassword: password.trim()
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Case ID or Registration Password not found");
      }

      const data = await res.json();
      setStatusData(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve status. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchHistory = async () => {
    if (!caseId || !password) return;

    setHistoryLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/status/${caseId.trim().toUpperCase()}/history?password=${encodeURIComponent(password.trim())}`);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch timeline history");
      }

      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || "Could not retrieve audit trail.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-12 flex-1">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-full bg-indigo-50 text-[#5E6AD2] mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Public Grievance Status Tracker</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Check the real-time progress of your complaint without logging into SSO.
        </p>
      </div>

      <Card className="bg-white border-[#E5E7EB] shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Track by Reference</CardTitle>
          <CardDescription className="text-xs">
            Enter your Case Registration ID (e.g. CPG-A1B2C3) and your Registration / Tracking Password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#111827]">Case Registration ID</label>
              <Input
                placeholder="CPG-XXXXXX"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="font-mono uppercase bg-[#F9FAFB] border-[#E5E7EB]"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#111827]">Registration / Tracking Password</label>
              <Input
                type="text"
                placeholder="8-character alphanumeric code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono bg-[#F9FAFB] border-[#E5E7EB]"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !caseId || !password}
              className="w-full bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? "Verifying Credentials..." : "Track Status"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {statusData && (
        <Card className="bg-white border-[#E5E7EB] shadow-md animate-in fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <span className="text-xs text-[#6B7280] font-mono">CASE ID</span>
              <div className="text-xl font-bold font-mono text-[#5E6AD2]">{statusData.caseId}</div>
            </div>
            <StatusBadge status={statusData.status} />
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6B7280] block mb-1">Category</span>
                <Badge variant="secondary" className="bg-[#E5E7EB] text-[#111827] font-medium">
                  {statusData.category}
                </Badge>
              </div>
              {statusData.department && (
                <div>
                  <span className="text-[#6B7280] block mb-1">Assigned Department</span>
                  <span className="font-semibold text-[#111827]">{statusData.department}</span>
                </div>
              )}
              <div>
                <span className="text-[#6B7280] block mb-1">Registration Date</span>
                <span className="text-[#111827] flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-[#6B7280]" />
                  {new Date(statusData.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </div>

            {!history && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchHistory}
                disabled={historyLoading}
                className="w-full mt-4 text-xs border-[#5E6AD2] text-[#5E6AD2] hover:bg-indigo-50 flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4 text-[#5E6AD2]" />
                {historyLoading ? "Loading Audit Timeline..." : "View Timeline History"}
              </Button>
            )}

            {history && (
              <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                <h3 className="text-sm font-semibold text-[#111827] mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#5E6AD2]" /> Case Audit Trail & Timeline
                </h3>

                {history.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No additional status events recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
                    {history.map((h, idx) => {
                      const label = h.title || (h.status ? String(h.status).replace(/_/g, " ") : (h.eventType ? String(h.eventType).replace(/_/g, " ") : "Action Recorded"));
                      return (
                        <div key={h._id || idx} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-[#5E6AD2] border-2 border-white flex items-center justify-center shadow-xs">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-[#111827] capitalize">{label}</span>
                              <span className="text-[11px] text-[#6B7280]">{new Date(h.createdAt).toLocaleString()}</span>
                            </div>
                            {h.notes && (
                              <p className="text-xs text-[#4B5563] mt-1 bg-white p-2 rounded border border-[#E5E7EB]">{h.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto w-full px-6 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#5E6AD2]" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
