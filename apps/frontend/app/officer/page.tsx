"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/CaseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { UserCheck, Building2, LogOut, ShieldAlert, Search, Filter, X } from "lucide-react";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
  department?: string | null;
  description?: string;
  votes?: number;
}

interface OfficerUser {
  officerId: string;
  name: string;
  department: string;
  level: number;
}

export default function OfficerDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [officer, setOfficer] = useState<OfficerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const token = sessionStorage.getItem("officerToken");
    if (!token) {
      router.push("/officer/login");
      return;
    }

    const savedUser = sessionStorage.getItem("officerUser");
    if (savedUser) {
      try {
        setOfficer(JSON.parse(savedUser));
      } catch (e) {}
    }

    const fetchOfficerData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        
        // Fetch current officer profile
        const profileRes = await fetch(`${apiUrl}/officer/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setOfficer(profileData);
          sessionStorage.setItem("officerUser", JSON.stringify(profileData));
        } else if (profileRes.status === 401) {
          sessionStorage.removeItem("officerToken");
          sessionStorage.removeItem("officerUser");
          router.push("/officer/login");
          return;
        }

        // Fetch assigned cases
        const res = await fetch(`${apiUrl}/officer/cases`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setCases(data);
        }
      } catch (err) {
        console.error("Failed to fetch assigned cases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficerData();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("officerToken");
    sessionStorage.removeItem("officerUser");
    setShowLogoutConfirm(false);
    router.push("/officer/login");
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
        return matchesId || matchesCategory || matchesDesc;
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

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 flex-1">
      {/* Officer Profile Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[#5E6AD2]">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#111827]">
                {officer ? officer.name : "Nodal Officer"}
              </h1>
              <Badge className="bg-[#5E6AD2] text-white text-xs">
                {officer ? `Level ${officer.level}` : "Officer"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#6B7280] mt-1">
              <span className="flex items-center gap-1 font-mono font-semibold text-[#374151]">
                ID: {officer?.officerId || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Department: <strong className="text-[#374151]">{officer?.department || "General"}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>

      {/* Header & Badges */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Assigned Grievances</h2>
          <p className="text-sm text-[#6B7280] mt-1">
            Grievances allocated to your desk. Citizen identity is cryptographically protected.
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 font-semibold text-[#5E6AD2] bg-indigo-50 border-indigo-200 self-start sm:self-auto">
          {filteredCases.length} of {cases.length} Cases
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
                placeholder="Search by Case ID, Category, or Description keyword..."
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
        <div className="bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center">
          <ShieldAlert className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#374151]">No assigned cases pending</h3>
          <p className="text-xs text-[#6B7280] mt-1">New complaints routed to your department will appear here automatically.</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-2xs">
          <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-900">No matching grievances found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or status filter.</p>
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
            <CaseCard key={c.caseId} data={c} href={`/officer/case/${c.caseId}`} />
          ))}
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out of Officer Portal?"
        icon="logout"
        variant="destructive"
        confirmText="Yes, Log Out"
        description="Are you sure you want to end your active officer session? Any pending drafts or unsaved status selections will be reset."
      />
    </div>
  );
}
