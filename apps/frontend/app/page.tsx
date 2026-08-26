"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, Shield, Eye, EyeOff, Phone, Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AshokaEmblem } from "@/components/AshokaEmblem";
import { QuickStatusWidget } from "@/components/QuickStatusWidget";

/* ─── Data ────────────────────────────────────────────────────────────────── */

const steps = [
  { num: "01", title: "Verify via OTP", desc: "Aadhaar or Mobile OTP proves you're a genuine citizen.", note: "Identity stays sealed" },
  { num: "02", title: "Describe the Issue", desc: "Pick a department, describe what happened, attach evidence.", note: "Instant Case ID generated" },
  { num: "03", title: "Track & Resolve", desc: "Officer investigates within 14 days. Rate & appeal if needed.", note: "Free appeal if unsatisfied" },
];

const categories = [
  { name: "Roads & Potholes", dept: "PWD", color: "border-orange-400" },
  { name: "Water & Drainage", dept: "PWD", color: "border-blue-400" },
  { name: "Electricity & Power", dept: "PWD", color: "border-amber-400" },
  { name: "Hospitals & Health", dept: "Health", color: "border-rose-400" },
  { name: "Schools & Scholarships", dept: "Education", color: "border-indigo-400" },
  { name: "Pensions & Welfare", dept: "Social", color: "border-emerald-400" },
];

const faqs = [
  {
    q: "Is there any fee to file a grievance?",
    a: "No. CPGRAMS is 100% free. The Government of India does not charge any fee for lodging or resolving grievances.",
  },
  {
    q: "Will the officer know my phone number or name?",
    a: "No. Your phone number, real name, and Aadhaar are never shared. The officer only sees an anonymous Case ID and your issue details.",
  },
  {
    q: "What if I'm not satisfied with the resolution?",
    a: "Rate it 1-star and the portal automatically lets you file a First Appeal to senior authorities.",
  },
];

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/login`;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-[#F6821F]/20 selection:text-slate-950 font-sans">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO — punchy, breathing, minimal                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="min-h-[52vh] flex flex-col items-center justify-center text-center px-4 sm:px-8 py-16 border-b border-slate-100">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#C2410C] font-semibold text-[11px] border border-orange-200">
            Government of India &bull; 100% Privacy Protected
          </span>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-950">
            File a complaint.{" "}
            <span className="text-[#EA580C]">Stay anonymous.</span>
          </h1>

          {/* Sub */}
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Lodge grievances with any Government Department — privately, without fear of retaliation.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-[#F6821F] hover:bg-[#E06D0C] text-slate-950 font-bold text-sm px-8 py-6 rounded-xl shadow-sm cursor-pointer"
            >
              <a href={loginUrl} className="flex items-center justify-center gap-2">
                Lodge Grievance <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-slate-700 border-slate-200 font-semibold text-sm px-8 py-6 rounded-xl"
            >
              <Link href="/status">Track Status</Link>
            </Button>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-5 pt-3 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Aadhaar eKYC Verified</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Zero Retaliation</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 100% Free Service</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. QUICK STATUS CHECKER                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-8 px-4 sm:px-8 max-w-3xl mx-auto w-full -mt-8 relative z-20">
        <QuickStatusWidget />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. THREE STEPS                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="process" className="py-14 px-4 sm:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#EA580C]">How it works</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">3 steps. 2 minutes. Done.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.num} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 text-left space-y-2.5 hover:shadow-sm transition-shadow">
              <span className="text-xs font-mono font-bold text-[#EA580C]">{s.num}</span>
              <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              <p className="text-[11px] font-semibold text-emerald-600 pt-1 border-t border-slate-100">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. CATEGORIES — compact pills                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-12 px-4 sm:px-8 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#EA580C]">Coverage</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">What can you complain about?</h2>
            <p className="text-xs text-slate-500">100+ Central Ministries, Departments, and State Governments.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.name} className={`flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-100 border-l-[3px] ${c.color} shadow-2xs`}>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{c.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.dept}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. WHY PRIVACY — clean before/after comparison                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="privacy" className="py-14 px-4 sm:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#EA580C]">Your protection</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Why we hide your identity</h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">Citizens hesitate when officers can see their name. We changed that.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Traditional */}
          <div className="p-6 rounded-2xl border border-red-100 bg-red-50/30 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-red-800">Traditional System</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-red-700/80">
              <li className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">&times;</span> Officer sees your real name &amp; phone</li>
              <li className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">&times;</span> Risk of pressure to withdraw complaint</li>
              <li className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">&times;</span> Complaint judged by who you are</li>
            </ul>
          </div>

          {/* Privacy-Protected */}
          <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-800">Privacy-Protected (This Portal)</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-emerald-700/80">
              <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span> Officer sees only anonymous Case ID</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span> Zero retaliation — identity sealed by SSO</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span> Complaint judged purely on evidence</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          Identity can only be revealed through a Court-authorized judicial warrant — every reveal is permanently logged.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6. FAQ — data-driven, compact                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-14 px-4 sm:px-8 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#EA580C]">Help</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-sm font-bold text-slate-900 text-left hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 7. FOOTER — merged helpline + portals + NIC                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          {/* Top row: brand + helpline */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <AshokaEmblem size={32} />
              <div>
                <p className="font-extrabold text-white text-sm">CPGRAMS</p>
                <p className="text-[11px] text-slate-500">Centralised Public Grievance Redress and Monitoring System</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-[#F6821F]" />
              <span className="font-bold">1800-11-4000</span>
              <span className="text-slate-500">— Free 24&times;7 Helpline</span>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 pb-8">
            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Citizen</h5>
              <ul className="space-y-1.5">
                <li><a href={loginUrl} className="hover:text-white transition-colors">Lodge Grievance</a></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Track Status</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">My Dashboard</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Portals</h5>
              <ul className="space-y-1.5">
                <li><Link href="/officer/login" className="hover:text-white transition-colors">Officer Portal</Link></li>
                <li><Link href="/disclosure" className="hover:text-white transition-colors">Disclosure Authority</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Government</h5>
              <ul className="space-y-1.5">
                <li><a href="https://dpg.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Directorate of PG</a></li>
                <li><a href="https://darpg.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">DARPG</a></li>
                <li><a href="https://rtionline.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">RTI Online</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">On this page</h5>
              <ul className="space-y-1.5">
                <li><a href="#process" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#privacy" className="hover:text-white transition-colors">Why Privacy</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
            <p>
              Designed &amp; hosted by <strong>National Informatics Centre (NIC)</strong>, MeitY. Content owned by <strong>DARPG</strong>, Government of India.
            </p>
            <p>
              Powered by <strong className="text-slate-400">CivID Privacy Layer</strong> &bull; Built for Build What Moves India
            </p>
          </div>
        </div>

        {/* Tricolor */}
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
      </footer>
    </div>
  );
}
