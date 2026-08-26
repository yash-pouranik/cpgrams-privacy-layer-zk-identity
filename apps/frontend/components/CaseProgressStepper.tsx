"use client";

import { CheckCircle2, Clock, ShieldCheck, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

interface CaseProgressStepperProps {
  status: string; // 'pending' | 'assigned' | 'in_progress' | 'resolved'
  department?: string | null;
  feedbackSubmitted?: boolean;
}

export function CaseProgressStepper({ status, department, feedbackSubmitted }: CaseProgressStepperProps) {
  const steps = [
    {
      id: "filed",
      label: "Grievance Filed",
      desc: "Protected identity created",
      isComplete: true,
      isActive: status === "pending",
    },
    {
      id: "assigned",
      label: "Dept. Assigned",
      desc: department ? `${department} Nodal Desk` : "Auto-routing",
      isComplete: status === "assigned" || status === "in_progress" || status === "resolved",
      isActive: status === "assigned",
    },
    {
      id: "in_progress",
      label: "Action & Investigation",
      desc: "Masked officer inquiry",
      isComplete: status === "resolved",
      isActive: status === "in_progress",
    },
    {
      id: "resolved",
      label: "Resolution & Rating",
      desc: feedbackSubmitted ? "Review recorded" : status === "resolved" ? "Ready for review" : "Final redressal",
      isComplete: status === "resolved" && feedbackSubmitted,
      isActive: status === "resolved" && !feedbackSubmitted,
    },
  ];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#5E6AD2]" /> Redressal Lifecycle Tracker
        </span>
        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Real Identity Encrypted
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2 relative">
        {steps.map((step, idx) => {
          return (
            <div key={step.id} className="flex flex-col relative group">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    step.isComplete
                      ? "bg-emerald-600 text-white shadow-xs"
                      : step.isActive
                      ? "bg-[#5E6AD2] text-white ring-4 ring-indigo-100 shadow-xs animate-pulse"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {step.isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-xs font-bold truncate ${
                      step.isActive
                        ? "text-[#5E6AD2]"
                        : step.isComplete
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </h4>
                </div>
              </div>

              <p
                className={`text-[11px] pl-9.5 leading-tight ${
                  step.isActive ? "text-indigo-950 font-medium" : "text-gray-500"
                }`}
              >
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
