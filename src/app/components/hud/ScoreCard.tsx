import { memo } from "react";
import { ComboMeterMemo } from "./ComboMeter";

export interface ScoreCardProps {
  score: number;
  combo: number;
  comboActive: boolean;
  comboProgress: number;
  comboRevision: number;
  scoreLabel: string;
  comboLabel: string;
}

export const ScoreCard = memo(function ScoreCard({
  score,
  combo,
  comboActive,
  comboProgress,
  comboRevision,
  scoreLabel,
  comboLabel,
}: ScoreCardProps) {
  return (
    <section
      aria-label={scoreLabel}
      className="gameplayHudCard gameplayScoreCard relative flex min-h-[calc(102*var(--su))] flex-col items-center justify-center overflow-hidden rounded-[calc(17*var(--su))] border-2 border-[#e2b56d] px-1.5 py-2 text-center"
      style={{
        background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
        boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
      }}
    >
      <span className="pointer-events-none absolute inset-[calc(3*var(--su))] rounded-[calc(13*var(--su))] border border-white/75" />
      <div className="relative text-[calc(9*var(--su))] font-black uppercase text-[#74481f]">
        {scoreLabel}
      </div>
      <div className="relative mt-1 text-[calc(26*var(--su))] font-black leading-[0.9] text-[#7a481d] drop-shadow-[0_1px_0_#fff]">
        {score}
      </div>
      <ComboMeterMemo
        combo={combo}
        active={comboActive}
        progress={comboProgress}
        revision={comboRevision}
        label={comboLabel}
      />
    </section>
  );
});
