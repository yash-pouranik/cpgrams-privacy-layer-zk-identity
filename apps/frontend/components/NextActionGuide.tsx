"use client";

import { Sparkles, ArrowRight, MessageSquare, Star, Bell, FileText, CheckCircle2, HelpCircle, Scale, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NextActionGuideProps {
  status: string; // 'received' | 'under_process' | 'forwarded' | 'disposed' | 'appealed' (or legacy aliases)
  department?: string | null;
  feedbackSubmitted?: boolean;
  feedbackRating?: number;
  hasUnrepliedClarification?: boolean;
  onScrollToChat?: () => void;
  onScrollToFeedback?: () => void;
  onScrollToReminder?: () => void;
  onOpenReplyClarification?: () => void;
  onOpenAppealModal?: () => void;
}

export function NextActionGuide({
  status,
  department,
  feedbackSubmitted,
  feedbackRating,
  hasUnrepliedClarification,
  onScrollToChat,
  onScrollToFeedback,
  onScrollToReminder,
  onOpenReplyClarification,
  onOpenAppealModal,
}: NextActionGuideProps) {
  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");

  // Stage 10: Appeal Case Initiated
  if (normalized === "appealed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 text-white rounded-xl shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-red-950 uppercase tracking-wider flex items-center gap-1.5">
              Stage 10: First Appeal Under Appellate Authority (NAA) Review
            </h4>
            <p className="text-xs text-red-800 mt-0.5">
              Your grievance has escalated to a Joint Secretary rank Nodal Appellate Authority for independent verification.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-red-700 bg-white border border-red-200 px-3 py-1 rounded-lg shrink-0">
          Appellate Review Active
        </span>
      </div>
    );
  }

  // Stages 7-9: Disposed / Closed
  if (normalized === "disposed" || normalized === "resolved") {
    if (feedbackSubmitted) {
      const isLowRating = feedbackRating && feedbackRating <= 2;
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Grievance Disposed & Action Taken Report (ATR) Available
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Official resolution order has been uploaded. Your rating ({feedbackRating || 5} ★) is recorded.
              </p>
            </div>
          </div>

          {isLowRating && onOpenAppealModal && (
            <Button
              size="sm"
              onClick={onOpenAppealModal}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium shrink-0 h-8 px-3.5 shadow-xs"
            >
              <Scale className="w-3.5 h-3.5 mr-1" />
              <span>Initiate First Appeal</span>
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
            <Star className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              Stage 9: Rate Redressal & Review ATR
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              The nodal officer has uploaded the Action Taken Report (ATR). Please rate the resolution quality.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onScrollToFeedback && (
            <Button
              size="sm"
              onClick={onScrollToFeedback}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium h-8 px-3.5 shadow-xs"
            >
              <span>Rate Resolution</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Clarification active
  if (hasUnrepliedClarification) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#5E6AD2] text-white rounded-xl shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Stage 6: Officer Requested Ground Clarification
            </h4>
            <p className="text-xs text-indigo-800 mt-0.5">
              The assigned handling officer needs additional details to proceed with field action.
            </p>
          </div>
        </div>
        {onOpenReplyClarification && (
          <Button
            size="sm"
            onClick={onOpenReplyClarification}
            className="bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-medium shrink-0 h-8 px-3.5 shadow-xs"
          >
            <span>Reply to Officer</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>
    );
  }

  // Stage 5 & 6: Forwarded to Subordinate Field Unit
  if (normalized === "forwarded" || normalized === "in_progress") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Stage 5 & 6: Cascaded to Subordinate Field Unit
            </h4>
            <p className="text-xs text-blue-800 mt-0.5">
              {department || "Department"} ground grievance officer is investigating. You can send questions via Masked Chat.
            </p>
          </div>
        </div>
        {onScrollToChat && (
          <Button
            variant="outline"
            size="sm"
            onClick={onScrollToChat}
            className="bg-white border-blue-200 text-blue-800 hover:bg-blue-100 text-xs font-medium shrink-0 h-8 px-3.5"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Open Chat
          </Button>
        )}
      </div>
    );
  }

  // Stage 3 & 4: Under Process at Nodal Gateway
  if (normalized === "under_process" || normalized === "assigned") {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Stage 3 & 4: Under Process at {department || "Nodal"} Gateway
            </h4>
            <p className="text-xs text-indigo-800 mt-0.5">
              Public Grievance Officer has accepted jurisdiction and is mapping the issue to the ground redressal unit.
            </p>
          </div>
        </div>
        {onScrollToReminder && (
          <Button
            variant="outline"
            size="sm"
            onClick={onScrollToReminder}
            className="bg-white border-indigo-200 text-indigo-800 hover:bg-indigo-100 text-xs font-medium shrink-0 h-8 px-3.5"
          >
            <Bell className="w-3.5 h-3.5 mr-1" /> Send Reminder
          </Button>
        )}
      </div>
    );
  }

  // Stage 1 & 2: Received / Registered
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 text-white rounded-xl shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Stage 1 & 2: Received & Registered under Pairwise Identity
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Complaint registered and passed AI IGMS Screening. Awaiting initial Nodal Gateway verification.
          </p>
        </div>
      </div>
      {onScrollToReminder && (
        <Button
          variant="outline"
          size="sm"
          onClick={onScrollToReminder}
          className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium shrink-0 h-8 px-3.5"
        >
          <Bell className="w-3.5 h-3.5 mr-1" /> Send Reminder
        </Button>
      )}
    </div>
  );
}
