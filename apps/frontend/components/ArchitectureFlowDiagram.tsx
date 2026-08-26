"use client";

import React, { useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";

export function ArchitectureFlowDiagram() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "dataBoundary" | "legalDisclosure">("pipeline");

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-left font-sans space-y-8">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-[#EA580C] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
            System Flow Architecture
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-950 mt-1.5 tracking-tight">
            How Privacy-Preserving CPGRAMS Works
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end cryptographic separation between citizen identity and grievance handling
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "pipeline"
                ? "bg-white text-slate-950 font-bold shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Complete Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dataBoundary")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "dataBoundary"
                ? "bg-white text-slate-950 font-bold shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Privacy Barrier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("legalDisclosure")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "legalDisclosure"
                ? "bg-white text-slate-950 font-bold shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            3. Court Order Workflow
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FULL END-TO-END PIPELINE DIAGRAM */}
      {/* ========================================================================= */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 relative">
            {/* Stage 1: Citizen Authentication */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 relative group hover:border-orange-300 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    STAGE 01
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700">✓ Citizen</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Citizen Authentication
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Citizen enters Aadhaar / Mobile number on CivID SSO and receives a secure 1-time OTP.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Verified Proof:</div>
                <div className="font-bold text-emerald-700">Mock eKYC Authenticated</div>
                <div className="text-slate-500 text-[10px]">Real Citizen Confirmed</div>
              </div>
            </div>

            {/* Stage 2: CivID SSO Vault */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 relative group hover:border-orange-300 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-[#C2410C]">
                    STAGE 02
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700">Sealed Vault</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  CivID Identity Vault
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real identity is saved in isolated MySQL database. System calculates deterministic Pairwise ID.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Deterministic Hash:</div>
                <div className="font-bold text-[#EA580C] truncate">HMAC-SHA256(user:srv)</div>
                <div className="text-slate-500 text-[10px]">sub = pw_9f8a2b...</div>
              </div>
            </div>

            {/* Stage 3: Privacy Horizon Barrier */}
            <div className="p-5 rounded-xl bg-orange-50/50 border-2 border-dashed border-[#F6821F] flex flex-col justify-between space-y-3 relative group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                    STAGE 03
                  </span>
                  <span className="text-[10px] font-bold text-red-600">100% PII BLOCKED</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Privacy Horizon Barrier
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real name, phone, email and Aadhaar are strictly blocked from crossing into the grievance system.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-orange-200 text-[11px] font-mono text-slate-700 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Transit Data:</div>
                <div className="text-emerald-700 font-bold">✓ Pairwise ID Only</div>
                <div className="text-red-600 font-bold">✕ 0% Personal PII</div>
              </div>
            </div>

            {/* Stage 4: CPGRAMS Backend Engine */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 relative group hover:border-orange-300 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    STAGE 04
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700">CPGRAMS</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Grievance Ingestion
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates an unlinkable Case ID with a random nonce. Assigned to department officer.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Generated Case:</div>
                <div className="font-bold text-blue-700">CPG-892410</div>
                <div className="text-slate-500 text-[10px]">PWD / Water Pipeline</div>
              </div>
            </div>

            {/* Stage 5: Resolving Officer */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 relative group hover:border-orange-300 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    STAGE 05
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700">Redressal</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Officer Action &amp; Rating
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Officer fixes problem, communicates via Masked Chat. Citizen rates resolution (1-5★).
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Redressal SLA:</div>
                <div className="font-bold text-emerald-700">&lt; 14 Days Timebound</div>
                <div className="text-slate-500 text-[10px]">Zero Harassment Risk</div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-medium text-slate-200">
                <strong>Core Guarantee:</strong> Identity Verification ≠ Identity Disclosure. The officer never knows who filed the complaint.
              </span>
            </div>
            <span className="text-slate-400 text-[11px] font-mono shrink-0">
              HMAC-SHA256 &bull; OIDC Provider &bull; REST API
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRIVACY BARRIER COMPARISON */}
      {/* ========================================================================= */}
      {activeTab === "dataBoundary" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Side A: What Stays Sealed in SSO Server */}
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Inside CivID Identity Vault (National Custodian)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                SEALED CUSTODIAN
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The SSO Server acts as the sole custodian of citizen data. This database is completely isolated from CPGRAMS and the public internet.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Citizen Real Name:</span>
                <span className="font-bold text-slate-900">Rahul Sharma</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-bold text-slate-900">+91-9876543210</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Aadhaar Hash:</span>
                <span className="font-bold text-slate-900">1234-5678-9012 (SHA-256)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-bold text-slate-900">rahul.sharma@example.com</span>
              </div>
            </div>
          </div>

          {/* Side B: What Resolving Officers See in CPGRAMS */}
          <div className="p-6 rounded-xl bg-orange-50/40 border border-orange-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-200">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Inside CPGRAMS Redressal Portal (Department Console)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
                FACTS &amp; EVIDENCE ONLY
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The resolving officer receives only actionable problem details. Personal identity fields are 100% redacted at the protocol level.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white border border-orange-200 flex justify-between items-center">
                <span className="text-slate-500">Grievance Case ID:</span>
                <span className="font-bold text-[#EA580C]">CPG-892410 (Unlinkable)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-orange-200 flex justify-between items-center">
                <span className="text-slate-500">Citizen Identity:</span>
                <span className="font-bold text-emerald-700">✓ Verified Indian Citizen</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-orange-200 flex justify-between items-center">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-slate-900">Public Works Department (PWD)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-orange-200 flex justify-between items-center">
                <span className="text-slate-500">Complaint Details:</span>
                <span className="font-bold text-slate-900">Broken Pipeline on MG Road</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEGAL COURT ORDER DISCLOSURE WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === "legalDisclosure" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-sm font-bold text-slate-900">
              Judicially-Supervised Identity Disclosure
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              To prevent abuse while upholding the rule of law, a citizen&apos;s real identity can NEVER be revealed by an officer. It requires a formal High Court or Supreme Court order verified by an independent Disclosure Authority.
            </p>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <span className="text-xs font-mono font-bold text-[#EA580C]">STEP 1</span>
              <h5 className="text-xs font-bold text-slate-900">Judicial Warrant</h5>
              <p className="text-[11px] text-slate-600">
                Investigating agency obtains a signed High Court order (e.g. HC/DEL/2026/8912).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <span className="text-xs font-mono font-bold text-[#EA580C]">STEP 2</span>
              <h5 className="text-xs font-bold text-slate-900">Authority Review</h5>
              <p className="text-[11px] text-slate-600">
                Independent Disclosure Authority verifies court order reference and digital authorization.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <span className="text-xs font-mono font-bold text-[#EA580C]">STEP 3</span>
              <h5 className="text-xs font-bold text-slate-900">Cryptographic Lookup</h5>
              <p className="text-[11px] text-slate-600">
                SSO executes a secure, one-time reverse identity lookup under verified court reference.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <span className="text-xs font-mono font-bold text-[#EA580C]">STEP 4</span>
              <h5 className="text-xs font-bold text-slate-900">Immutable Audit Trail</h5>
              <p className="text-[11px] text-slate-600">
                Timestamp, judge ref, and requester ID are permanently recorded in append-only audit log.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
