"use client";

import React from "react";
import { ShieldCheck, Lock, CheckCircle2, User, EyeOff, FileText, CheckCircle, MessageSquare } from "lucide-react";

export function IdentityNetworkCanvas() {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-lg text-left font-sans space-y-5">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Citizen Privacy Shield
            </h3>
            <p className="text-xs text-slate-500">
              How your personal identity stays 100% private
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          ✓ Active Protection
        </span>
      </div>

      {/* Side by side: What You Share vs What Officer Sees */}
      <div className="space-y-3">
        {/* Section 1: What is Kept Hidden (Your Personal Data) */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-red-500" />
              <span>Kept 100% Hidden from Officer</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
              NEVER SHARED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200">
              <span className="text-red-500 font-bold">✕</span>
              <span>Your Real Name</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200">
              <span className="text-red-500 font-bold">✕</span>
              <span>Phone / Mobile No.</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200">
              <span className="text-red-500 font-bold">✕</span>
              <span>Aadhaar Number</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200">
              <span className="text-red-500 font-bold">✕</span>
              <span>Personal Email ID</span>
            </div>
          </div>
        </div>

        {/* Section 2: What the Resolving Officer Actually Sees */}
        <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#EA580C]" />
              <span>What the Officer Receives</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
              FACTS ONLY
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700 bg-white p-3 rounded-lg border border-orange-200 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Case ID:</span>
              <span className="font-bold text-[#EA580C]">CPG-892410 (Random)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-bold text-slate-800">Public Works / Roads</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Citizen Status:</span>
              <span className="font-bold text-emerald-700">✓ Verified Citizen</span>
            </div>
            <div className="pt-1.5 mt-1.5 border-t border-slate-100 text-[11px] text-slate-600 font-sans">
              &ldquo;Broken water pipeline leaking on Main MG Road for 5 days. Photos attached.&rdquo;
            </div>
          </div>
        </div>
      </div>

      {/* Communication & Retaliation-Free Guarantee */}
      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
        <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-emerald-950">Safe Masked Communication</p>
          <p className="text-emerald-800 text-[11px] leading-relaxed">
            Need to send more info? Chat directly with the officer through the portal without giving out your personal phone number.
          </p>
        </div>
      </div>
    </div>
  );
}
