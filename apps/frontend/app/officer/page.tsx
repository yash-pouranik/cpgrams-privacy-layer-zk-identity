"use client";

import { useEffect, useState } from "react";
import { CaseCard } from "@/components/CaseCard";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
}

export default function OfficerDashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/officer/cases`, {
          headers: {
            "X-Officer-Id": "PWD-001",
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

    fetchCases();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 flex-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#111827] tracking-tight">Officer Dashboard</h1>
        <p className="text-[#6B7280] mt-2">Assigned cases for PWD-001</p>
      </div>

      {cases.length === 0 ? (
        <div className="bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-lg p-12 text-center">
          <p className="text-[#6B7280]">No assigned cases.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
            <CaseCard key={c.caseId} data={c} href={`/officer/case/${c.caseId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
