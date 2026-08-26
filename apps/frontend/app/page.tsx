"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AshokaEmblem } from "@/components/AshokaEmblem";
import { QuickStatusWidget } from "@/components/QuickStatusWidget";
import { ArchitectureFlowDiagram } from "@/components/ArchitectureFlowDiagram";

export default function LandingPage() {
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/login`;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-[#F6821F] selection:text-black font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: CLEAN, TYPOGRAPHIC, CENTERED */}
      {/* ========================================================================= */}
      <section className="min-h-[68vh] flex flex-col items-center justify-center text-center px-4 sm:px-8 py-20 border-b border-slate-200 bg-gradient-to-b from-orange-50/20 via-white to-white relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#C2410C] font-semibold text-xs border border-orange-200">
            <span>Government of India &bull; 100% Privacy Protected</span>
          </div>

          {/* SINGLE SHORT POWERFUL SENTENCE CENTERED */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.12] text-slate-950">
            Verify the Citizen. <br />
            <span className="text-[#EA580C]">Protect the Identity.</span>
          </h1>

          {/* Minimal Supportive Line */}
          <p className="text-slate-600 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
            Lodge grievances with any Government Department — 100% privately without fear of retaliation.
          </p>

          {/* Primary Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-[#F6821F] hover:bg-[#E06D0C] text-slate-950 font-bold text-base px-9 py-7 rounded-xl shadow-md transition-all cursor-pointer font-sans"
            >
              <a href={loginUrl} className="flex items-center justify-center gap-2.5">
                <span>Lodge Grievance with CivID SSO</span>
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border-slate-300 font-semibold text-base px-8 py-7 rounded-xl shadow-2xs"
            >
              <Link href="/status" className="flex items-center justify-center gap-2">
                <span>Track Status</span>
              </Link>
            </Button>
          </div>

          {/* Clean Typographic Trust Metadata */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="text-slate-700 font-semibold">Aadhaar eKYC Verified</span>
            <span>&bull;</span>
            <span className="text-slate-700 font-semibold">Zero Retaliation Risk</span>
            <span>&bull;</span>
            <span className="text-slate-700 font-semibold">100% Free Govt Service</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INSTANT ON-PAGE STATUS CHECKER */}
      {/* ========================================================================= */}
      <section className="py-10 px-4 sm:px-8 max-w-4xl mx-auto w-full -mt-10 relative z-20">
        <QuickStatusWidget />
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS IN 3 SIMPLE STEPS */}
      {/* ========================================================================= */}
      <section id="process" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#EA580C] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Simple &amp; Fast
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            How to File a Grievance in 3 Easy Steps
          </h2>
          <p className="text-sm text-slate-600">
            No long paperwork or running between offices. Complete it in 2 minutes from your phone.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 relative flex flex-col justify-between hover:shadow-md transition-shadow text-left">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-[#EA580C] bg-orange-100/70 px-2.5 py-1 rounded-md">
                STEP 01
              </span>
              <h3 className="text-base font-bold text-slate-900">1-Minute OTP Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Login securely with your Mobile or Aadhaar OTP. This proves you are a genuine citizen so government departments take your complaint seriously.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-emerald-700">
              Identity stays sealed &amp; protected
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 relative flex flex-col justify-between hover:shadow-md transition-shadow text-left">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-[#EA580C] bg-orange-100/70 px-2.5 py-1 rounded-md">
                STEP 02
              </span>
              <h3 className="text-base font-bold text-slate-900">Pick Department &amp; Describe Issue</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select your department (Roads, Water, Electricity, Hospital, Pension, etc.), write what happened, and attach photos or bills.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-emerald-700">
              Instant Grievance ID generated
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 relative flex flex-col justify-between hover:shadow-md transition-shadow text-left">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-[#EA580C] bg-orange-100/70 px-2.5 py-1 rounded-md">
                STEP 03
              </span>
              <h3 className="text-base font-bold text-slate-900">Track &amp; Get Resolution</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The designated officer investigates and fixes the issue within 14 days. Chat safely on the portal if needed and rate the resolution 1 to 5 stars!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-emerald-700">
              Free appeal option if unsatisfied
            </div>
          </div>
        </div>

        {/* Dedicated Flow Diagram */}
        <div className="mt-14">
          <ArchitectureFlowDiagram />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. COMMON COMPLAINT CATEGORIES (Clean Editorial Typography) */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 sm:px-8 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#EA580C] bg-orange-100/70 px-3 py-1 rounded-full border border-orange-200">
              Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              What Can You Complain About?
            </h2>
            <p className="text-sm text-slate-600">
              CPGRAMS connects you to over 100+ Central Ministries, Departments, and State Governments.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider">Infrastructure</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Roads &amp; Potholes</h4>
              <p className="text-xs text-slate-500 mt-1">PWD, Highway repairs, street lights, broken bridges</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Utilities</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Electricity &amp; Power</h4>
              <p className="text-xs text-slate-500 mt-1">High bills, frequent power cuts, faulty meter, transformer</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Civic</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Drinking Water &amp; Sewage</h4>
              <p className="text-xs text-slate-500 mt-1">Water supply disruption, dirty water, open drainage</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Healthcare</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Hospitals &amp; Healthcare</h4>
              <p className="text-xs text-slate-500 mt-1">Govt hospital service, Ayushman Bharat, medicine delay</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Welfare</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Ration &amp; Agriculture</h4>
              <p className="text-xs text-slate-500 mt-1">PDS ration denial, PM-Kisan subsidy delay, fertilizers</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Mobility</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Railways &amp; Transport</h4>
              <p className="text-xs text-slate-500 mt-1">Train cleanliness, ticket refunds, bus service delays</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Academics</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Schools &amp; Scholarships</h4>
              <p className="text-xs text-slate-500 mt-1">Delayed student scholarship, school facilities, meals</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-left">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Finance</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Pensions &amp; Banking</h4>
              <p className="text-xs text-slate-500 mt-1">Old age pension delay, EPFO claims, bank service issues</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. WHY CITIZEN PRIVACY MATTERS */}
      {/* ========================================================================= */}
      <section id="about" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-4 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-[#EA580C] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Your Protection
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Why We Hide Your Identity from the Officer
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              In traditional systems, citizens often hesitated to report corruption or poor work because their local officer would get their phone number and name.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">01. No Harassment or Retaliation</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Nobody can call your mobile or pressure you to withdraw your complaint.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">02. 100% Unbiased Action</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your complaint is judged purely on photos and evidence, not who you are.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">03. You Hold the Power to Rate &amp; Appeal</h4>
                <p className="text-xs text-slate-600 mt-1">
                  If you&apos;re not happy with the officer&apos;s answer, rate it &lsquo;Poor&rsquo; and an Appeal goes to senior authorities automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-8 rounded-2xl shadow-xl space-y-5 text-left">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-orange-300 text-xs font-semibold">
              Government Mandate
            </span>

            <h3 className="text-xl font-bold text-white">
              Centralised Public Grievance Redress and Monitoring System (CPGRAMS)
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              CPGRAMS is an official 24x7 online service operated by the <strong>Department of Administrative Reforms &amp; Public Grievances (DARPG)</strong>, Government of India.
            </p>

            <div className="p-4 rounded-xl bg-white/[0.06] border border-white/[0.1] space-y-2 text-xs">
              <div className="flex items-center justify-between text-white/70">
                <span>Total Grievances Resolved:</span>
                <span className="font-bold text-emerald-400 text-sm">78,96,124+</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span>Average Resolution Time:</span>
                <span className="font-bold text-amber-400 text-sm">&lt; 14 Days</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span>Citizen Privacy Rate:</span>
                <span className="font-bold text-[#F6821F] text-sm">100% Zero Leakage</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                asChild
                className="w-full bg-[#F6821F] hover:bg-[#E06D0C] text-slate-950 font-bold text-xs h-11 rounded-xl shadow-md"
              >
                <a href={loginUrl}>Lodge Your Complaint Free &rarr;</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CITIZEN ADVISORY & EXCLUSIONS (`#exclusions`) */}
      {/* ========================================================================= */}
      <section id="exclusions" className="py-14 px-4 sm:px-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-red-600 bg-red-100/70 px-3 py-1 rounded-full border border-red-200">
              Please Note
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Complaints That Cannot Be Accepted on CPGRAMS
            </h2>
            <p className="text-xs text-slate-600">
              As per Government guidelines, please use the appropriate designated portals for the following:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-red-200 text-left space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-red-700">1. RTI Matters</span>
              <p className="text-xs text-slate-600">
                Information requests must be filed on{" "}
                <a href="https://rtionline.gov.in" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">
                  RTI Online
                </a>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-red-200 text-left space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-red-700">2. Court / Sub-Judice</span>
              <p className="text-xs text-slate-600">
                Cases currently pending in any court of law or judicial tribunal.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-red-200 text-left space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-red-700">3. Religious Disputes</span>
              <p className="text-xs text-slate-600">
                Matters concerning religious dogmas, places of worship, or personal religious disputes.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-red-200 text-left space-y-1.5 shadow-2xs">
              <span className="text-xs font-bold text-red-700">4. Govt Employee Service</span>
              <p className="text-xs text-slate-600">
                Employee promotions/disciplinary actions unless DoPT internal channels are exhausted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 sm:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#EA580C] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Help &amp; Support
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500">
            Clear answers to common questions asked by citizens.
          </p>
        </div>

        <div className="space-y-3 text-left">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => toggleFaq(0)}
              className="w-full p-4.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-sm text-slate-900 text-left transition-colors"
            >
              <span>Is there any fee or charge to file a grievance?</span>
              {openFaq === 0 ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            {openFaq === 0 && (
              <div className="p-4.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                <strong>No. CPGRAMS is 100% Free of cost.</strong> The Government of India does not charge any fee for lodging or resolving grievances. You can file it from your mobile or PC anytime.
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => toggleFaq(1)}
              className="w-full p-4.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-sm text-slate-900 text-left transition-colors"
            >
              <span>Will the local officer or department know my mobile number?</span>
              {openFaq === 1 ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            {openFaq === 1 && (
              <div className="p-4.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                <strong>No. Your phone number, real name, and Aadhaar details are never shared with the officer.</strong> The officer only sees an anonymous Case ID (e.g. CPG-892410) and your issue details.
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => toggleFaq(2)}
              className="w-full p-4.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-sm text-slate-900 text-left transition-colors"
            >
              <span>What if I am not satisfied with the resolution?</span>
              {openFaq === 2 ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            {openFaq === 2 && (
              <div className="p-4.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                When an officer marks your grievance resolved, you get to rate the experience from 1 to 5 stars. If you rate it as <strong>&lsquo;Poor&rsquo; (1-Star)</strong>, the portal automatically enables the <strong>File Appeal</strong> button to escalate your complaint to senior authorities.
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => toggleFaq(3)}
              className="w-full p-4.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-sm text-slate-900 text-left transition-colors"
            >
              <span>How long does it take to get a resolution?</span>
              {openFaq === 3 ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            {openFaq === 3 && (
              <div className="p-4.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                Most grievances are resolved within <strong>14 to 30 days</strong>, as mandated by the Government of India Citizen Charter. You can track live progress anytime using your Grievance Number.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. 24x7 TOLL-FREE HELPLINE BANNER */}
      {/* ========================================================================= */}
      <section className="bg-slate-950 text-white py-10 px-4 sm:px-8 border-y border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-bold text-[#F6821F] uppercase tracking-wider">
              National Citizen Support
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Toll-Free Grievance Helpline: 1800-11-4000
            </h3>
            <p className="text-xs text-slate-400">
              Free support available 24x7 in 22 Scheduled Indian Languages. Also accessible via UMANG app.
            </p>
          </div>

          <Button
            asChild
            className="bg-[#F6821F] hover:bg-[#E06D0C] text-slate-950 font-bold text-xs px-6 py-5 rounded-xl shadow-md cursor-pointer"
          >
            <a href={loginUrl}>Lodge Your Grievance Online &rarr;</a>
          </Button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. OTHER ROLE PORTALS */}
      {/* ========================================================================= */}
      <section className="py-12 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/officer/login"
            className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition-colors text-left flex items-center justify-between group shadow-2xs"
          >
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-[#EA580C]">
                Grievance Officer Portal &rarr;
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">For designated Department GROs</p>
            </div>
          </Link>

          <Link
            href="/status"
            className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition-colors text-left flex items-center justify-between group shadow-2xs"
          >
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-[#EA580C]">
                Public Tracking Portal &rarr;
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Check status &amp; audit history</p>
            </div>
          </Link>

          <Link
            href="/disclosure"
            className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition-colors text-left flex items-center justify-between group shadow-2xs"
          >
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-[#EA580C]">
                Disclosure Authority &rarr;
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Court warrant identity review</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. OFFICIAL NIC / DARPG FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <AshokaEmblem size={38} />
                <div>
                  <p className="font-extrabold text-white text-sm">CPGRAMS</p>
                  <p className="text-[11px] text-slate-400">
                    Centralised Public Grievance Redress and Monitoring System
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Powered by <strong>CivID Privacy Layer</strong>. Built for <strong>Build What Moves India</strong> to protect citizen privacy and provide fearless grievance redressal.
              </p>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px]">Quick Links</h5>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><a href="/#process" className="hover:text-white">How It Works</a></li>
                <li><a href="/#about" className="hover:text-white">Why Privacy Matters</a></li>
                <li><a href="/#exclusions" className="hover:text-white">Exclusions</a></li>
                <li><Link href="/status" className="hover:text-white">Track Grievance</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold text-white uppercase text-[11px]">Govt. Portals</h5>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><a href="https://dpg.gov.in" target="_blank" rel="noreferrer" className="hover:text-white">Directorate of PG (DPG)</a></li>
                <li><a href="https://rtionline.gov.in" target="_blank" rel="noreferrer" className="hover:text-white">RTI Online Portal</a></li>
                <li><a href="https://darpg.gov.in" target="_blank" rel="noreferrer" className="hover:text-white">DARPG Website</a></li>
                <li><Link href="/officer/login" className="hover:text-white">Officer Console</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div className="space-y-0.5 text-center md:text-left">
              <p>
                Designed, developed &amp; hosted by <strong>National Informatics Centre (NIC)</strong>, MeitY, Government of India.
              </p>
              <p>
                Content owned by <strong>Department of Administrative Reforms &amp; Public Grievances (DARPG)</strong>.
              </p>
            </div>

            <div className="text-center md:text-right space-y-0.5">
              <p>
                Toll-Free Citizen Helpline: <strong className="text-slate-300">1800-11-4000</strong> &bull; Total Resolved: <strong className="text-slate-300">78,96,124+</strong>
              </p>
              <p className="text-[10px] text-slate-600">
                Best Viewed in 1440 &times; 900 resolution &bull; Compatible with all mobile &amp; desktop browsers
              </p>
            </div>
          </div>
        </div>

        {/* Micro Tricolor Accent */}
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#FF9933]"></div>
          <div className="flex-1 bg-white"></div>
          <div className="flex-1 bg-[#138808]"></div>
        </div>
      </footer>
    </div>
  );
}
