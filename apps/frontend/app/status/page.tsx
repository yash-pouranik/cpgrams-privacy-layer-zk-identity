"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, History, Clock, CheckCircle, ShieldCheck } from "lucide-react";

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

export default function StatusPage() {
  const [caseId, setCaseId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);

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
        body: JSON.stringify({ caseId: caseId.trim().toUpperCase(), registrationPassword: password.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Case ID or Registration Password not found");
      }

      const data = await res.json();
      setStatusData(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve status.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!statusData || !password) return;
    setHistoryLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/status/${statusData.caseId}/history?password=${encodeURIComponent(password.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-12 flex-1">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-3 text-[#5E6AD2]">
          <Search className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Track Grievance Status</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Check live progress of your registered grievance without logging in.
        </p>
      </div>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8">
        <CardHeader className="pb-4 border-b border-[#E5E7EB]">
          <CardTitle className="text-lg text-[#111827]">Public Status Lookup</CardTitle>
          <CardDescription className="text-xs text-[#6B7280]">
            Enter your Case Registration ID (e.g. CPG-XXXXXX) and unique registration password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#374151]">Registration / Case ID</label>
              <Input 
                value={caseId} 
                onChange={(e) => setCaseId(e.target.value)} 
                placeholder="e.g. CPG-A1B2C3" 
                className="bg-[#F9FAFB] uppercase font-mono border-[#E5E7EB]"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#374151]">Registration Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter 8-character password" 
                className="bg-[#F9FAFB] border-[#E5E7EB]"
                required 
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white">
              {loading ? "Searching..." : "Track Grievance Status"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {statusData && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#E5E7EB]">
            <div>
              <span className="font-mono text-2xl font-bold text-[#5E6AD2]">{statusData.caseId}</span>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Registered on {new Date(statusData.createdAt).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={statusData.status} />
          </CardHeader>
          
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</p>
                <p className="font-medium text-[#111827] mt-1">{statusData.category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Assigned Department</p>
                <p className="font-medium text-[#111827] mt-1">{statusData.department || "Under Nodal Review"}</p>
              </div>
            </div>
            
            {!history && (
              <Button onClick={handleViewHistory} disabled={historyLoading} variant="outline" className="w-full mt-2 flex items-center justify-center gap-1.5 border-[#E5E7EB]">
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
