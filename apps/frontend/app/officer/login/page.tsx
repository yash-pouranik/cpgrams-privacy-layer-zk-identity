"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserCheck, KeyRound, Building2 } from "lucide-react";

export default function OfficerLoginPage() {
  const router = useRouter();
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId || !password) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/officer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerId: officerId.trim(), password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Authentication failed. Please check your credentials.");
      }

      const data = await res.json();
      if (data.token) {
        // Enforce role isolation: Clear any citizen session
        sessionStorage.removeItem("token");
        sessionStorage.setItem("officerToken", data.token);
        sessionStorage.setItem("officerUser", JSON.stringify(data.officer));
        router.push("/officer");
      } else {
        throw new Error("No authorization token received.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (id: string) => {
    setOfficerId(id);
    setPassword("Officer@123");
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto w-full px-6 py-12 flex-1">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-3 text-[#5E6AD2]">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Nodal Officer Portal</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Authorized government personnel login & case management.
        </p>
      </div>

      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-4 border-b border-[#E5E7EB]">
          <CardTitle className="text-lg text-[#111827]">Officer Authentication</CardTitle>
          <CardDescription className="text-xs text-[#6B7280]">
            Enter your Department Officer ID and secure password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#374151] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#6B7280]" /> Officer ID
              </label>
              <Input
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="e.g. PWD-001, HEALTH-001"
                className="bg-[#F9FAFB] border-[#E5E7EB]"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#374151] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#6B7280]" /> Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-[#F9FAFB] border-[#E5E7EB]"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white font-medium py-2 shadow-sm"
            >
              {loading ? "Authenticating..." : "Login to Portal"}
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
            <div className="text-xs font-semibold text-[#6B7280] mb-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Quick Demo Accounts:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill("PWD-001")}
                className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded border border-[#E5E7EB] text-left text-[#374151] font-medium transition"
              >
                PWD-001 (PWD L1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("HEALTH-001")}
                className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded border border-[#E5E7EB] text-left text-[#374151] font-medium transition"
              >
                HEALTH-001 (Health L1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("POLICE-001")}
                className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded border border-[#E5E7EB] text-left text-[#374151] font-medium transition"
              >
                POLICE-001 (Police L2)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("EDU-001")}
                className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded border border-[#E5E7EB] text-left text-[#374151] font-medium transition"
              >
                EDU-001 (Education L1)
              </button>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-2">Default demo password: <code>Officer@123</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
