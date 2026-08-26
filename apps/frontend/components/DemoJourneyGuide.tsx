"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, Shield, UserCheck, Scale, Search, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoJourneyGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const router = useRouter();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const steps = [
    {
      num: "1",
      title: "Citizen SSO Login",
      desc: "Authenticate via CivID SSO",
      link: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/login`,
      isExternal: true,
      credentials: [
        { label: "Aadhaar", value: "123456789012" },
        { label: "OTP", value: "Console Box / 123456" },
      ],
      icon: Shield,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      num: "2",
      title: "Lodge Grievance",
      desc: "File complaint with 1-Click Demo Fill",
      link: "/grievance/new",
      isExternal: false,
      credentials: [],
      icon: Sparkles,
      color: "text-orange-600 bg-orange-50",
    },
    {
      num: "3",
      title: "Officer Redressal Desk",
      desc: "Update status, upload report, masked chat",
      link: "/officer/login",
      isExternal: false,
      credentials: [
        { label: "Officer ID", value: "PWD-001" },
        { label: "Password", value: "Officer@123" },
      ],
      icon: UserCheck,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      num: "4",
      title: "Public Status Check",
      desc: "Check timeline without login",
      link: "/status",
      isExternal: false,
      credentials: [],
      icon: Search,
      color: "text-blue-600 bg-blue-50",
    },
    {
      num: "5",
      title: "Disclosure Authority",
      desc: "Judicial court-order identity reveal",
      link: "/disclosure",
      isExternal: false,
      credentials: [
        { label: "Auth Secret", value: "authority-secret-change-me" },
      ],
      icon: Scale,
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-full shadow-lg border border-slate-700 text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>⚡ Evaluator Demo Tour</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="w-[360px] sm:w-[400px] bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Guide Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold leading-none">Evaluator & Judge Guided Tour</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">5-Step Privacy Redressal Loop</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps List */}
          <div className="max-h-[380px] overflow-y-auto p-3 space-y-2.5">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="p-2.5 border border-slate-100 bg-slate-50/70 rounded-xl hover:border-slate-300 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${s.color}`}>
                        {s.num}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                    </div>

                    {s.isExternal ? (
                      <a
                        href={s.link}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                      >
                        Launch <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link
                        href={s.link}
                        onClick={() => setIsOpen(false)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mb-1.5">{s.desc}</p>

                  {s.credentials.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/60">
                      {s.credentials.map((c) => {
                        const copyId = `${s.num}-${c.label}`;
                        return (
                          <button
                            key={c.label}
                            onClick={() => handleCopy(c.value, copyId)}
                            className="text-[10px] bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 px-2 py-0.5 rounded flex items-center gap-1 font-mono transition"
                          >
                            <span className="text-slate-400 font-sans">{c.label}:</span>
                            <span className="font-semibold">{c.value}</span>
                            {copiedKey === copyId ? (
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              🛡️ Pairwise HMAC Isolation • Zero Citizen PII Leak
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
