"use client";

import React from "react";

export function HeroBackgroundEffects() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      
      {/* 1. Linear-Grade Modern Square Grid with Radial Vignette */}
      <svg
        className="absolute inset-0 h-full w-full stroke-slate-200/70 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_15%,#000_30%,transparent_90%)]"
        aria-hidden="true"
      >
        <defs>
          {/* Main Grid Unit (48px) */}
          <pattern
            id="linear-grid-pattern"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
            x="50%"
            y="0"
          >
            {/* Square outlines */}
            <path d="M.5 48V.5H48" fill="none" strokeWidth="0.75" />
            
            {/* Precision Micro-Crosshair (+) at vertex */}
            <path
              d="M-3 0h6M0-3v6"
              fill="none"
              strokeWidth="1"
              className="stroke-slate-300"
            />
          </pattern>
        </defs>

        {/* Base Grid Layer */}
        <rect width="100%" height="100%" fill="url(#linear-grid-pattern)" />

        {/* Subtle Asymmetrical Highlight Squares (Linear / Vercel Aesthetic) */}
        {/* Left Flank Highlight Squares */}
        <rect x="calc(50% - 480px)" y="96" width="48" height="48" className="fill-slate-100/60 stroke-slate-300/80" strokeWidth="1" />
        <rect x="calc(50% - 432px)" y="144" width="48" height="48" className="fill-slate-50 stroke-slate-200" strokeWidth="0.75" />
        <rect x="calc(50% - 528px)" y="240" width="48" height="48" className="fill-slate-100/50 stroke-slate-300/60" strokeWidth="0.75" />
        
        {/* Right Flank Highlight Squares */}
        <rect x="calc(50% + 432px)" y="96" width="48" height="48" className="fill-slate-100/60 stroke-slate-300/80" strokeWidth="1" />
        <rect x="calc(50% + 384px)" y="192" width="48" height="48" className="fill-slate-50 stroke-slate-200" strokeWidth="0.75" />
        <rect x="calc(50% + 480px)" y="288" width="48" height="48" className="fill-slate-100/50 stroke-slate-300/60" strokeWidth="0.75" />

        {/* Top Center Subtle Highlight Blocks */}
        <rect x="calc(50% - 96px)" y="0" width="48" height="48" className="fill-slate-50/80 stroke-slate-200" strokeWidth="0.75" />
        <rect x="calc(50% + 48px)" y="0" width="48" height="48" className="fill-slate-50/80 stroke-slate-200" strokeWidth="0.75" />
      </svg>

      {/* 2. Top-Right and Top-Left Technical Coordinate Ticks */}
      <div className="hidden lg:flex absolute top-6 left-8 items-center gap-2 text-[10px] font-mono text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>GRID_COORD: 28.6139°N</span>
      </div>

      <div className="hidden lg:flex absolute top-6 right-8 items-center gap-2 text-[10px] font-mono text-slate-400">
        <span>VAULT_GEO: 77.2090°E</span>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      </div>

      {/* 3. Subtle Corner Framing Marks */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-slate-300" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-slate-300" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-slate-300" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-slate-300" />

    </div>
  );
}
