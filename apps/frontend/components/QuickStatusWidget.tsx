"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickStatusWidget() {
  const [caseId, setCaseId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId.trim() || !password.trim()) {
      setError("Please enter both Grievance Number and 8-character password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/status/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseId.trim().toUpperCase(),
          registrationPassword: password.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Grievance not found or incorrect password");
      }

      router.push(`/status`);
    } catch (err: any) {
      setError(err.message || "Could not find grievance details. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-left font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            Track Complaint Status
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Check live redressal progress without logging in
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Public SSL Verified
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Grievance Number
            </label>
            <Input
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g. CPG-A1B2C3"
              className="font-mono text-sm uppercase bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-lg focus:border-[#F6821F] focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Secret Passcode
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8-character passcode"
              className="font-mono text-sm bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-lg focus:border-[#F6821F] focus:bg-white"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:flex-1 h-10 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm font-sans cursor-pointer"
          >
            {loading ? "Checking Database..." : "Check Complaint Status →"}
          </Button>

          <a
            href="/status"
            className="text-xs text-slate-600 hover:text-[#EA580C] font-semibold px-2 py-1 text-center"
          >
            Full Timeline &rarr;
          </a>
        </div>
      </form>
    </div>
  );
}
