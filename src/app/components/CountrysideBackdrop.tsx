import { useMemo } from "react";

/**
 * Countryside backdrop matching bolacdauphong.vn aesthetic.
 * Hand-drawn sketch style with ground mound at the bottom.
 * Layers: sky → mountains → fields → bamboo → storks → kite → ground mound
 */
export function CountrysideBackdrop() {
  const bamboos = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      x: 2 + (i / 15) * 96,
      h: 50 + ((i * 7 + 3) % 20),
      sway: ((i * 3) % 5) - 2,
    })), []);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0"
      viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5ecd7" />
          <stop offset="60%" stopColor="#efe3c4" />
          <stop offset="100%" stopColor="#e8d8b8" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8d68a" stopOpacity="0.7" />
          <stop offset="40%" stopColor="#8eaa4a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4c6630" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="moundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a85c" />
          <stop offset="30%" stopColor="#c49640" />
          <stop offset="70%" stopColor="#8e5e2a" />
          <stop offset="100%" stopColor="#6b3a18" />
        </linearGradient>
      </defs>

      {/* 1. Sky */}
      <rect width="1440" height="900" fill="url(#skyGrad)" />

      {/* 2. Distant mountains — soft pencil sketch */}
      <path d="M0 520 Q180 370 360 430 Q540 490 720 380 Q900 280 1080 410 Q1260 530 1440 370 L1440 550 L0 550 Z"
        fill="rgba(230,216,178,0.5)" stroke="rgba(138,125,101,0.2)" strokeWidth="1" strokeLinecap="round" />
      <path d="M0 545 Q200 430 400 470 Q600 510 800 430 Q1000 350 1200 450 Q1320 510 1440 420 L1440 570 L0 570 Z"
        fill="rgba(230,216,178,0.35)" stroke="rgba(138,125,101,0.15)" strokeWidth="1" strokeLinecap="round" />

      {/* 3. Mid fields — rolling green hills */}
      <path d="M0 555 Q240 490 480 520 Q720 555 960 500 Q1200 450 1440 510 L1440 630 L0 630 Z"
        fill="rgba(200,214,138,0.3)" stroke="rgba(138,125,101,0.15)" strokeWidth="1" strokeLinecap="round" />

      {/* 3b. Rice field rows */}
      {Array.from({ length: 30 }, (_, i) => (
        <line key={`rice-${i}`} x1={`${(i/29)*100}%`} y1={`${56 + (i*7)%6}%`}
          x2={`${(i/29)*100 + 1.5}%`} y2={`${56 + (i*7)%6 - 2}%`}
          stroke="rgba(138,125,101,0.22)" strokeWidth="0.7" strokeLinecap="round" />
      ))}

      {/* 4. Bamboo clusters */}
      {bamboos.map((b, i) => (
        <g key={`bamboo-${i}`}>
          <line x1={`${b.x}%`} y1={`${b.h}%`} x2={`${b.x + b.sway*0.3}%`} y2={`${b.h - 20}%`}
            stroke="rgba(107,142,61,0.3)" strokeWidth="1.1" strokeLinecap="round" />
          <line x1={`${b.x + b.sway*0.3}%`} y1={`${b.h - 14}%`} x2={`${b.x + b.sway*0.3 + 1.6}%`} y2={`${b.h - 20}%`}
            stroke="rgba(107,142,61,0.22)" strokeWidth="0.7" strokeLinecap="round" />
          <line x1={`${b.x + b.sway*0.3}%`} y1={`${b.h - 14}%`} x2={`${b.x + b.sway*0.3 - 1.4}%`} y2={`${b.h - 19}%`}
            stroke="rgba(107,142,61,0.22)" strokeWidth="0.7" strokeLinecap="round" />
        </g>
      ))}

      {/* 5. Storks */}
      {[[15, 26], [20, 22], [24, 28], [28, 20], [32, 24]].map(([cx, cy], i) => (
        <g key={`stork-${i}`}>
          <line x1={`${cx-1.2}%`} y1={`${cy}%`} x2={`${cx}%`} y2={`${cy-1.8}%`}
            stroke="rgba(138,125,101,0.3)" strokeWidth="0.9" strokeLinecap="round" />
          <line x1={`${cx+1.2}%`} y1={`${cy}%`} x2={`${cx}%`} y2={`${cy-1.8}%`}
            stroke="rgba(138,125,101,0.3)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      ))}

      {/* 6. Kite */}
      <g transform="translate(1123, 144)" opacity="0.6">
        <polygon points="0,-16 9,0 0,12 -9,0" fill="rgba(240,184,64,0.5)" stroke="rgba(240,184,64,0.55)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0,12 Q3,22 -2,32 Q1,40 -1,48" fill="none" stroke="rgba(138,125,101,0.35)" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M0,-16 Q-30,110 -100,270" fill="none" stroke="rgba(138,125,101,0.18)" strokeWidth="0.6" strokeLinecap="round" />
      </g>

      {/* 7. Ground mound (mô đất) — where the character stands */}
      <path d="M0 660 Q180 640 360 655 Q540 670 720 645 Q900 620 1080 650 Q1260 670 1440 640 L1440 900 L0 900 Z"
        fill="url(#groundGrad)" />

      {/* Ground texture — grass strokes */}
      {Array.from({ length: 50 }, (_, i) => (
        <line key={`grass-${i}`} x1={`${(i/49)*100}%`} y1={`${72 + (i*11)%6}%`}
          x2={`${(i/49)*100 + ((i%3)-1)*0.6}%`} y2={`${72 + (i*11)%6 - 2.5}%`}
          stroke="rgba(76,102,48,0.3)" strokeWidth="0.8" strokeLinecap="round" />
      ))}

      {/* 8. Earth mound (mô đất) — foreground for mascot to stand on */}
      <ellipse cx="720" cy="800" rx="300" ry="80" fill="url(#moundGrad)" opacity="0.85" />
      <ellipse cx="720" cy="790" rx="280" ry="60" fill="#c8a050" opacity="0.4" />
      {/* Dirt texture */}
      {Array.from({ length: 18 }, (_, i) => (
        <line key={`dirt-${i}`} x1={`${45 + (i/17)*10}%`} y1={`${84 + (i*5)%4}%`}
          x2={`${45 + (i/17)*10 + 1.2}%`} y2={`${84 + (i*5)%4 - 0.8}%`}
          stroke="rgba(107,58,24,0.3)" strokeWidth="0.7" strokeLinecap="round" />
      ))}
    </svg>
  );
}
