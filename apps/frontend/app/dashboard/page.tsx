"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaseCard } from "@/components/CaseCard";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ShieldCheck, Plus, LogOut, Search, Clock, Sparkles, ArrowRight, Filter, X } from "lucide-react";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
  department?: string | null;
  description?: string;
  votes?: number;
  feedbackSubmitted?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const handleLogout = async () => {
    const hadToken = sessionStorage.getItem("token");
    sessionStorage.removeItem("token");
    setShowLogoutConfirm(false);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    await fetch(apiBase + "/auth/logout", {
      method: "GET",
      credentials: "include",
    }).catch(() => {});

    if (hadToken) {
      const ssoBase = process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:4000";
      window.location.href = `${ssoBase}/oidc/logout`;
    } else {
      router.push("/");
    }
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Status filter
      if (statusFilter !== "all") {
        const norm = (c.status || "").toLowerCase().replace(/[\s-]/g, "_");
        if (statusFilter === "under_process" && !(norm === "under_process" || norm === "assigned")) return false;
        if (statusFilter === "forwarded" && !(norm === "forwarded" || norm === "in_progress")) return false;
        if (statusFilter === "disposed" && !(norm === "disposed" || norm === "resolved")) return false;
        if (statusFilter === "received" && !(norm === "received" || norm === "pending")) return false;
        if (statusFilter === "appealed" && norm !== "appealed") return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = c.caseId.toLowerCase().includes(q);
        const matchesCategory = (c.category || "").toLowerCase().includes(q);
        const matchesDesc = (c.description || "").toLowerCase().includes(q);
        const matchesDept = (c.department || "").toLowerCase().includes(q);
        return matchesId || matchesCategory || matchesDesc || matchesDept;
      }

      return true;
    });
  }, [cases, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1 min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingCount = cases.filter(c => c.status === 'pending' || c.status === 'assigned' || c.status === 'received').length;
  const inProgressCount = cases.filter(c => c.status === 'in_progress' || c.status === 'under_process' || c.status === 'forwarded').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved' || c.status === 'disposed').length;

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
            <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Pairwise ID Protected.</span>
              <span className="text-emerald-700 font-medium">• Your mobile and Aadhaar are never shared with officers.</span>
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
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      {cases.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Awaiting Action</span>
            <span className="text-xl font-bold text-gray-900 mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] text-blue-600 font-medium uppercase tracking-wider block">In Investigation</span>
            <span className="text-xl font-bold text-blue-600 mt-0.5 block">{inProgressCount}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider block">Resolved & Closed</span>
            <span className="text-xl font-bold text-emerald-600 mt-0.5 block">{resolvedCount}</span>
          </div>
        </div>
      )}

      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">My Grievances</h2>
          <p className="text-sm text-[#6B7280] mt-1">Track redressal timeline, chat with officers, and download official reports.</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 font-semibold text-[#5E6AD2] bg-indigo-50 border-indigo-200 self-start sm:self-auto">
          {filteredCases.length} of {cases.length} Grievances
        </Badge>
      </div>

      {/* Interactive Search & Filter Controls */}
      {cases.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Case ID, Category, Department, or Description..."
                className="pl-9 bg-[#F9FAFB] border-gray-200 text-xs h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-gray-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {[
              { id: "all", label: "All Cases" },
              { id: "received", label: "Received" },
              { id: "under_process", label: "Under Process" },
              { id: "forwarded", label: "Forwarded" },
              { id: "disposed", label: "Disposed" },
              { id: "appealed", label: "Appealed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-[#5E6AD2] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cases List Rendering (1 Case Per Row) */}
      {cases.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-[#5E6AD2] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">No grievances filed yet</h3>
          <p className="text-xs text-[#6B7280] mt-1.5 max-w-md mx-auto mb-6">
            Lodge a complaint against any central/state government department. Your personal identity remains 100% protected throughout the process.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-8 text-left text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="font-bold text-gray-900 block mb-0.5">Identity Shielded</span>
              <span className="text-gray-500">Officer sees only randomized Pairwise Case ID.</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="font-bold text-gray-900 block mb-0.5">Auto Routed</span>
              <span className="text-gray-500">Directly assigned to responsible Nodal Officer.</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="font-bold text-gray-900 block mb-0.5">Masked Chat</span>
              <span className="text-gray-500">Directly communicate without revealing mobile/email.</span>
            </div>
          </div>

          <Button asChild className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs h-10 px-6 font-medium shadow-sm">
            <Link href="/grievance/new" className="flex items-center gap-1.5">
              <span>Lodge Your First Grievance</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-2xs">
          <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-900">No matching grievances found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search terms or status filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
            className="mt-4 text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((c) => (
            <CaseCard key={c.caseId} data={c} href={`/case/${c.caseId}`} />
          ))}
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="End Citizen Session?"
        icon="logout"
        variant="destructive"
        confirmText="Yes, Log Out"
        description="Are you sure you want to log out of the Citizen Grievance Portal? Your active grievances remain safely registered and can be accessed on your next login or tracked via Registration ID."
      />
    </div>
  );
}
