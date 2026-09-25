import { memo } from "react";
import { Heart, Pause } from "lucide-react";
import { MAX_MISSES } from "../game/constants";

function HudHeart({ active }: { active: boolean }) {
  return (
    <Heart
      aria-hidden="true"
      className="h-[calc(18*var(--su))] w-[calc(18*var(--su))] shrink-0 drop-shadow-[0_1px_0_rgba(113,57,24,0.24)]"
      fill={active ? "#ef3e36" : "#d8ccb5"}
      color={active ? "#b92825" : "#c6b99f"}
      strokeWidth={1.8}
    />
  );
}

export interface LivesCardProps {
  remainingLives: number;
  onPauseClick: () => void;
  livesLabel: string;
  pauseLabel: string;
}

export const LivesCard = memo(function LivesCard({
  remainingLives,
  onPauseClick,
  livesLabel,
  pauseLabel,
}: LivesCardProps) {
  return (
    <section
      aria-label={`${remainingLives} trên ${MAX_MISSES} ${livesLabel}`}
      className="gameplayHudCard gameplayLivesCard pointer-events-auto relative flex min-h-[calc(102*var(--su))] flex-col items-center justify-center overflow-hidden rounded-[calc(17*var(--su))] border-2 border-[#e2b56d] px-1.5 py-2"
      style={{
        zIndex: "var(--z-hud-controls)",
        background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
        boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
      }}
    >
      <span className="pointer-events-none absolute inset-[calc(3*var(--su))] rounded-[calc(13*var(--su))] border border-white/75" />
      <div className="relative text-[calc(8*var(--su))] font-black uppercase text-[#74481f]">
        {livesLabel}
      </div>
      <div className="relative mt-2 flex max-w-full -space-x-0.5" aria-hidden="true">
        {Array.from({ length: MAX_MISSES }).map((_, index) => (
          <HudHeart key={index} active={index < remainingLives} />
        ))}
      </div>
      <div className="relative mt-3">
        <button
          type="button"
          onClick={onPauseClick}
          aria-label={pauseLabel}
          className="grid h-[calc(31*var(--su))] w-[calc(31*var(--su))] shrink-0 place-items-center rounded-[calc(10*var(--su))] border-2 border-[#e2b56d] bg-[#fff8e7] text-[#7a481d] shadow-[0_3px_0_#b87931,inset_0_2px_0_#fff] transition hover:bg-white active:translate-y-[2px] active:shadow-[0_1px_0_#b87931]"
        >
          <Pause
            aria-hidden="true"
            className="h-[calc(17*var(--su))] w-[calc(17*var(--su))]"
            fill="currentColor"
            strokeWidth={2.4}
          />
        </button>
      </div>
    </section>
  );
});
