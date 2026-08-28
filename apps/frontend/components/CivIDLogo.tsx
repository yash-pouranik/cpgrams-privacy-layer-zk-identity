import React from "react";

/**
 * CivIDLogo — the single canonical CivID brand mark.
 *
 * Symbol concept: "Interlocked Identity Core"
 * Two interlocking open rings — the citizen (charcoal) and the relying
 * service (orange) — converge around a protected central dot, the
 * pseudonymous identity that never leaves CivID. Flat, geometric,
 * recognizable down to ~20px.
 *
 * Variants:
 *  - "dark"   → charcoal + orange (white/light backgrounds)
 *  - "white"  → all-white symbol + wordmark (orange panel, dark hero, footer)
 *  - "accent" → orange symbol + charcoal wordmark (light cards, small branding)
 *
 * Props:
 *  - size        → pixel height of the symbol
 *  - showWordmark→ render the "CivID" wordmark beside the symbol
 *  - wordmarkClassName → extra classes for the wordmark text
 */

export type CivIDLogoVariant = "dark" | "white" | "accent";

interface CivIDLogoProps {
  variant?: CivIDLogoVariant;
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

const PALETTE: Record<
  CivIDLogoVariant,
  { ringA: string; ringB: string; core: string; wordPrimary: string; wordAccent: string }
> = {
  dark: {
    ringA: "#0F172A",
    ringB: "#F97316",
    core: "#0F172A",
    wordPrimary: "text-slate-950",
    wordAccent: "text-[#F97316]",
  },
  white: {
    ringA: "#FFFFFF",
    ringB: "#FFFFFF",
    core: "#FFFFFF",
    wordPrimary: "text-white",
    wordAccent: "text-white",
  },
  accent: {
    ringA: "#0F172A",
    ringB: "#F97316",
    core: "#F97316",
    wordPrimary: "text-slate-950",
    wordAccent: "text-[#F97316]",
  },
};

/** The symbol alone — reusable at any size, works standalone. */
export function CivIDSymbol({
  size = 32,
  variant = "dark",
  className = "",
}: {
  size?: number;
  variant?: CivIDLogoVariant;
  className?: string;
}) {
  const p = PALETTE[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CivID"
    >
      {/* Citizen ring — opens toward the service ring */}
      <path
        d="M 27.6 11.7 A 15 15 0 1 0 27.6 36.3"
        stroke={p.ringA}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Service ring — interlocks with the citizen ring */}
      <path
        d="M 20.4 36.3 A 15 15 0 1 0 20.4 11.7"
        stroke={p.ringB}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Protected identity core */}
      <circle cx="24" cy="24" r="4.5" fill={p.core} />
    </svg>
  );
}

export function CivIDLogo({
  variant = "dark",
  size = 32,
  showWordmark = true,
  className = "",
  wordmarkClassName = "",
}: CivIDLogoProps) {
  const p = PALETTE[variant];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <CivIDSymbol size={size} variant={variant} />
      {showWordmark && (
        <span
          className={`font-sans font-semibold tracking-tight leading-none select-none ${p.wordPrimary} ${wordmarkClassName}`}
          style={{ fontSize: size * 0.78 }}
        >
          Civ<span className={p.wordAccent}>ID</span>
        </span>
      )}
    </span>
  );
}
