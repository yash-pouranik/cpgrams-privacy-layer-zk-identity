"use client";

import React from "react";
import { MessageSquare, Bot, Scale, Shield, Sparkles, FileText, CheckCircle2, Lock, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function BentoSecurityGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 1. Large Card: Masked 2-Way Chat */}
      <div className="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -z-10 group-hover:bg-orange-500/10 transition-colors" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Zero Phone Leak
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Masked 2-Way Clarification Thread
          </h3>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg leading-relaxed">
            Officers can ask for additional location details or photos in real-time. Both sides communicate securely without revealing phone numbers, emails, or identities.
          </p>

          {/* Mini Mock Chat UI */}
          <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                OFF
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs max-w-md">
                <span className="font-semibold text-slate-900 block text-[11px]">Nodal Officer (PWD-001):</span>
                Please provide the nearest landmark on Sector 4 road to dispatch the repair team.
              </div>
            </div>

            <div className="flex items-start justify-end gap-2.5">
              <div className="p-2.5 rounded-lg bg-orange-600 text-white shadow-2xs max-w-md text-right">
                <span className="font-semibold text-orange-100 block text-[11px]">Citizen (Protected):</span>
                Opposite Community Hall Gate 2. GPS geotag attached in evidence file.
              </div>
              <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                YOU
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> End-to-end pseudonymous routing
          </span>
          <span className="font-mono text-[11px]">JWT Session Guard</span>
        </div>
      </div>

      {/* 2. Side Card: AI Drishti Triage Engine */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl -z-10 group-hover:bg-indigo-500/10 transition-colors" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              AI Drishti
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Sub-Second AI Auto-Routing
          </h3>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Multi-lingual NLP (Hindi, Hinglish, English) categorizes grievances and assigns them to the exact nodal officer within 2 seconds.
          </p>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Classification Accuracy:</span>
              <span className="font-mono font-bold text-indigo-600">98.4%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Average Routing Time:</span>
              <span className="font-mono font-bold text-emerald-600">1.2 seconds</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Ministry Mapping:</span>
              <span className="font-semibold text-slate-800">15+ Departments</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-slate-700 font-medium">Auto-Triage Active</span>
          <span className="font-mono text-[11px] text-indigo-600 font-semibold">Tier-1 Routing</span>
        </div>
      </div>

      {/* 3. Side Card: Evidence Locker & Tamper Sealing */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl -z-10 group-hover:bg-emerald-500/10 transition-colors" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              SHA-256
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Tamper-Proof Evidence Locker
          </h3>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Attach photos, invoices, and FIR copies. Every file is cryptographically hashed to prevent post-submission tampering.
          </p>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-format support (PDF, JPG, PNG)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Immutable timestamp on upload</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-slate-700 font-medium">Evidence Protection</span>
          <span className="font-mono text-[11px] text-emerald-600 font-semibold">Integrity Verified</span>
        </div>
      </div>

      {/* 4. Large Card: Court-Authorized Judicial Disclosure Gateway */}
      <div className="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl -z-10 group-hover:bg-slate-500/10 transition-colors" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Judicial Warrant Required
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Dual-Key Judicial Disclosure Gateway
          </h3>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg leading-relaxed">
            Officers cannot unmask a citizen. Only an independent Court Authority with a certified judicial order reference can authorize identity reveal. Every request creates an immutable, permanent audit log.
          </p>

          <div className="mt-6 grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">1. Officer Request</p>
              <p className="text-[11px] text-slate-500 mt-1">Requires official case justification and FIR ref.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">2. Judicial Verification</p>
              <p className="text-[11px] text-slate-500 mt-1">Signed order verified against authority key.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">3. Immutable Audit</p>
              <p className="text-[11px] text-slate-500 mt-1">Permanent record written to tamper-proof log.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/disclosure" className="inline-flex items-center gap-1 text-slate-900 font-semibold hover:text-orange-600 transition-colors">
            <span>Explore Disclosure Authority Portal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <span className="font-mono text-[11px] text-slate-400">Strict Audit Protocol</span>
        </div>
      </div>
    </div>
  );
}
