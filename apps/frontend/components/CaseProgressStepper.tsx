"use client";

import { useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, ChevronDown, ChevronUp, Sparkles, Scale, FileText, Star, ArrowRight } from "lucide-react";

interface CaseProgressStepperProps {
  status: string; // 'received' | 'under_process' | 'forwarded' | 'disposed' | 'appealed' (or legacy aliases)
  department?: string | null;
  feedbackSubmitted?: boolean;
  appealStatus?: string | null;
}

export function CaseProgressStepper({ status, department, feedbackSubmitted, appealStatus }: CaseProgressStepperProps) {
  const [showDetailedStages, setShowDetailedStages] = useState(false);

  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");

  // Determine active step index (0 to 4)
  let activeIndex = 0;
  if (normalized === "received" || normalized === "pending") {
    activeIndex = 0;
  } else if (normalized === "under_process" || normalized === "assigned") {
    activeIndex = 1;
  } else if (normalized === "forwarded" || normalized === "in_progress") {
    activeIndex = 2;
  } else if (normalized === "disposed" || normalized === "resolved") {
    activeIndex = 3;
  } else if (normalized === "appealed") {
    activeIndex = 4;
  }

  const systemSteps = [
    {
      num: 1,
      phase: "Phase I: Primary Lifecycle",
      stageTag: "Stages 1 & 2",
      label: "Received / Registered",
      desc: "CivID Auth & IGMS Screening",
      isComplete: activeIndex > 0,
      isActive: activeIndex === 0,
    },
    {
      num: 2,
      phase: "Phase I: Primary Lifecycle",
      stageTag: "Stages 3 & 4",
      label: "Under Process",
      desc: department ? `${department} Nodal Gateway` : "Nodal Officer Assessment",
      isComplete: activeIndex > 1,
      isActive: activeIndex === 1,
    },
    {
      num: 3,
      phase: "Phase I: Primary Lifecycle",
      stageTag: "Stages 5 & 6",
      label: "Forwarded to Subordinate",
      desc: "Field GRO Inquiry & Masked Chat",
      isComplete: activeIndex > 2,
      isActive: activeIndex === 2,
    },
    {
      num: 4,
      phase: "Phase I: Primary Lifecycle",
      stageTag: "Stages 7 & 8",
      label: "Disposed / Closed",
      desc: "Action Taken Report (ATR) Uploaded",
      isComplete: activeIndex > 3 || (activeIndex === 3 && feedbackSubmitted),
      isActive: activeIndex === 3,
    },
    {
      num: 5,
      phase: "Phase II: Feedback & Appeal",
      stageTag: "Stages 9 & 10",
      label: "Appellate Review",
      desc: activeIndex === 4 ? "Joint Secretary Review Active" : "First Appeal Escalation (NAA)",
      isComplete: appealStatus === "upheld" || appealStatus === "fresh_action_ordered",
      isActive: activeIndex === 4,
    },
  ];

  const tenStages = [
    { num: "Stage 1", name: "Citizen Registration & Auth", phase: "Phase I", desc: "Citizen authenticates via CivID SSO under randomized Pairwise ID." },
    { num: "Stage 2", name: "Submission & Unique ID", phase: "Phase I", desc: "Registration ID and Public Password generated with encrypted file attachments." },
    { num: "Stage 3", name: "AI-Driven IGMS Screening", phase: "Phase I", desc: "Spam check, duplicate detection, and semantic micro-category classification." },
    { num: "Stage 4", name: "First-Level Nodal Assessment", phase: "Phase I", desc: "Ministry Nodal Officer verifies jurisdiction and initial admissibility." },
    { num: "Stage 5", name: "Downward Cascading / Mapping", phase: "Phase I", desc: "Forwarded to localized Field Unit / Subordinate Grievance Redressal Officer (GRO)." },
    { num: "Stage 6", name: "Direct Ground Investigation", phase: "Phase I", desc: "On-site inquiry, rectification SOPs, and masked citizen clarifications." },
    { num: "Stage 7", name: "Action Taken Report (ATR) Upload", phase: "Phase I", desc: "Handling authority compiles and uploads formal ATR with evidence." },
    { num: "Stage 8", name: "System Disposition & Notice", phase: "Phase II", desc: "Automated disposition notice dispatched with public ATR download." },
    { num: "Stage 9", name: "Feedback Collection & Rating", phase: "Phase II", desc: "Citizen rates 1-5 stars. Dissatisfaction unlocks mandatory First Appeal." },
    { num: "Stage 10", name: "Nodal Appellate Evaluation", phase: "Phase II", desc: "Joint Secretary rank Appellate Authority conducts independent review." },
  ];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#5E6AD2]" /> CPGRAMS 2-Phase Lifecycle Tracker
          </span>
          <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
            IGMS Standard
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Pairwise Identity Protected
          </span>
          <button
            type="button"
            onClick={() => setShowDetailedStages(!showDetailedStages)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
          >
            <span>{showDetailedStages ? "Hide 10 Stages" : "View All 10 Stages"}</span>
            {showDetailedStages ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 5 Official Portal Status Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
        {systemSteps.map((step) => {
          return (
            <div key={step.num} className="flex flex-col relative group">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    step.isComplete
                      ? "bg-emerald-600 text-white shadow-xs"
                      : step.isActive
                      ? step.num === 5
                        ? "bg-red-600 text-white ring-4 ring-red-100 shadow-xs animate-pulse"
                        : "bg-[#5E6AD2] text-white ring-4 ring-indigo-100 shadow-xs animate-pulse"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {step.isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span>{step.num}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 block truncate">
                    {step.stageTag}
                  </span>
                  <h4
                    className={`text-xs font-bold truncate leading-tight ${
                      step.isActive
                        ? step.num === 5 ? "text-red-700" : "text-[#5E6AD2]"
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
                className={`text-[11px] pl-8 leading-tight ${
                  step.isActive
                    ? step.num === 5 ? "text-red-900 font-semibold" : "text-indigo-950 font-medium"
                    : "text-gray-500"
                }`}
              >
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Expandable 10 Operational Stages Drawer */}
      {showDetailedStages && (
        <div className="mt-5 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Complete 10-Stage Operational Matrix
            </h4>
            <span className="text-[10px] text-gray-500">Government of India CPGRAMS SOP</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {tenStages.map((st, i) => (
              <div key={st.num} className="p-2.5 bg-gray-50 border border-gray-200/70 rounded-xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-white border border-gray-200 text-gray-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-gray-900 text-xs">{st.name}</span>
                    <span className="text-[9px] font-mono text-gray-400 bg-white px-1.5 py-0.2 rounded border border-gray-200">{st.phase}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
