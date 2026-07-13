import { TARGETS } from "./game/constants";
import { GameButton } from "./GameButton";
import { CountrysideBackdrop } from "./CountrysideBackdrop";
import { GAME_STRINGS } from "../lib/constants";

interface PixiGameProps {
  onStartGame: () => void;
  onSettings: () => void;
}

export function PixiGame({ onStartGame, onSettings }: PixiGameProps) {
  return (
    <div className="w-full min-h-[100dvh] flex flex-col items-center justify-center relative py-12 px-4 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #f5ecd7 0%, #efe3c4 50%, #e6d8b2 100%)" }}>
      <CountrysideBackdrop />

      {/* Logo */}
      <div className="relative z-10 mb-3">
        <div className="w-22 h-22 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "radial-gradient(circle at 40% 35%, #f8c860 0%, #d99820 100%)", border: "2.5px solid #2b2620", boxShadow: "0 6px 20px rgba(43,38,32,0.15)", width: 88, height: 88 }}>
          <span className="text-white font-extrabold text-[44px] leading-none select-none" style={{ textShadow: "0 1px 2px rgba(43,38,32,0.3)" }}>L</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6 relative z-10">
        <h1 className="text-[#2b2620] font-extrabold tracking-tight"
          style={{ fontSize: "clamp(36px, 6vw, 72px)", lineHeight: 1.05, textShadow: "0 2px 0 rgba(255,255,255,0.6)" }}>
          {GAME_STRINGS.APP_NAME}
        </h1>
        <p className="text-[#5a4a3a] text-[15px] md:text-[17px] font-medium mt-2 max-w-md mx-auto leading-relaxed">{GAME_STRINGS.TAGLINE}</p>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-[24px] p-5 md:p-7"
        style={{ background: "rgba(253,246,234,0.9)", border: "1.5px dashed rgba(138,125,101,0.35)", boxShadow: "0 8px 24px rgba(43,38,32,0.06)" }}>

        {/* How to play */}
        <div className="rounded-[16px] p-5 mb-5 text-center"
          style={{ background: "linear-gradient(180deg, rgba(200,214,138,0.4) 0%, rgba(107,142,61,0.25) 100%)", border: "1px solid rgba(138,125,101,0.15)" }}>
          <svg width="60" height="75" viewBox="0 0 60 75" className="mx-auto mb-3">
            <ellipse cx="30" cy="42" rx="21" ry="26" fill="#f0b840" stroke="#2b2620" strokeWidth="1.8" />
            <ellipse cx="30" cy="17" rx="14" ry="12" fill="#f0b840" stroke="#2b2620" strokeWidth="1.8" />
            <line x1="10" y1="34" x2="50" y2="34" stroke="#8e4e22" strokeWidth="1.2" opacity="0.45" />
            <line x1="12" y1="42" x2="48" y2="42" stroke="#8e4e22" strokeWidth="1.2" opacity="0.35" />
            <line x1="14" y1="50" x2="46" y2="50" stroke="#8e4e22" strokeWidth="1.2" opacity="0.3" />
            <circle cx="25" cy="15" r="2" fill="#2b2620" />
            <circle cx="35" cy="15" r="2" fill="#2b2620" />
            <path d="M25 22 Q30 27 35 22" fill="none" stroke="#2b2620" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="21" cy="19" r="3" fill="#e87432" opacity="0.22" />
            <circle cx="39" cy="19" r="3" fill="#e87432" opacity="0.22" />
          </svg>
          <p className="text-[#2b2620] font-bold text-[14px] leading-relaxed">{GAME_STRINGS.HOW_TO_PLAY}</p>
        </div>

        {/* Targets grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
          {TARGETS.map((t) => (
            <div key={t.name} className="flex flex-col items-center gap-1 bg-white/80 rounded-xl px-2 py-2 border border-[rgba(138,125,101,0.2)] justify-center">
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-[#2b2620] font-semibold text-[12px]">{t.name}</span>
              {t.type === "good" ? (
                <span className="text-[#e87432] font-extrabold text-[11px]">+{t.points}</span>
              ) : (
                <span className="text-[#e83232] font-extrabold text-[11px]">-1 Tim</span>
              )}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <GameButton variant="primary" size="lg" fullWidth onClick={onStartGame} className="text-[16px]">{GAME_STRINGS.START_FISHING}</GameButton>
          <GameButton variant="secondary" size="md" onClick={onSettings} fullWidth>{GAME_STRINGS.SETTINGS}</GameButton>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-[#8a7d65] text-[11px] font-semibold uppercase tracking-wider">Developed by PapaStudio 2026</p>
      </div>
    </div>
  );
}
