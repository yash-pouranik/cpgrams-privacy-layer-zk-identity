"use client";

import React, { useState, useEffect } from "react";
import { Globe, Volume2 } from "lucide-react";

export function GovHeader() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cpgrams_fontsize") as "sm" | "base" | "lg" | null;
      if (saved && ["sm", "base", "lg"].includes(saved)) {
        setFontSize(saved);
        applyRootFontSize(saved);
      }
    } catch (e) {}
  }, []);

  const applyRootFontSize = (size: "sm" | "base" | "lg") => {
    if (typeof document !== "undefined") {
      if (size === "sm") {
        document.documentElement.style.fontSize = "14px";
      } else if (size === "lg") {
        document.documentElement.style.fontSize = "18px";
      } else {
        document.documentElement.style.fontSize = "16px";
      }
    }
  };

  const handleFontSizeChange = (size: "sm" | "base" | "lg") => {
    setFontSize(size);
    applyRootFontSize(size);
    try {
      localStorage.setItem("cpgrams_fontsize", size);
    } catch (e) {}
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "hi" : "en"));
  };

  const handleScreenReader = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const msg = new SpeechSynthesisUtterance(
        "Welcome to CPGRAMS Privacy-Preserving Grievance Portal, Government of India."
      );
      window.speechSynthesis.speak(msg);
    }
  };

  return (
    <div className="w-full bg-slate-900 text-slate-300 text-[11px] font-mono border-b border-slate-800 select-none">
      {/* 1px Indian Tricolor Micro-Line */}
      <div className="h-[2px] w-full flex">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-1 flex items-center justify-between">
        {/* Left: Ministry Identifier */}
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-semibold text-white">
            {lang === "en" ? "भारत सरकार" : "Govt. of India"}
          </span>
          <span className="text-slate-600">/</span>
          <span className="hidden sm:inline text-slate-400">
            {lang === "en" ? "कार्मिक एवं लोक शिकायत मंत्रालय" : "Ministry of Personnel, PG & Pensions"}
          </span>
          <span className="text-slate-600 hidden md:inline">/</span>
          <span className="text-[#F6821F] font-semibold hidden md:inline">DARPG</span>
        </div>

        {/* Right: Clean Minimal Controls */}
        <div className="flex items-center gap-3 text-[10px]">
          <button
            onClick={handleScreenReader}
            className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-slate-400"
            title="Screen Reader"
          >
            <Volume2 className="w-3 h-3 text-[#F6821F]" />
            <span className="hidden md:inline">Reader</span>
          </button>

          {/* Text Size Controls */}
          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
            <button
              type="button"
              onClick={() => handleFontSizeChange("sm")}
              className={`px-1 rounded cursor-pointer ${fontSize === "sm" ? "bg-[#F6821F] text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => handleFontSizeChange("base")}
              className={`px-1 rounded cursor-pointer ${fontSize === "base" ? "bg-[#F6821F] text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleFontSizeChange("lg")}
              className={`px-1 rounded cursor-pointer ${fontSize === "lg" ? "bg-[#F6821F] text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              A+
            </button>
          </div>

          <button
            onClick={toggleLanguage}
            className="hover:text-white flex items-center gap-1 cursor-pointer text-slate-300 font-sans"
          >
            <Globe className="w-3 h-3 text-[#F6821F]" />
            <span>{lang === "en" ? "हिन्दी" : "English"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
