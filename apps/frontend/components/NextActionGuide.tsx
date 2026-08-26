"use client";

import { Sparkles, ArrowRight, MessageSquare, Star, Bell, FileText, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NextActionGuideProps {
  status: string; // 'pending' | 'assigned' | 'in_progress' | 'resolved'
  department?: string | null;
  feedbackSubmitted?: boolean;
  hasUnrepliedClarification?: boolean;
  onScrollToChat?: () => void;
  onScrollToFeedback?: () => void;
  onScrollToReminder?: () => void;
  onOpenReplyClarification?: () => void;
}

export function NextActionGuide({
  status,
  department,
  feedbackSubmitted,
  hasUnrepliedClarification,
  onScrollToChat,
  onScrollToFeedback,
  onScrollToReminder,
  onOpenReplyClarification,
}: NextActionGuideProps) {
  if (status === "resolved") {
    if (feedbackSubmitted) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Grievance Formally Resolved
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Your satisfaction feedback has been recorded into the national quality audit registry.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-200 px-3 py-1 rounded-lg shrink-0">
            Case Closed & Verified
          </span>
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
              Next Step: Rate Grievance Redressal
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              The nodal officer has marked your issue as resolved. Please submit your 1-5 star review.
            </p>
          </div>
        </div>
        {onScrollToFeedback && (
          <Button
            size="sm"
            onClick={onScrollToFeedback}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shrink-0 h-8 px-3.5 shadow-xs"
          >
            <span>Rate Resolution</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>
    );
  }

  if (hasUnrepliedClarification) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#5E6AD2] text-white rounded-xl shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Action Required: Officer Requested Clarification
            </h4>
            <p className="text-xs text-indigo-800 mt-0.5">
              The assigned officer needs additional info to proceed. Your identity remains protected.
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

  if (status === "in_progress") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Investigation in Progress
            </h4>
            <p className="text-xs text-blue-800 mt-0.5">
              {department || "Department"} officer is taking field/administrative action. You can send questions anytime via Masked Chat.
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

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 text-white rounded-xl shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Grievance Awaiting Officer Review
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Your complaint has been logged under Pairwise ID. If urgent, you can send an official reminder below.
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
