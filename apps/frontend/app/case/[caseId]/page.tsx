"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ChatThread } from "@/components/ChatThread";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CaseDetail {
  caseId: string;
  category: string;
  status: string;
  department: string | null;
  description: string;
  createdAt: string;
}

export default function CitizenCaseDetail({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  const [grievance, setGrievance] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/grievance/${params.caseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setGrievance(data);
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to fetch case details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [params.caseId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#5E6AD2] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!grievance) return null;

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
      <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-sm mb-8">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
          <div>
            <div className="font-mono text-3xl font-bold text-[#5E6AD2] mb-2">
              {grievance.caseId}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-[#E5E7EB] text-[#111827] font-normal hover:bg-[#E5E7EB]">
                {grievance.category}
              </Badge>
              {grievance.department && (
                <span className="text-sm text-[#6B7280]">Dept: {grievance.department}</span>
              )}
              <span className="text-sm text-[#6B7280]">
                • {new Date(grievance.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <StatusBadge status={grievance.status} />
        </CardHeader>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-[#111827] mb-2 uppercase tracking-wider">Description</h3>
          <p className="text-[#6B7280] whitespace-pre-wrap leading-relaxed">
            {grievance.description}
          </p>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#111827]">Secure Communication</h2>
        <p className="text-sm text-[#6B7280]">The officer is handling your case. Messages are masked to protect your identity.</p>
      </div>

      <ChatThread caseId={grievance.caseId} role="citizen" />
    </div>
  );
}
