"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/CaseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { UserCheck, Building2, LogOut, ShieldAlert } from "lucide-react";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
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

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Assigned Grievances</h2>
          <p className="text-sm text-[#6B7280] mt-1">
            Grievances allocated to your desk. Citizen identity is cryptographically protected.
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 font-semibold text-[#5E6AD2] bg-indigo-50 border-indigo-200">
          {cases.length} Total Cases
        </Badge>
      </div>

      {cases.length === 0 ? (
        <div className="bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center">
          <ShieldAlert className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#374151]">No assigned cases pending</h3>
          <p className="text-xs text-[#6B7280] mt-1">New complaints routed to your department will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
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
