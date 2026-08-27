"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PenTool, Shield, Lock, Cpu, EyeOff, Scale, Sparkles, CheckCircle2, Info } from "lucide-react";

export function PencilArchitectureShowcase() {
  const [activePin, setActivePin] = useState<number | null>(null);

  const pins = [
    {
      id: 1,
      top: "35%",
      left: "22%",
      label: "1. SSO Identity Vault",
      title: "Real Identity Sealed at Custodian",
      desc: "Citizen verifies via Aadhaar + Mobile OTP. Real phone number, name, and UIDAI hash remain sealed inside the air-gapped Identity Vault.",
      icon: Lock,
      color: "border-orange-500 text-orange-600 bg-orange-50",
    },
    {
      id: 2,
      top: "40%",
      left: "44%",
      label: "2. Cryptographic Hash Machine",
      title: "256-Bit Pairwise Derivation",
      desc: "HMAC-SHA256 algorithm transforms the citizen UID + service secret into a deterministic pseudonymous pairwise token. Unlinkable across departments.",
      icon: Cpu,
      color: "border-indigo-500 text-indigo-600 bg-indigo-50",
    },
    {
      id: 3,
      top: "35%",
      left: "76%",
      label: "3. Redressal Officer Desk",
      title: "Investigation on Merit Only",
      desc: "The field officer receives only an anonymous Case ID (CPG-7X9K2) and factual evidence. Retaliation or harassment is impossible.",
      icon: EyeOff,
      color: "border-emerald-500 text-emerald-600 bg-emerald-50",
    },
    {
      id: 4,
      top: "72%",
      left: "86%",
      label: "4. Judicial Court Order Gateway",
      title: "Court-Authorized Unsealing",
      desc: "Identity can ONLY be revealed pursuant to a certified, signed judicial court warrant with permanent cryptographic audit logging.",
      icon: Scale,
      color: "border-slate-800 text-slate-900 bg-slate-100",
    },
  ];

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-slate-300 shadow-xl overflow-hidden text-slate-900">
      
      {/* Top Sketchbook Ribbon Header */}
      <div className="px-6 py-4 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <PenTool className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-950 font-mono tracking-tight flex items-center gap-2">
              <span>HOW THE PRIVACY HORIZON WORKS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Architectural Blueprint
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Hand-drawn architectural workflow explaining zero-knowledge identity separation.
            </p>
          </div>
        </div>

        {/* Quick legend pills */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-orange-500" /> SSO Vault
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> HMAC Engine
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Officer Desk
          </span>
        </div>
      </div>

      {/* Main Pencil Artwork Container with Interactive Hotspots */}
      <div className="relative p-3 sm:p-6 bg-[#FAFAF9] flex flex-col items-center justify-center overflow-hidden">
        
        {/* The Hand-Drawn Pencil Art Diagram */}
        <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-white">
          <img
            src="/architecture_pencil_sketch.jpg"
            alt="Hand-drawn architectural pencil sketch illustrating the Privacy-Preserving CPGRAMS identity isolation system"
            className="w-full h-auto object-contain block"
          />

          {/* Interactive Inspection Hotspot Pins */}
          {pins.map((pin) => {
            const Icon = pin.icon;
            const isSelected = activePin === pin.id;

            return (
              <div
                key={pin.id}
                style={{ top: pin.top, left: pin.left }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
              >
                <button
                  onClick={() => setActivePin(isSelected ? null : pin.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 shadow-lg transition-all transform hover:scale-105 cursor-pointer font-mono text-xs font-bold ${
                    isSelected
                      ? `${pin.color} ring-4 ring-orange-400/30 scale-110`
                      : "bg-white/95 border-slate-400 text-slate-900 hover:border-orange-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{pin.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Dynamic Detail Card when a Hotspot is selected */}
        {activePin && (
          <div className="mt-4 w-full max-w-4xl p-4 rounded-xl bg-white border-2 border-slate-300 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
            {(() => {
              const current = pins.find((p) => p.id === activePin);
              if (!current) return null;
              const Icon = current.icon;

              return (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border ${current.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">{current.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{current.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePin(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 cursor-pointer"
                  >
                    Close &times;
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {!activePin && (
          <div className="mt-3 text-center text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Click any labeled pin on the diagram above to inspect how that security stage operates.</span>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Architectural Guarantee:</strong> The investigating officer never has cryptographic access to citizen identity.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 font-semibold">
          Deterministic HMAC Sealing &bull; Unlinkable Case IDs
        </span>
      </div>

    </div>
  );
}
