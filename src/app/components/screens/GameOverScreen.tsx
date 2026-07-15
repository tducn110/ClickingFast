import { useEffect, useState, type ComponentType } from "react";
import {
  Apple,
  Cherry,
  Citrus,
  Crown,
  RotateCcw,
  Sprout,
  Wheat,
  type LucideProps,
} from "lucide-react";
import { GameButton } from "../ui/GameButton";
import { FruitAssetImage } from "../ui/FruitAssetImage";

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
  onDoubleScore: () => void;
  onReplay: () => void;
}

const numberFormatter = new Intl.NumberFormat("vi-VN");

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
}: {
  score: number;
  isNewBest: boolean;
}) {
  const displayScore = useCountUp(score);

  return (
    <section
      className="finalScoreHero"
      aria-label={`Điểm cuối ${numberFormatter.format(score)}${isNewBest ? ", kỷ lục mới" : ""}`}
    >
      <span className="finalScoreLabel">Điểm cuối</span>
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
}: Pick<GameOverScreenProps, "harvestedItems">) {
  return (
    <section className="harvestSummary" aria-labelledby="harvest-summary-title">
      <div className="endGameSectionHeading">
        <Sprout size={17} strokeWidth={2.5} aria-hidden="true" />
        <h3 id="harvest-summary-title">Nông sản đã thu hoạch</h3>
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
          Chưa thu hoạch được nông sản nào.
        </p>
      )}
    </section>
  );
}

function PandaMascot() {
  return (
    <aside className="pandaMascot" aria-label="Gấu trúc mừng mùa vụ">
      <div className="pandaHalo" aria-hidden="true" />
      <img
        src="/assets/characters/panda_game_over.png"
        alt="Gấu trúc đeo khăn đỏ đang vẫy tay"
      />
    </aside>
  );
}

function EndGameActions({
  isDoubled,
  onDoubleScore,
  onReplay,
}: Pick<GameOverScreenProps, "isDoubled" | "onDoubleScore" | "onReplay">) {
  return (
    <div className="endGameActions">
      <GameButton
        variant="primary"
        size="lg"
        fullWidth
        className="endGameDoubleButton"
        disabled={isDoubled}
        onClick={onDoubleScore}
      >
        {isDoubled ? "Đã x2 điểm" : "X2 điểm"}
      </GameButton>
      <GameButton
        variant="ghost"
        size="lg"
        fullWidth
        icon={<RotateCcw size={21} strokeWidth={2.8} />}
        className="endGameReplayButton"
        onClick={onReplay}
      >
        Chơi lại
      </GameButton>
    </div>
  );
}

export function GameOverScreen({
  score,
  harvestedItems,
  isNewBest = false,
  isDoubled = false,
  onDoubleScore,
  onReplay,
}: GameOverScreenProps) {
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
                <span className="endGameTitleKicker">Mùa vụ</span>
                <span className="endGameTitleMain">
                  <Wheat aria-hidden="true" />
                  <span>Kết thúc</span>
                  <Wheat className="endGameTitleWheatRight" aria-hidden="true" />
                </span>
              </h2>
            </header>

            <FinalScoreHero score={score} isNewBest={isNewBest} />

            <div className="endGameResultSplit">
              <HarvestSummary harvestedItems={harvestedItems} />
              <PandaMascot />
            </div>

            <EndGameActions
              isDoubled={isDoubled}
              onDoubleScore={onDoubleScore}
              onReplay={onReplay}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
