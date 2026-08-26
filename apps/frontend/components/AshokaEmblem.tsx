import React from "react";

interface AshokaEmblemProps {
  className?: string;
  size?: number;
}

export function AshokaEmblem({ className = "", size = 44 }: AshokaEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="State Emblem of India"
    >
      {/* Outer Circle Ring */}
      <circle cx="50" cy="50" r="47" stroke="#F6821F" strokeWidth="1.5" strokeOpacity="0.8" fill="#FFFFFF" />
      <circle cx="50" cy="50" r="43" stroke="#0F172A" strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="2 2" />

      {/* Ashoka Pillar / Lions stylized silhouette in crisp dark navy & orange */}
      {/* Central Lion */}
      <path
        d="M44 20C44 16 47 13 50 13C53 13 56 16 56 20V32C56 34 54 36 50 36C46 36 44 34 44 32V20Z"
        fill="#0F172A"
      />
      <circle cx="50" cy="18" r="4" fill="#F6821F" />
      
      {/* Left Lion */}
      <path
        d="M33 24C31 21 34 17 38 18C41 19 43 23 42 27C41 31 38 34 35 34C33 34 32 31 33 27Z"
        fill="#1E293B"
      />
      {/* Right Lion */}
      <path
        d="M67 24C69 21 66 17 62 18C59 19 57 23 58 27C59 31 62 34 65 34C67 34 68 31 67 27Z"
        fill="#1E293B"
      />

      {/* Lion mane details & shoulders */}
      <path
        d="M31 34C28 36 29 44 33 46C37 48 43 47 43 42C43 38 36 34 31 34Z"
        fill="#334155"
      />
      <path
        d="M69 34C72 36 71 44 67 46C63 48 57 47 57 42C57 38 64 34 69 34Z"
        fill="#334155"
      />
      <path
        d="M42 36C45 36 47 38 47 46C47 49 53 49 53 46C53 38 55 36 58 36C61 36 62 44 60 50C57 55 43 55 40 50C38 44 39 36 42 36Z"
        fill="#1E293B"
      />

      {/* Abacus Platform (Base) */}
      <rect x="24" y="52" width="52" height="6" rx="1" fill="#F6821F" />
      <rect x="22" y="58" width="56" height="4" rx="1" fill="#0F172A" />

      {/* Ashoka Chakra in Center of Base */}
      <circle cx="50" cy="67" r="8" stroke="#0F172A" strokeWidth="1.5" fill="#FFFFFF" />
      <circle cx="50" cy="67" r="1.5" fill="#F6821F" />
      {/* Chakra Spokes (8 directions) */}
      <line x1="50" y1="59" x2="50" y2="75" stroke="#0F172A" strokeWidth="0.8" />
      <line x1="42" y1="67" x2="58" y2="67" stroke="#0F172A" strokeWidth="0.8" />
      <line x1="44.3" y1="61.3" x2="55.7" y2="72.7" stroke="#0F172A" strokeWidth="0.8" />
      <line x1="44.3" y1="72.7" x2="55.7" y2="61.3" stroke="#0F172A" strokeWidth="0.8" />

      {/* Stylized animals */}
      <path d="M28 64C27 62 30 60 33 62C36 64 34 68 31 68C29 68 28 66 28 64Z" fill="#64748B" />
      <path d="M72 64C73 62 70 60 67 62C64 64 66 68 69 68C71 68 72 66 72 64Z" fill="#64748B" />

      {/* Bell Lotus Pedestal */}
      <path
        d="M20 78C26 75 38 74 50 74C62 74 74 75 80 78C75 82 65 84 50 84C35 84 25 82 20 78Z"
        fill="#F6821F"
      />

      {/* Satyameva Jayate Inscription */}
      <text
        x="50"
        y="93"
        textAnchor="middle"
        fontSize="6"
        fontWeight="bold"
        fill="#0F172A"
        fontFamily="sans-serif"
        letterSpacing="0.5"
      >
        सत्यमेव जयते
      </text>
    </svg>
  );
}
