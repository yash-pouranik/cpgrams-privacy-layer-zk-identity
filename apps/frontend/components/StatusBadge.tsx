"use client";

import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "";
  let label = status;

  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");

  switch (normalized) {
    case "received":
    case "pending":
      colorClass = "bg-slate-100 text-slate-800 border-slate-300";
      label = "Received / Registered";
      break;
    case "under_process":
    case "assigned":
      colorClass = "bg-indigo-50 text-indigo-800 border-indigo-200";
      label = "Under Process";
      break;
    case "forwarded":
    case "in_progress":
      colorClass = "bg-blue-50 text-blue-800 border-blue-200";
      label = "Forwarded to Subordinate";
      break;
    case "disposed":
    case "resolved":
      colorClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
      label = "Disposed / Closed";
      break;
    case "appealed":
      colorClass = "bg-red-50 text-red-800 border-red-300 font-semibold animate-pulse";
      label = "Appeal Case Initiated";
      break;
    default:
      colorClass = "bg-gray-100 text-gray-800 border-gray-200";
      label = status;
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-mono text-xs px-2.5 py-0.5 shadow-2xs`}>
      {label}
    </Badge>
  );
}
