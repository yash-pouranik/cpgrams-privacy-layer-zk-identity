"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  Eye, 
  EyeOff, 
  Phone, 
  Lock, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  Building2, 
  Scale, 
  Sparkles, 
  ArrowUpRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CivIDLogo } from "@/components/CivIDLogo";
import { QuickStatusWidget } from "@/components/QuickStatusWidget";
import { IdentityVaultSimulator } from "@/components/IdentityVaultSimulator";
import { BentoSecurityGrid } from "@/components/BentoSecurityGrid";
import { HeroBackgroundEffects } from "@/components/HeroBackgroundEffects";
import { PencilArchitectureShowcase } from "@/components/PencilArchitectureShowcase";

/* ─── Static Data ─────────────────────────────────────────────────────────── */

const steps = [
  { 
    num: "01", 
    title: "Authenticate via CivID SSO", 
    desc: "Aadhaar eKYC or OTP proves you are a genuine citizen. Your credentials stay strictly within the isolated SSO vault.", 
    note: "Identity Never Leaves SSO" 
  },
  { 
    num: "02", 
    title: "Deterministic Sealing & Case Filing", 
    desc: "A 256-bit pairwise hash creates an anonymous Case ID. AI Drishti auto-routes the grievance to the exact nodal officer.", 
    note: "Instant Non-Linkable Case ID" 
  },
  { 
    num: "03", 
    title: "Merit Redressal & Two-Way Chat", 
    desc: "Officers investigate based on uploaded evidence and clarify doubts via masked chat without ever knowing your identity.", 
    note: "14-Day Redressal Guarantee" 
  },
];

const departments = [
  { name: "Public Works (PWD)", cases: "Roads, Bridges & Potholes", badge: "High Priority" },
  { name: "Health & Family Welfare", cases: "Hospitals, Clinics & Medicine", badge: "Active" },
  { name: "Power & Energy", cases: "Grid Outages & Billing", badge: "24x7 Redressal" },
  { name: "School & Higher Education", cases: "Scholarships & Facilities", badge: "Direct Redressal" },
  { name: "Road Transport & Highways", cases: "NHAI Tolls & Signage", badge: "Central" },
  { name: "Social Justice & Welfare", cases: "Pensions & DBT Transfers", badge: "Fast-Track" },
];

const faqs = [
  {
    q: "How does the portal guarantee that the officer will never know my identity?",
    a: "Our CivID privacy architecture completely isolates the identity database from the grievance database. The officer only receives a pseudonymous pairwise Case ID (e.g. CPG-7X9K2). Even if a malicious officer inspects the database, your name, phone number, and Aadhaar do not exist in the grievance system.",
  },
  {
    q: "Is there any fee to file a grievance on CPGRAMS?",
    a: "No. CPGRAMS is a 100% free public service provided by the Government of India. There are zero charges for filing, tracking, or appealing grievances.",
  },
  {
    q: "Can the officer retaliate or contact me on my personal phone?",
    a: "No. Because the officer never receives your phone number, direct out-of-band harassment is impossible. All communications happen inside the built-in Masked Clarification Thread.",
  },
  {
    q: "Under what conditions can citizen identity ever be unmasked?",
    a: "Identity can ONLY be revealed pursuant to a certified Court Order signed by a judicial authority (e.g. in cases of severe national security or criminal fraud). Every unmasking attempt generates an immutable, permanent entry in the public audit trail.",
  },
  {
    q: "What if I am not satisfied with the officer's resolution?",
    a: "You can submit a 1-to-5 star rating upon resolution. Any rating under 3 stars unlocks an instant one-click First Appeal directly to the Appellate Authority.",
  },
];

/* ─── Main Landing Page Component ─────────────────────────────────────────── */

export default function LandingPage() {
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/login`;
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activePersona, setActivePersona] = useState<"citizen" | "officer" | "judiciary">("citizen");
  const [heroShowcase, setHeroShowcase] = useState<"pencil" | "simulator">("pencil");

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-orange-500/20 selection:text-orange-950 font-sans">
      
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/70 via-white to-white overflow-hidden">
        
        {/* Dynamic High-Trust Background Effects */}
        <HeroBackgroundEffects />

        <div className="max-w-6xl mx-auto space-y-8 text-center relative z-10">
          
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-800">
            <span className="flex h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
            <span>Government of India</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-orange-600 font-bold">CivID Zero-Knowledge Privacy Architecture</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-slate-950">
              File a grievance fearlessly. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent">
                Your identity is sealed in the vault.
              </span>
            </h1>
            <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
              Redress public issues with any Central Ministry or State Department. Verified via Aadhaar eKYC, but your real identity is never exposed to the investigating officer.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <a href={loginUrl} className="flex items-center justify-center gap-2">
                <span>Lodge Protected Grievance</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-slate-800 border-slate-300 hover:bg-slate-50 font-semibold text-sm px-8 py-6 rounded-xl shadow-2xs"
            >
              <Link href="/status">Track Grievance Status</Link>
            </Button>
          </div>

          {/* Trust Guarantees Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-600" /> Aadhaar eKYC Authenticated</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-orange-600" /> 0% Officer Identity Leak</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> 14-Day Redressal SLA</span>
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-600" /> 100% Free Public Service</span>
          </div>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* PRIMARY SHOWCASE: PENCIL SKETCH ARTWORK & SIMULATOR        */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <div className="pt-6 max-w-5xl mx-auto space-y-4">
            
            {/* Mode Switcher Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
                <button
                  onClick={() => setHeroShowcase("pencil")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    heroShowcase === "pencil"
                      ? "bg-white text-slate-950 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>✏️ Hand-Drawn Architecture Blueprint</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-mono">NEW</span>
                </button>
                <button
                  onClick={() => setHeroShowcase("simulator")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    heroShowcase === "simulator"
                      ? "bg-white text-slate-950 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>⚡ Interactive 3-Stage Simulator</span>
                </button>
              </div>
            </div>

            {/* Display Selected Showcase */}
            {heroShowcase === "pencil" ? (
              <PencilArchitectureShowcase />
            ) : (
              <IdentityVaultSimulator />
            )}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. STATS & KEY METRICS RIBBON (1Password High-Trust Style)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-orange-400 font-mono">0.00%</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Officer PII Access</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">100%</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Retaliation-Proof</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono">14 Days</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Statutory Redressal SLA</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-mono">256-Bit</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">HMAC Cryptographic Sealing</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. THREE-STEP CRYPTOGRAPHIC PIPELINE                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="process" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-14 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-600 font-mono">
            How The Privacy Layer Operates
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Verify the citizen. Protect the identity.
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
            The Government needs to verify that you are a genuine citizen. The officer investigating your complaint does not need to know who you are.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div 
              key={s.num} 
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <span className="inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                  STEP {s.num}
                </span>
                <h3 className="text-lg font-bold text-slate-950 leading-snug">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{s.note}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Integrated Ministries Coverage Grid */}
        <div className="mt-14 pt-10 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Integrated Central Ministries &amp; State Departments
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                AI Drishti provides instant auto-routing across 100+ government jurisdictions.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full w-fit">
              100% Coverage Enabled
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {departments.map((dept) => (
              <div 
                key={dept.name}
                className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-orange-300 hover:shadow-sm transition-all text-left space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-orange-50 group-hover:text-orange-700 transition-colors">
                    {dept.badge}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-snug pt-1">{dept.name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{dept.cases}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. 1PASSWORD-STYLE BENTO GRID FEATURE SHOWCASE                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/70 border-y border-slate-200">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-600 font-mono">
              Core Security Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Engineered for absolute trust and transparency
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Every grievance is backed by tamper-proof evidence, AI auto-classification, and court-authorized disclosure protocols.
            </p>
          </div>

          <BentoSecurityGrid />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. PERSONA WALKTHROUGH (Citizen vs Officer vs Judiciary)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-600 font-mono">
            Multi-Stakeholder Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Designed for every participant in the ecosystem
          </h2>
        </div>

        {/* Persona Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActivePersona("citizen")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activePersona === "citizen" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Everyday Citizens
            </button>
            <button
              onClick={() => setActivePersona("officer")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activePersona === "officer" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Redressal Officers
            </button>
            <button
              onClick={() => setActivePersona("judiciary")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activePersona === "judiciary" 
                  ? "bg-white text-slate-950 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Judicial Authority
            </button>
          </div>
        </div>

        {/* Persona Card Content */}
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-md">
          {activePersona === "citizen" && (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold">
                  <UserCheck className="w-3.5 h-3.5" /> Citizen Protection Guarantee
                </div>
                <h3 className="text-2xl font-bold text-slate-950">Fearless Civic Participation</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Complain about local potholes, corrupt practices, hospital negligence, or ration delays without the fear of retaliatory visits or phone harassment.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> One-click Aadhaar/Mobile OTP sign in
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Live status tracking and instant SMS/Email updates
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Right to Appeal if redressal is unsatisfactory
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 py-5 rounded-lg shadow-sm">
                    <a href={loginUrl}>Lodge Your Grievance Now</a>
                  </Button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <p className="font-bold text-slate-900">What You See on Your Dashboard:</p>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between"><span>Case ID:</span><span className="font-bold text-orange-600">CPG-8F2K4</span></div>
                  <div className="flex justify-between"><span>Status:</span><span className="text-emerald-600 font-bold">INVESTIGATION IN PROGRESS</span></div>
                  <div className="flex justify-between"><span>Assigned Officer:</span><span className="text-slate-800">Executive Engineer (PWD-001)</span></div>
                  <div className="flex justify-between"><span>Resolution SLA:</span><span className="text-slate-800">14 Days Remaining</span></div>
                </div>
              </div>
            </div>
          )}

          {activePersona === "officer" && (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5" /> Officer Workflow Portal
                </div>
                <h3 className="text-2xl font-bold text-slate-950">Pure Merit-Based Redressal</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Focus 100% on factual evidence and civic repairs. No political influence, no citizen bias, and zero spam complaints due to mandatory eKYC verification.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Pre-verified genuine citizen complaints (Zero spam bots)
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Integrated GIS location and photo evidence viewer
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Masked clarification thread for quick follow-ups
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild variant="outline" className="text-slate-800 border-slate-300 font-bold text-xs px-6 py-5 rounded-lg">
                    <Link href="/officer/login">Access Officer Portal</Link>
                  </Button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <p className="font-bold text-slate-900">What The Officer Sees:</p>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between"><span>Case ID:</span><span className="font-bold text-indigo-600">CPG-8F2K4</span></div>
                  <div className="flex justify-between"><span>Citizen Name:</span><span className="text-slate-400 font-bold">[SEALED BY CIVID]</span></div>
                  <div className="flex justify-between"><span>Citizen Phone:</span><span className="text-slate-400 font-bold">[REDACTED]</span></div>
                  <div className="flex justify-between"><span>Evidence:</span><span className="text-emerald-600 font-bold">2 Photos Attached (GPS Verified)</span></div>
                </div>
              </div>
            </div>
          )}

          {activePersona === "judiciary" && (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold">
                  <Scale className="w-3.5 h-3.5" /> Judicial Court Authority
                </div>
                <h3 className="text-2xl font-bold text-slate-950">Auditable Legal Disclosure</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  In extreme cases involving verified court warrants (e.g. criminal fraud or national security), the Disclosure Authority can unmask the identity map with full cryptographic audit logging.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" /> Strict court order verification before unmasking
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" /> Immutable, append-only cryptographic audit logs
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" /> Dual-key authorization protocol
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild variant="outline" className="text-slate-800 border-slate-300 font-bold text-xs px-6 py-5 rounded-lg">
                    <Link href="/disclosure">Disclosure Authority Console</Link>
                  </Button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <p className="font-bold text-slate-900">Judicial Verification Record:</p>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between"><span>Court Ref:</span><span className="font-bold text-slate-900">HC-DEL-2026-CR-8921</span></div>
                  <div className="flex justify-between"><span>Audit Hash:</span><span className="text-slate-600">e82b...914c (Recorded)</span></div>
                  <div className="flex justify-between"><span>Authorized By:</span><span className="text-emerald-700 font-bold">Judicial Registrar</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6. INSTANT STATUS LOOKUP WIDGET SECTION                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/70 border-y border-slate-200">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-600 font-mono">
              Public Tracker
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Track any existing grievance instantly
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Enter your Registration Case ID and grievance password to check live officer remarks and resolution timeline.
            </p>
          </div>

          <QuickStatusWidget />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (Accordion)                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-600 font-mono">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Clear answers on privacy and governance
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-sm font-bold text-slate-900 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-orange-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3.5 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 8. FOOTER (High-Trust GovTech & NIC Branding)                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Top Brand & Helpline Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <CivIDLogo variant="white" size={32} showWordmark={false} />
              <div>
                <p className="font-extrabold text-white text-base tracking-tight">CPGRAMS &bull; CivID Privacy Layer</p>
                <p className="text-[11px] text-slate-400">
                  Department of Administrative Reforms and Public Grievances (DARPG), Government of India
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
              <Phone className="w-4 h-4 text-orange-500" />
              <div>
                <span className="font-bold text-white text-sm">1800-11-4000</span>
                <span className="text-[10px] text-slate-400 block">Toll-Free National Grievance Helpline (24x7)</span>
              </div>
            </div>
          </div>

          {/* Nav Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-8 pb-8">
            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">Citizen Access</h5>
              <ul className="space-y-2">
                <li><a href={loginUrl} className="hover:text-white transition-colors">Lodge Grievance (SSO)</a></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Track Case Status</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">My Grievances Dashboard</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">Official Portals</h5>
              <ul className="space-y-2">
                <li><Link href="/officer/login" className="hover:text-white transition-colors">Nodal Officer Portal</Link></li>
                <li><Link href="/disclosure" className="hover:text-white transition-colors">Disclosure Authority Console</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">Government Links</h5>
              <ul className="space-y-2">
                <li><a href="https://dpg.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Directorate of Public Grievances</a></li>
                <li><a href="https://darpg.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">DARPG Official Portal</a></li>
                <li><a href="https://rtionline.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">RTI Online Portal</a></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">Security &amp; Standards</h5>
              <ul className="space-y-2">
                <li><span className="text-slate-500">RFC-7519 OIDC Pairwise</span></li>
                <li><span className="text-slate-500">HMAC-SHA256 Sealing</span></li>
                <li><span className="text-slate-500">ISO 27001 Certified Architecture</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom Attribution */}
          <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>
              Designed &amp; hosted by <strong>National Informatics Centre (NIC)</strong>, MeitY.
            </p>
            <p>
              Built for <strong>Build What Moves India</strong> &bull; Powered by CivID Zero-Knowledge Privacy Architecture
            </p>
          </div>

        </div>

        {/* Indian Tricolor Bar */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
      </footer>

    </div>
  );
}
