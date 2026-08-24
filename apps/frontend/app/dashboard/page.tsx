"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus, LogOut, FileText } from "lucide-react";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
  feedbackSubmitted?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/grievance/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          sessionStorage.removeItem("token");
          router.push("/");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setCases(data);
        }
      } catch (err) {
        console.error("Failed to fetch cases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1 min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 flex-1">
      {/* Citizen Session Banner */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#111827]">
                Citizen Grievance Desk
              </h1>
              <Badge className="bg-emerald-600 text-white text-xs">
                Aadhaar eKYC Verified
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1.5">
              <span>Pairwise Pseudonymous ID active.</span>
              <span className="text-emerald-700 font-medium">• Zero real personal details exposed to officers.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-medium shadow-sm">
            <Link href="/grievance/new" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> File New Grievance
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">My Grievances</h2>
          <p className="text-sm text-[#6B7280] mt-1">Track status and review officer communication for your complaints.</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 font-semibold text-[#5E6AD2] bg-indigo-50 border-indigo-200">
          {cases.length} Filed
        </Badge>
      </div>

      {cases.length === 0 ? (
        <div className="bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#374151]">No grievances filed yet</h3>
          <p className="text-xs text-[#6B7280] mt-1 mb-5">Submit a public service grievance to get it redressed securely.</p>
          <Button asChild className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white">
            <Link href="/grievance/new">+ Lodge Your First Grievance</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
            <div key={c.caseId} className="relative">
              <CaseCard data={c} href={`/case/${c.caseId}`} />
              {c.status === 'resolved' && c.feedbackSubmitted && (
                <div className="absolute top-2 right-2 mt-[-10px] mr-[-10px]">
                  <span className="badge badge-success badge-sm shadow-sm text-xs text-white">Feedback Submitted</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
