import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Apple,
  Cherry,
  Citrus,
  Crown,
  House,
  RotateCcw,
  Sprout,
  Wheat,
  type LucideProps,
} from "lucide-react";
import pandaAgainUrl from "../../../assets/characters/panda_again.webp";
import pandaGameOverUrl from "../../../assets/characters/panda_game_over.webp";
import rewardVideoUrl from "../../../assets/ui/reward_video.webp";
import { GameButton } from "../ui/GameButton";
import { FruitAssetImage } from "../ui/FruitAssetImage";
import { useTranslation } from "react-i18next";
import type { FailureReason } from "../game/HarvestGameEngine";

export interface HarvestedItemResult {
  id: string;
  name: string;
  icon?: string;
  count: number;
}

interface GameOverScreenProps {
  score: number;
  harvestedItems: HarvestedItemResult[];
  isNewBest?: boolean;
  isDoubled?: boolean;
  adPending?: boolean;
  onDoubleScore: () => void;
  onReplay: () => void;
  onHome?: () => void;
  failureReason?: FailureReason | null;
}

const harvestFallbackIcons: Record<
  string,
  ComponentType<LucideProps>
> = {
  mango: Citrus,
  strawberry: Cherry,
  apple: Apple,
  pear: Citrus,
  guava: Citrus,
};

function useCountUp(target: number) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion || target <= 0) {
      setDisplayValue(target);
      return;
    }

    const duration = Math.min(1100, 600 + Math.log10(target + 1) * 110);
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [target]);

  return displayValue;
}

function FinalScoreHero({
  score,
  isNewBest,
  numberFormatter,
  t,
}: {
  score: number;
  isNewBest: boolean;
  numberFormatter: Intl.NumberFormat;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const displayScore = useCountUp(score);

  return (
    <section
      className="finalScoreHero"
      aria-label={`${t("gameover.finalScore")} ${numberFormatter.format(score)}${isNewBest ? `, ${t("gameover.doubled")}` : ""}`}
    >
      <span className="finalScoreLabel">{t("gameover.finalScore")}</span>
      <strong className="finalScoreValue" aria-hidden="true">
        <span>{numberFormatter.format(displayScore)}</span>
        {isNewBest && (
          <Crown
            className="finalScoreCrown"
            size={32}
            strokeWidth={2.8}
          />
        )}
      </strong>
    </section>
  );
}

interface HarvestSummaryProps {
  harvestedItems: HarvestedItemResult[];
  t: (key: string, options?: Record<string, unknown>) => string;
  numberFormatter: Intl.NumberFormat;
}

function HarvestIcon({ item }: { item: HarvestedItemResult }) {
  const FallbackIcon = harvestFallbackIcons[item.id] ?? Sprout;

  return (
    <span className={`harvestItemIcon harvestItemIcon--${item.id}`} aria-hidden="true">
      {item.icon ? (
        <FruitAssetImage
          src={item.icon}
          alt=""
          fallback={<FallbackIcon size={26} strokeWidth={2.4} />}
        />
      ) : (
        <FallbackIcon size={26} strokeWidth={2.4} />
      )}
    </span>
  );
}

function HarvestSummary({
  harvestedItems,
  t,
  numberFormatter,
}: HarvestSummaryProps) {
  return (
    <section className="harvestSummary" aria-labelledby="harvest-summary-title">
      <div className="endGameSectionHeading">
        <Sprout size={17} strokeWidth={2.5} aria-hidden="true" />
        <h3 id="harvest-summary-title">{t("gameover.harvestTitle")}</h3>
      </div>
      {harvestedItems.length > 0 ? (
        <div className="harvestResultList">
          {harvestedItems.map((item) => (
            <div
              key={item.id}
              className={`harvestResultItem ${item.count === 0 ? "is-empty" : ""}`}
            >
              <HarvestIcon item={item} />
              <strong>{numberFormatter.format(item.count)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="harvestEmptyState">
          {t("gameover.noHarvest")}
        </p>
      )}
    </section>
  );
}

function PandaMascot({ ariaLabel }: { ariaLabel: string }) {
  return (
    <aside className="pandaMascot" aria-label={ariaLabel}>
      <div className="pandaMascotSticky">
        <div className="pandaHalo" aria-hidden="true" />
        <img
          src={pandaGameOverUrl}
          alt="Gấu trúc đeo khăn đỏ đang vẫy tay"
          draggable={false}
          loading="eager"
          onError={(event) => {
            if (event.currentTarget.dataset.fallback !== "true") {
              event.currentTarget.dataset.fallback = "true";
              event.currentTarget.src = pandaAgainUrl;
              return;
            }

            event.currentTarget.hidden = true;
          }}
        />
      </div>
    </aside>
  );
}

function EndGameActions({
  isDoubled,
  adPending,
  onDoubleScore,
  onReplay,
  onHome,
  t,
}: Pick<GameOverScreenProps, "isDoubled" | "adPending" | "onDoubleScore" | "onReplay" | "onHome"> & {
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div className="endGameActions">
      <GameButton
        variant="primary"
        size="lg"
        fullWidth
        className="endGameDoubleButton"
        disabled={isDoubled || adPending}
        icon={
          <img
            className="rewardVideoButtonIcon endGameDoubleIcon"
            src={rewardVideoUrl}
            alt=""
            draggable={false}
            style={{ width: 36, height: 36, objectFit: 'contain' }}
          />
        }
        onClick={onDoubleScore}
      >
        {isDoubled ? t("gameover.doubled") : t("gameover.double")}
      </GameButton>
      <GameButton
        variant="ghost"
        size="lg"
        fullWidth
        icon={
          <RotateCcw
            className="endGameReplayIcon"
            size={30}
            strokeWidth={3}
          />
        }
        className="endGameReplayButton"
        onClick={onReplay}
        disabled={adPending}
      >
        {t("gameover.replay")}
      </GameButton>
      {onHome && (
        <GameButton
          variant="secondary"
          size="lg"
          fullWidth
          icon={<House size={26} strokeWidth={2.5} />}
          className="endGameVillageButton"
          onClick={onHome}
          disabled={adPending}
        >
          {t("gameover.home")}
        </GameButton>
      )}
    </div>
  );
}

export function GameOverScreen({
  score,
  harvestedItems,
  isNewBest = false,
  isDoubled = false,
  adPending = false,
  onDoubleScore,
  onReplay,
  onHome,
  failureReason,
}: GameOverScreenProps) {
  const { t, i18n } = useTranslation();
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage === "en" ? "en-US" : "vi-VN"),
    [i18n.resolvedLanguage],
  );

  return (
    <div className="endGameBackdrop">
      <div className="endGameCelebration" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <main
        className="endGamePanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-game-title"
      >
        <div className="endGameLayout">
          <div className="endGameMain">
            <header className="endGameHeader">
              <h2 id="end-game-title" className="endGameTitle">
                <span className="endGameTitleKicker">{t("gameover.kicker")}</span>
                <span className="endGameTitleMain">
                  <Wheat aria-hidden="true" />
                  <span>{t("gameover.title")}</span>
                  <Wheat className="endGameTitleWheatRight" aria-hidden="true" />
                </span>
              </h2>
            </header>

            <FinalScoreHero score={score} isNewBest={isNewBest} numberFormatter={numberFormatter} t={t} />

            {failureReason && (
              <p className="mt-2 text-center text-sm font-bold text-[#74481f]" role="status">
                {t(`gameover.failure.${failureReason}`)}
              </p>
            )}

            <div className="endGameResultSplit">
              <HarvestSummary harvestedItems={harvestedItems} t={t} numberFormatter={numberFormatter} />
              <PandaMascot ariaLabel={t("gameover.kicker")} />
            </div>

            <EndGameActions
              isDoubled={isDoubled}
              adPending={adPending}
              onDoubleScore={onDoubleScore}
              onReplay={onReplay}
              onHome={onHome}
              t={t}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
