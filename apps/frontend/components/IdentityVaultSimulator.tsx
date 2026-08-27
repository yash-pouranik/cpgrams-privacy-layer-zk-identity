"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, RefreshCw, Key, FileCheck, CheckCircle2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IdentityVaultSimulator() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [simSeed, setSimSeed] = useState<number>(1);

  const mockUsers = [
    { name: "Rahul Sharma", aadhaar: "1234 •••• 9012", phone: "+91 98765 •••••", dept: "Public Works (PWD)", caseId: "CPG-7X9K2", hash: "9e4f...3b1a" },
    { name: "Priya Patel", aadhaar: "9876 •••• 1098", phone: "+91 94221 •••••", dept: "Health & Family Welfare", caseId: "CPG-4M8P9", hash: "a7c2...8d4e" },
    { name: "Amit Verma", aadhaar: "1111 •••• 3333", phone: "+91 91234 •••••", dept: "Education & Scholarships", caseId: "CPG-2V6N5", hash: "f1d0...e882" },
  ];

  const currentUser = mockUsers[simSeed % mockUsers.length];

  const handleSimulateNew = () => {
    setIsHashing(true);
    setTimeout(() => {
      setSimSeed((prev) => prev + 1);
      setIsHashing(false);
    }, 400);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all text-slate-900">
      {/* Top Header / Status Bar */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tight text-slate-800 uppercase font-mono">
            CivID Privacy Horizon Simulator
          </span>
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
            HMAC-SHA256 Deterministic Sealing
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSimulateNew}
          disabled={isHashing}
          className="h-8 text-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-200 gap-1.5 shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isHashing ? "animate-spin text-orange-600" : "text-slate-500"}`} />
          <span>Simulate Another Citizen</span>
        </Button>
      </div>

      {/* Simulator 3-Stage Pipeline Grid */}
      <div className="p-5 sm:p-6 grid lg:grid-cols-3 gap-4 lg:gap-3 items-stretch relative">
        
        {/* STAGE 1: Citizen Identity (Sealed in SSO Vault) */}
        <div 
          onClick={() => setActiveStep(0)}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeStep === 0 
              ? "bg-orange-50/40 border-orange-300 ring-2 ring-orange-200/60 shadow-sm" 
              : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-orange-600 uppercase tracking-wider">
                Stage 1 &bull; SSO Identity Vault
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Lock className="w-2.5 h-2.5" /> Authenticated
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Aadhaar: {currentUser.aadhaar}</p>
              <p className="text-xs text-slate-500 font-mono">Mobile: {currentUser.phone}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>eKYC Verification:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> UIDAI Verified
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Vault Security:</span>
                <span className="text-slate-800 font-mono">Isolated Enclave</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">Real Identity</span>
            <span className="text-orange-600 font-semibold">Never leaves SSO</span>
          </div>
        </div>

        {/* STAGE 2: The Cryptographic Barrier (HMAC-SHA256) */}
        <div 
          onClick={() => setActiveStep(1)}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
            activeStep === 1 
              ? "bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-200/60 shadow-sm" 
              : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-wider">
                Stage 2 &bull; Privacy Barrier
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Key className="w-2.5 h-2.5" /> 256-Bit Secret
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">Pairwise Token Generation</p>
              <p className="text-[11px] text-slate-500 font-mono mt-1 bg-white p-2 rounded border border-slate-200 truncate">
                pairwiseId = HMAC(UID, SECRET)
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Pairwise Token:</span>
                <span className="font-mono text-indigo-600 font-bold">{currentUser.hash}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Unlinkability:</span>
                <span className="text-emerald-600 font-semibold">Salted Nonce</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">One-way Sealing</span>
            <span className="text-indigo-600 font-semibold">Zero PII Transferred</span>
          </div>
        </div>

        {/* STAGE 3: Redressal Officer Console (Protected View) */}
        <div 
          onClick={() => setActiveStep(2)}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeStep === 2 
              ? "bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-200/60 shadow-sm" 
              : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                Stage 3 &bull; Officer Console
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                <EyeOff className="w-2.5 h-2.5" /> Identity Sealed
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900 font-mono text-emerald-700">{currentUser.caseId}</p>
              <p className="text-xs text-slate-600 font-medium mt-0.5">{currentUser.dept}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>Citizen Name:</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 text-[10px] font-bold">
                  [REDACTED]
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Phone / Aadhaar:</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 text-[10px] font-bold">
                  [UNAVAILABLE]
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Investigation:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> Evidence Only
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">Retaliation Risk</span>
            <span className="text-emerald-700 font-bold">0.00%</span>
          </div>
        </div>

      </div>

      {/* Bottom Explainer Bar */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Architectural Guarantee:</strong> CPGRAMS backend database never receives nor stores citizen phone, name, or Aadhaar.
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono shrink-0">
          RFC-7519 &bull; OIDC Pairwise Sub
        </span>
      </div>
    </div>
  );
}
