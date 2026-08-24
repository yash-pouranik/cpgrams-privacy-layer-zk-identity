"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";

interface StatusData {
  caseId: string;
  status: string;
  department: string | null;
  category: string;
  createdAt: string;
}

interface HistoryItem {
  _id: string;
  status: string;
  notes: string;
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
        body: JSON.stringify({ caseId, registrationPassword: password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to check status");
      }

      const data = await res.json();
      setStatusData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!statusData) return;
    setHistoryLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/status/${statusData.caseId}/history?password=${password}`);

      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-12 flex-1">
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8">
        <CardHeader className="pb-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-2xl text-[#111827]">Check Case Status</CardTitle>
          <CardDescription className="text-[#6B7280] mt-2">
            Enter your Case ID and Registration Password to check status. No login required.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Case ID</label>
              <Input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g. CASE-12345678"
                className="bg-[#F9FAFB] border-[#E5E7EB]"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Registration Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-[#F9FAFB] border-[#E5E7EB]"
                required
              />
            </div>
            {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full bg-[#5E6AD2] hover:bg-[#828FFF] text-white">
              {loading ? "Checking..." : "Check Status"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {statusData && (
        <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#E5E7EB]">
            <div>
              <div className="font-mono text-xl font-bold text-[#5E6AD2] mb-1">{statusData.caseId}</div>
              <div className="text-sm text-[#6B7280]">
                Filed on {new Date(statusData.createdAt).toLocaleDateString()}
              </div>
            </div>
            <StatusBadge status={statusData.status} />
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</p>
                <p className="font-medium text-[#111827] mt-1">{statusData.category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Department</p>
                <p className="font-medium text-[#111827] mt-1">{statusData.department || "Unassigned"}</p>
              </div>
            </div>
            
            {!history && (
              <Button onClick={handleViewHistory} disabled={historyLoading} variant="outline" className="w-full mt-4">
                {historyLoading ? "Loading history..." : "View Status History"}
              </Button>
            )}

            {history && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#111827] mb-4 uppercase tracking-wider border-b pb-2">Timeline</h3>
                <ul className="steps steps-vertical">
                  {history.map((h, i) => (
                    <li key={h._id} className={`step ${i === 0 ? "step-primary" : ""}`}>
                      <div className="flex flex-col items-start text-left w-full ml-2">
                        <span className="font-medium capitalize">{h.status.replace("_", " ")}</span>
                        <span className="text-xs text-[#6B7280]">{new Date(h.createdAt).toLocaleString()}</span>
                        {h.notes && <span className="text-sm mt-1">{h.notes}</span>}
                      </div>
                    </li>
                  ))}
                  <li className={`step ${history.length > 0 ? "" : "step-primary"}`}>
                    <div className="flex flex-col items-start text-left w-full ml-2">
                      <span className="font-medium">Case Filed</span>
                      <span className="text-xs text-[#6B7280]">{new Date(statusData.createdAt).toLocaleString()}</span>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
