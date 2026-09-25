import { forwardRef, memo } from "react";
import { Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActiveOrder } from "../game/gameRules";
import { ScoreCard } from "./ScoreCard";
import { OrderCard } from "./OrderCard";
import { LivesCard } from "./LivesCard";

function formatSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

export interface GameplayHudProps {
  score: number;
  combo: number;
  comboWindow: {
    active: boolean;
    remainingMs: number;
    durationMs: number;
    revision: number;
  };
  currentOrder: ActiveOrder | null;
  remainingLives: number;
  slowTime: {
    active: boolean;
    remainingMs: number;
  };
  onPauseClick: () => void;
}

export const GameplayHud = memo(
  forwardRef<HTMLDivElement, GameplayHudProps>(function GameplayHud(
    {
      score,
      combo,
      comboWindow,
      currentOrder,
      remainingLives,
      slowTime,
      onPauseClick,
    },
    ref
  ) {
    const { t } = useTranslation();

    const comboActive = comboWindow.active && combo >= 1;
    const comboProgress = comboWindow.active
      ? Math.max(0, Math.min(1, comboWindow.remainingMs / comboWindow.durationMs))
      : 0;

    return (
      <div
        ref={ref}
        className="gameplayHud pointer-events-none absolute left-0 right-0 top-0 p-[max(10px,env(safe-area-inset-top))] pb-2"
        style={{ zIndex: "var(--z-hud-info)" }}
      >
        <div className="gameplayHudGrid mx-auto grid w-full max-w-[980px] grid-cols-[1fr_1.65fr_0.9fr] gap-1.5">
          <ScoreCard
            score={score}
            combo={combo}
            comboActive={comboActive}
            comboProgress={comboProgress}
            comboRevision={comboWindow.revision}
            scoreLabel={t("gameplay.score")}
            comboLabel={t("gameplay.combo")}
          />

          <OrderCard
            requirements={currentOrder?.requirements ?? []}
            timeRemainingMs={currentOrder?.timeRemainingMs ?? 0}
            timeLimitMs={currentOrder?.timeLimitMs ?? 1}
            orderLabel={t("gameplay.order")}
            incomingLabel={t("gameplay.orderIncoming")}
          />

          <LivesCard
            remainingLives={remainingLives}
            onPauseClick={onPauseClick}
            livesLabel={t("gameplay.lives")}
            pauseLabel={t("gameplay.pause")}
          />
        </div>

        {slowTime.active && (
          <div className="pointer-events-none mx-auto mt-2 flex w-full max-w-[980px] justify-center">
            <div className="rounded-full border border-[#5faac7] bg-[#d8f6ff]/95 px-3 py-1 text-[calc(12*var(--su))] font-black text-[#285f73] shadow-sm">
              <Hourglass aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
              {t("gameplay.slowTime")} {formatSeconds(slowTime.remainingMs)}s
            </div>
          </div>
        )}
      </div>
    );
  })
);
