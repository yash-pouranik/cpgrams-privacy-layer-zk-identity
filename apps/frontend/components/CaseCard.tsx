"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";

interface Case {
  caseId: string;
  category: string;
  status: string;
  createdAt: string;
  votes?: number;
}

interface CaseCardProps {
  data: Case;
  href: string;
}

export function CaseCard({ data, href }: CaseCardProps) {
  const dateStr = new Date(data.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="hover:border-[#5E6AD2]/50 transition-colors bg-surface-1 border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="font-mono text-[#5E6AD2] font-semibold text-lg">
          {data.caseId}
        </div>
        <StatusBadge status={data.status} />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-[#E5E7EB] text-[#111827] hover:bg-[#D1D5DB] font-normal">
              {data.category}
            </Badge>
            <div className="flex items-center gap-2">
              {typeof data.votes === "number" && data.votes > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  🔥 {data.votes} confirmed
                </span>
              )}
              <span className="text-sm text-[#6B7280]">{dateStr}</span>
            </div>
          </div>
          <div className="pt-2">
            <Link href={href} className="text-[#5E6AD2] hover:underline text-sm font-medium">
              View Details &rarr;
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
