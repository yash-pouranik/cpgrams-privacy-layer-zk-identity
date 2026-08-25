"use client";

import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "";
  let label = status;

  switch (status.toLowerCase()) {
    case "pending":
      colorClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
      label = "Pending";
      break;
    case "assigned":
      colorClass = "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
      label = "Assigned";
      break;
    case "in_progress":
      colorClass = "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200";
      label = "In Progress";
      break;
    case "resolved":
      colorClass = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
      label = "Resolved";
      break;
    default:
      colorClass = "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200";
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-medium`}>
      {label}
    </Badge>
  );
}
