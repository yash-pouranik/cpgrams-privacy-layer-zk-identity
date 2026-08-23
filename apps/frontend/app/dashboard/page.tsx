"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 flex-1">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-[#111827] tracking-tight">My Grievances</h1>
        <Button asChild className="bg-[#5E6AD2] hover:bg-[#828FFF] text-white">
          <Link href="/grievance/new">+ File New Grievance</Link>
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-lg p-12 text-center">
          <p className="text-[#6B7280] mb-4">No grievances yet. File your first one.</p>
          <Button asChild variant="outline" className="border-[#E5E7EB] text-[#111827]">
            <Link href="/grievance/new">Get Started</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
            <CaseCard key={c.caseId} data={c} href={`/case/${c.caseId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
