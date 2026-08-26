"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Clock, ArrowRight, Building2 } from "lucide-react";

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
    <Card className="hover:border-[#5E6AD2]/50 hover:shadow-xs transition-all bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Case ID, Category, Badges, Description preview */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[#5E6AD2] font-bold text-base tracking-wide">
              {data.caseId}
            </span>
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 font-normal hover:bg-gray-100 text-xs">
              {data.category}
            </Badge>
            {typeof data.votes === "number" && data.votes > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-bold text-orange-700">
                {data.votes} Confirmed
              </span>
            )}
            {data.status === 'resolved' && data.feedbackSubmitted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Feedback Submitted
              </span>
            )}
          </div>

          {data.description && (
            <p className="text-xs text-gray-600 line-clamp-1 leading-relaxed">
              {data.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-[11px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" /> Filed: {dateStr}
            </span>
            {data.department && (
              <span className="flex items-center gap-1 text-gray-500">
                <Building2 className="w-3 h-3 text-gray-400" /> {data.department}
              </span>
            )}
          </div>
        </div>

        {/* Right: Status Badge + Action Button */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
          <StatusBadge status={data.status} />
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E6AD2] group-hover:text-white bg-indigo-50 group-hover:bg-[#5E6AD2] border border-indigo-100 group-hover:border-[#5E6AD2] px-3.5 py-2 rounded-xl transition"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
