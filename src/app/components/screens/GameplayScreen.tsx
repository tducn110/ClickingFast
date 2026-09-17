import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Heart, Hourglass, Pause, Timer } from "lucide-react";
import {
  HarvestGameEngine,
  type GameState,
  type HudSnapshot,
  type GameplayViewportMetrics,
} from "../game/HarvestGameEngine";
import { FruitAssetImage } from "../ui/FruitAssetImage";
import { AudioManager } from "../../lib/audioManager";
import { PauseOverlay } from "../overlays/PauseOverlay";
import { ReviveCountdownOverlay } from "../overlays/ReviveCountdownOverlay";
import { GameOverScreen } from "./GameOverScreen";
import { ReviveScreen } from "./ReviveScreen";
import { ITEM_REGISTRY } from "../game/itemRegistry";
import type { OrderRequirement } from "../game/gameRules";
import { preloadCreatureTextures } from "../game/systems/CreatureSystem";
import { MAX_MISSES, WATERLINE_RATIO } from "../game/constants";
import type { HarvestedItemResult } from "./GameOverScreen";
import { type WinkIntegration } from "../../../integrations/wink/types";
import { showRewardedVideo } from "../../../integrations/ads/googleH5Ads";
import { useTranslation } from "react-i18next";

type FlowScreen =
  | "playing"
  | "reviveOffer"
  | "reviveCountdown"
  | "finalGameOver";

type FinalizedRun = {
  runScore: number;
  multiplier: 1 | 2;
  finalScore: number;
  isNewBest: boolean;
};

const EMPTY_HUD: HudSnapshot = {
  score: 0,
  combo: 0,
  comboMultiplier: 1,
  misses: 0,
  ordersCompleted: 0,
  orderPhase: "transition",
  currentOrder: null,
  slowTime: {
    active: false,
    remainingMs: 0,
  },
  comboWindow: {
    active: false,
    remainingMs: 0,
    durationMs: 1,
    revision: 0,
  },
  shakeTrigger: 0,
  fever: {
    state: "normal",
    meter: 0,
    remainingMs: 0,
  },
  failureReason: null,
  metrics: {
    orderId: 0,
    targetWaitMs: [],
    targetWaitP50Ms: 0,
    targetWaitP95Ms: 0,
    orderCompletionMs: [],
    actions: 0,
    correctHits: 0,
    correctHitsPerMinute: 0,
    wrongTaps: 0,
    hazardHits: 0,
    orderCompletions: 0,
    orderFailures: 0,
    comboSamples: [],
    powerupUsage: 0,
    lastInteraction: "none",
    activeCreatures: 0,
    activeTargets: 0,
    activeDistractors: 0,
    activeHazards: 0,
    activePickups: 0,
    gameTime: 0,
    simulationTime: 0,
    lastSpawnDecision: "none",
    targetGuaranteeTriggered: 0,
    actionsPerSecond: 0,
    wrongTapRate: 0,
    hazardHitsPerMinute: 0,
    orderFailureRate: 0,
    comboAverage: 0,
    comboP95: 0,
    deathCause: null,
    feverActivations: 0,
    targetPresenceRatio: 0,
    screenOccupancy: 0,
    hitCandidatesChecked: 0,
    swipeSegmentsProcessed: 0,
  },
};

function formatSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

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

function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function ComboMeter({
  combo,
  active,
  progress,
  revision,
  label,
}: {
  combo: number;
  active: boolean;
  progress: number;
  revision: number;
  label: string;
}) {
  return (
    <div className="comboMeter" data-active={active ? "true" : "false"}>
      <div className="comboMeterTop">
        <span>{label}</span>
        <strong>x{combo}</strong>
      </div>
      <div className="comboMeterTrack" aria-hidden="true">
        <span
          key={revision}
          className="comboMeterFill"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}

const ComboMeterMemo = memo(ComboMeter);

const ScoreCard = memo(function ScoreCard({
  score,
  combo,
  comboActive,
  comboProgress,
  comboRevision,
  scoreLabel,
  comboLabel,
}: {
  score: number;
  combo: number;
  comboActive: boolean;
  comboProgress: number;
  comboRevision: number;
  scoreLabel: string;
  comboLabel: string;
}) {
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

const OrderCard = memo(function OrderCard({
  requirements,
  timeRemainingMs,
  timeLimitMs,
  orderLabel,
  incomingLabel,
}: {
  requirements: OrderRequirement[];
  timeRemainingMs: number;
  timeLimitMs: number;
  orderLabel: string;
  incomingLabel: string;
}) {
  const { t } = useTranslation();
  const hasOrder = requirements.length > 0;
  const orderTimeProgress = hasOrder
    ? Math.max(
        0,
        Math.min(
          100,
          (timeRemainingMs / Math.max(1, timeLimitMs)) * 100
        )
      )
    : 0;
  const orderTimeColor =
    orderTimeProgress <= 25
      ? "#ef4b37"
      : orderTimeProgress <= 50
      ? "#f2a62d"
      : "#82bd18";

  return (
    <section
      aria-label={orderLabel}
      className="gameplayHudCard gameplayOrderCard relative min-h-[calc(102*var(--su))] overflow-hidden rounded-[calc(17*var(--su))] border-2 border-[#e2b56d] px-2 py-2"
      style={{
        background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
        boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
      }}
    >
      <span className="pointer-events-none absolute inset-[calc(3*var(--su))] rounded-[calc(13*var(--su))] border border-white/75" />
      {hasOrder ? (
        <div className="relative flex h-full min-w-0 flex-col justify-center">
          {requirements.length === 1 ? (() => {
            const req = requirements[0];
            const def = ITEM_REGISTRY.find(i => i.id === req.kind);
            if (!def) return null;
            const localizedName = t(`items.${req.kind}`, { defaultValue: def.name });
            return (
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center">
                  <FruitAssetImage
                    src={def.texturePath}
                    alt={localizedName}
                    className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(91,48,17,0.28)]"
                    fallback={
                      <span className="text-[calc(28*var(--su))] leading-none">
                        {def.emoji}
                      </span>
                    }
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[calc(12*var(--su))] font-black uppercase leading-none text-[#70451f] drop-shadow-[0_1px_0_#fff]">
                    {localizedName}
                  </span>
                  <span className="mt-1 block text-[calc(16*var(--su))] font-black leading-none text-[#b86f12]">
                    {req.collected}/{req.required}
                  </span>
                </span>
              </div>
            );
          })() : (
            <div className="flex h-full w-full items-center justify-around gap-1">
              {requirements.map((req) => {
                const def = ITEM_REGISTRY.find(i => i.id === req.kind);
                if (!def) return null;
                const localizedName = t(`items.${req.kind}`, { defaultValue: def.name });
                const isComplete = req.collected >= req.required;
                return (
                  <div key={req.kind} className={`flex flex-col items-center ${isComplete ? "opacity-40 grayscale" : ""}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center">
                      <FruitAssetImage
                        src={def.texturePath}
                        alt={localizedName}
                        className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(91,48,17,0.28)]"
                        fallback={
                          <span className="text-[calc(28*var(--su))] leading-none">
                            {def.emoji}
                          </span>
                        }
                      />
                    </span>
                    <span className="mt-1 text-[calc(16*var(--su))] font-black leading-none text-[#b86f12]">
                      {req.collected}/{req.required}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-1.5">
            <Timer
              aria-hidden="true"
              className="h-[calc(15*var(--su))] w-[calc(15*var(--su))] shrink-0 text-[#805125]"
              strokeWidth={2.3}
            />
            <div className="h-[calc(7*var(--su))] min-w-0 flex-1 overflow-hidden rounded-full border border-[#d6b27b] bg-[#e7d5b5] p-[calc(1*var(--su))] shadow-inner">
              <div
                className="h-full rounded-full transition-[width,background-color] duration-150"
                style={{
                  width: `${orderTimeProgress}%`,
                  background: `linear-gradient(180deg, ${orderTimeColor}, color-mix(in srgb, ${orderTimeColor} 78%, #5f7e12))`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)",
                }}
              />
            </div>
            <span className="min-w-[calc(24*var(--su))] text-right text-[calc(10*var(--su))] font-black text-[#70451f]">
              {formatSeconds(timeRemainingMs)}s
            </span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center text-[#95622a]">
          <span className="mb-1 text-[calc(24*var(--su))]">🛒</span>
          <span className="text-[calc(14*var(--su))] font-extrabold uppercase">
            {incomingLabel}
          </span>
        </div>
      )}
    </section>
  );
});

const LivesCard = memo(function LivesCard({
  remainingLives,
  onPauseClick,
  livesLabel,
  pauseLabel,
}: {
  remainingLives: number;
  onPauseClick: () => void;
  livesLabel: string;
  pauseLabel: string;
}) {
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

export function GameplayScreen({
  onBackToMenu,
  wink,
}: {
  onBackToMenu?: () => void;
  wink: WinkIntegration;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HarvestGameEngine | null>(null);
  const layoutFrameRef = useRef(0);
  const settleTimerRef = useRef<number[]>([]);
  const reviveUsedRef = useRef(false);
  const hasFinalizedRunRef = useRef(false);
  const finalizedRunRef = useRef<FinalizedRun | null>(null);
  const roundStartedRef = useRef(false);
  const submitInFlightRef = useRef(false);

  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [flowScreen, setFlowScreen] = useState<FlowScreen>("playing");
  const [countdown, setCountdown] = useState(3);
    const [engineError, setEngineError] = useState(false);
  const [engineRetryKey, setEngineRetryKey] = useState(0);

  const [finalizedRun, setFinalizedRun] = useState<FinalizedRun | null>(null);
  const [adPending, setAdPending] = useState(false);

  const { score, combo, misses, currentOrder } = hud;
  const { t } = useTranslation();


  const [stats, setStats] = useState({
    highestCombo: 0,
    totalHarvested: 0,
    harvestedItems: [] as HarvestedItemResult[],
  });

  const syncHud = useCallback(() => {
    if (engineRef.current) {
      setHud(engineRef.current.getHudSnapshot());
    }
  }, []);

  const resetRunState = useCallback(() => {
    reviveUsedRef.current = false;
    hasFinalizedRunRef.current = false;
    finalizedRunRef.current = null;
    submitInFlightRef.current = false;
    setFinalizedRun(null);
    setFlowScreen("playing");
    setCountdown(3);
    syncHud();
  }, [syncHud]);

  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
    AudioManager.playBGM(AudioManager.GAME_BGM_VOLUME);
    resetRunState();
    wink.gameplayStart();
    roundStartedRef.current = true;
    engineRef.current.startGame();
    syncHud();
  }, [resetRunState, syncHud, wink]);

  const syncEngineLayout = useCallback(() => {
    window.cancelAnimationFrame(layoutFrameRef.current);
    layoutFrameRef.current = window.requestAnimationFrame(() => {
      layoutFrameRef.current = 0;
      if (!canvasRef.current || !engineRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const rendererWidth = Math.max(1, Math.round(rect.width));
      const rendererHeight = Math.max(1, Math.round(rect.height));
      

      const hudRect = hudRef.current?.getBoundingClientRect();
      const scaleY = rendererHeight / Math.max(1, rect.height);
      const safeTopCss = hudRect
        ? Math.max(0, hudRect.bottom - rect.top + 10)
        : 0;
      const gameplayBottom = rendererHeight * WATERLINE_RATIO;

      const metrics: GameplayViewportMetrics = {
        left: rect.left,
        top: rect.top,
        cssWidth: rect.width,
        cssHeight: rect.height,
        rendererWidth,
        rendererHeight,
        gameplayBounds: {
        left: 0,
        right: rendererWidth,
        top: Math.min(rendererHeight - 1, safeTopCss * scaleY),
        bottom: Math.max(1, Math.min(gameplayBottom, rendererHeight)),
        },
      };
      engineRef.current.updateViewport(metrics);
    });
  }, []);

  const finalizeRun = useCallback(
    (multiplier: 1 | 2) => {
      if (
        hasFinalizedRunRef.current &&
        finalizedRunRef.current &&
        finalizedRunRef.current.multiplier >= multiplier
      ) {
        return finalizedRunRef.current;
      }

      const runScore =
        finalizedRunRef.current?.runScore ?? engineRef.current?.score ?? score;
      const finalScore = runScore * multiplier;
      const result = {
        runScore,
        multiplier,
        finalScore,
        isNewBest: false,
      } satisfies FinalizedRun;

      hasFinalizedRunRef.current = true;
      finalizedRunRef.current = result;
      setFinalizedRun(result);

      if (roundStartedRef.current && !submitInFlightRef.current) {
        submitInFlightRef.current = true;
        if (wink.canSubmitScore) {
          wink.submitFinalScore({
            score: finalScore,
          })
            .then((submission) => {
              if (submission) {
                const current = finalizedRunRef.current;
                if (current?.finalScore === finalScore) {
                  const updated = { ...current, isNewBest: submission.isNewBest };
                  finalizedRunRef.current = updated;
                  setFinalizedRun(updated);
                }
              }
              return wink.refreshLeaderboard();
            })
            .catch((error) => console.warn("Score submit failed:", error))
            .finally(() => {
              wink.gameplayStop();
              roundStartedRef.current = false;
            });
        } else {
          wink.gameplayStop();
          roundStartedRef.current = false;
        }
      }

      return result;
    },
    [score, wink]
  );

  const openFinalGameOver = useCallback(() => {
    const runScore = engineRef.current?.score ?? score;
    const preview = {
      runScore,
      multiplier: 1,
      finalScore: runScore,
      isNewBest: false,
    } satisfies FinalizedRun;

    hasFinalizedRunRef.current = false;
    finalizedRunRef.current = preview;
    setFinalizedRun(preview);
    setFlowScreen("finalGameOver");
  }, [score]);

  const acceptRevive = useCallback(async () => {
    if (adPending) return;
    setAdPending(true);
    const rewarded = await showRewardedVideo({ name: "revive_after_death" });
    setAdPending(false);
    if (!rewarded) return;
    reviveUsedRef.current = true;
    engineRef.current?.reviveRun({ restoreLives: 5, minOrderTimeMs: 6000 });
    engineRef.current?.setGameState("countdown");
    syncHud();
    setCountdown(3);
    setFlowScreen("reviveCountdown");
  }, [adPending, syncHud]);

  const handleDoubleFinalScore = useCallback(async () => {
    if (adPending) return;
    setAdPending(true);
    const rewarded = await showRewardedVideo({ name: "double_final_score" });
    setAdPending(false);
    if (!rewarded) return;
    finalizeRun(2);
  }, [adPending, finalizeRun]);

  const handleReplayFromResults = useCallback(() => {
    finalizeRun(finalizedRunRef.current?.multiplier ?? 1);
    startGame();
  }, [finalizeRun, startGame]);

  const handleGameStateChange = useCallback(
    (state: GameState) => {
      setGameState(state);

      if (state === "dead") {
        if (engineRef.current) {
          setStats({
            highestCombo: engineRef.current.highestCombo,
            totalHarvested: engineRef.current.totalHarvested,
            harvestedItems: ITEM_REGISTRY.filter(
              (item) => item.category === "produce"
            ).map((item) => ({
              id: item.id,
              name: item.name,
              icon: item.texturePath,
              count: engineRef.current?.harvestedCounts[item.id] ?? 0,
            })),
          });
        }

        if (reviveUsedRef.current) {
          const runScore = engineRef.current?.score ?? 0;
          const preview = {
            runScore,
            multiplier: 1,
            finalScore: runScore,
            isNewBest: false,
          } satisfies FinalizedRun;

          hasFinalizedRunRef.current = false;
          finalizedRunRef.current = preview;
          setFinalizedRun(preview);
          setFlowScreen("finalGameOver");
        } else {
          setFlowScreen("reviveOffer");
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new HarvestGameEngine(canvasRef.current, {
      onHudChange: setHud,
      onGameStateChange: handleGameStateChange,
      onReady: () => {
        setEngineError(false);
        startGame();
        syncEngineLayout();
      },
    });

    engineRef.current = engine;
    void engine.init().catch((error) => {
      console.error("Failed to initialize the gameplay engine", error);
      if (engineRef.current === engine) {
        setEngineError(true);
        setGameState("idle");
      }
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [engineRetryKey, handleGameStateChange, startGame, syncEngineLayout]);

  useEffect(() => {
    syncEngineLayout();

    const observer = new ResizeObserver(syncEngineLayout);
    if (canvasRef.current) observer.observe(canvasRef.current);
    if (hudRef.current) observer.observe(hudRef.current);

    window.addEventListener("resize", syncEngineLayout);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncEngineLayout);
    }
    settleTimerRef.current = [120, 300].map((delay) =>
      window.setTimeout(syncEngineLayout, delay),
    );

    return () => {
      observer.disconnect();
      for (const timer of settleTimerRef.current) window.clearTimeout(timer);
      settleTimerRef.current = [];
      window.cancelAnimationFrame(layoutFrameRef.current);
      window.removeEventListener("resize", syncEngineLayout);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", syncEngineLayout);
      }
    };
  }, [syncEngineLayout]);

  useEffect(() => {
    const handleFocusLoss = () => {
      if ((document.hidden || !document.hasFocus()) && engineRef.current?.gameState === "playing") {
        engineRef.current.setGameState("paused");
        AudioManager.pauseBGM();
      }
    };
    
    document.addEventListener("visibilitychange", handleFocusLoss);
    window.addEventListener("blur", handleFocusLoss);

    return () => {
      document.removeEventListener("visibilitychange", handleFocusLoss);
      window.removeEventListener("blur", handleFocusLoss);
    };
  }, []);

  // Sync pause state from Wink host
  useEffect(() => {
    if (wink.hostPaused && engineRef.current?.gameState === "playing") {
      engineRef.current.setGameState("paused");
      AudioManager.pauseBGM();
    } else if (!wink.hostPaused && engineRef.current?.gameState === "paused") {
      engineRef.current.setGameState("playing");
      AudioManager.resumeBGM();
    }
  }, [wink.hostPaused]);

  // Sync mute state from Wink host
  useEffect(() => {
    AudioManager.setHostMuted(wink.hostMuted);
  }, [wink.hostMuted]);

  useEffect(() => {
    if (flowScreen !== "reviveCountdown") return;

    if (countdown <= 0) {
      engineRef.current?.setGameState("playing");
      AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
      AudioManager.resumeBGM(AudioManager.GAME_BGM_VOLUME);
      syncHud();
      setFlowScreen("playing");
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, flowScreen, syncHud]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const preventBrowserGesture = (event: TouchEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select, [data-no-game-gesture]")) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const preventContextMenu = (event: MouseEvent) => {
      // Prevent long-press context menu on mobile, and right click
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    root.addEventListener("touchmove", preventBrowserGesture, { passive: false });
    root.addEventListener("contextmenu", preventContextMenu);

    return () => {
      root.removeEventListener("touchmove", preventBrowserGesture);
      root.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  const handleMenuClick = useCallback(() => {
    if (gameState === "playing") {
      engineRef.current?.setGameState("paused");
      AudioManager.pauseBGM();
      return;
    }

    if (gameState === "paused" || flowScreen === "finalGameOver") {
      AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
      AudioManager.resumeBGM(AudioManager.LANDING_BGM_VOLUME);
      onBackToMenu?.();
    }
  }, [flowScreen, gameState, onBackToMenu]);

  const handleConfirmExit = useCallback(
    (exit: boolean) => {
      if (exit) {
        AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
        AudioManager.resumeBGM(AudioManager.LANDING_BGM_VOLUME);
        onBackToMenu?.();
        return;
      }
      AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
      AudioManager.resumeBGM(AudioManager.GAME_BGM_VOLUME);
      engineRef.current?.setGameState("playing");
    },
    [onBackToMenu]
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (flowScreen !== "playing" || gameState !== "playing") return;
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    engineRef.current?.handlePointerDown(event.clientX, event.clientY, event.pointerId);
  }, [flowScreen, gameState]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (flowScreen !== "playing" || gameState !== "playing" || !event.isPrimary) return;
    engineRef.current?.handlePointerMove(event.clientX, event.clientY);
  }, [flowScreen, gameState]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.isPrimary) engineRef.current?.handlePointerUp();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const remainingLives = Math.max(0, MAX_MISSES - misses);
  const debugEnabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("gameDebug") === "1";

  return (
    <div
      ref={rootRef}
      className="gameplayRoot fixed inset-0 flex h-[100vh] h-[100dvh] w-full justify-center overflow-hidden bg-[#DCECF0] text-foreground font-sans select-none"
      
    >
      <div className="relative h-full w-full bg-[#FFFFFF]">
        <div
          ref={canvasRef}
          className="gameplayCanvasHost absolute inset-0 z-0 h-full w-full"
          style={{ cursor: "crosshair", touchAction: "none", zIndex: "var(--z-pixi-canvas)" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {(gameState === "playing" ||
          gameState === "paused" ||
          gameState === "dead" ||
          gameState === "countdown") && (
          <>
          <div
            ref={hudRef}
            className="gameplayHud pointer-events-none absolute left-0 right-0 top-0 p-[max(10px,env(safe-area-inset-top))] pb-2"
            style={{ zIndex: "var(--z-hud-info)" }}
          >
            <div className="gameplayHudGrid mx-auto grid w-full max-w-[980px] grid-cols-[1fr_1.65fr_0.9fr] gap-1.5">
              <ScoreCard
                score={score}
                combo={hud.combo}
                comboActive={hud.comboWindow.active && hud.combo > 1}
                comboProgress={
                  hud.comboWindow.active
                    ? Math.max(0, Math.min(1, hud.comboWindow.remainingMs / hud.comboWindow.durationMs))
                    : 0
                }
                comboRevision={hud.comboWindow.revision}
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
                onPauseClick={handleMenuClick}
                livesLabel={t("gameplay.lives")}
                pauseLabel={t("gameplay.pause")}
              />
            </div>

            {hud.slowTime.active && (
              <div className="pointer-events-none mx-auto mt-2 flex w-full max-w-[980px] justify-center">
                <div className="rounded-full border border-[#5faac7] bg-[#d8f6ff]/95 px-3 py-1 text-[calc(12*var(--su))] font-black text-[#285f73] shadow-sm">
                  <Hourglass aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                  {t("gameplay.slowTime")} {formatSeconds(hud.slowTime.remainingMs)}s
                </div>
              </div>
            )}
            <div className="pointer-events-none mx-auto mt-2 w-full max-w-[980px]">
              <div className="rounded-full border border-[#e2a742] bg-[#fff3b8]/95 px-3 py-1 text-center text-[calc(12*var(--su))] font-black uppercase tracking-[0.12em] text-[#8b5318] shadow-sm">
                <span>FEVER</span>
                {hud.fever.state !== "normal" && <span className="ml-2">{Math.ceil(hud.fever.remainingMs / 1000)}s</span>}
                <span className="ml-2 inline-block h-1.5 w-24 overflow-hidden rounded-full bg-[#e8cf87] align-middle">
                  <span className="block h-full origin-left rounded-full bg-[#ef8f29] transition-transform" style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.fever.meter / 100))})` }} />
                </span>
                {hud.fever.state === "normal" && <span className="ml-2">{Math.round(hud.fever.meter)}%</span>}
              </div>
            </div>
          </div>
          {debugEnabled && (
            <pre className="pointer-events-none absolute left-2 top-2 z-[var(--z-debug)] max-w-[min(92vw,440px)] overflow-hidden rounded bg-black/70 p-2 text-[calc(10*var(--su))] leading-tight text-lime-200">
              {JSON.stringify({
                order: hud.currentOrder?.requirements,
                orderId: hud.metrics.orderId,
                orderPhase: hud.orderPhase,
                fever: hud.fever,
                metrics: hud.metrics,
                failureReason: hud.failureReason,
              }, null, 2)}
            </pre>
          )}
          </>
        )}

        {gameState === "loading" && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#DCECF0]/90">
            <div className="h-10 w-10 animate-spin rounded-full border-[calc(3*var(--su))] border-[#DCECF0] border-t-[#EED05E]" />
            <div className="mt-4 text-[calc(18*var(--su))] font-extrabold text-[#4A4D4E]">
              {t("common.loading")}
            </div>
          </div>
        )}

        {engineError && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#DCECF0]/95 px-5 text-center">
            <div className="text-[calc(18*var(--su))] font-black text-[#70451f]">
              {t("gameplay.openFailed")}
            </div>
            <button
              type="button"
              className="mt-4 rounded-full border-2 border-[#e2b56d] bg-[#fff8e7] px-5 py-2 text-[calc(14*var(--su))] font-black text-[#7a481d] shadow-[0_3px_0_#b87931]"
              onClick={() => {
                setEngineError(false);
                setGameState("loading");
                setEngineRetryKey((value) => value + 1);
              }}
            >
              {t("gameplay.retry")}
            </button>
          </div>
        )}

        {flowScreen === "reviveOffer" && (
          <ModalPortal>
            <ReviveScreen
              disabled={adPending}
              onSkip={() => {
                openFinalGameOver();
              }}
              onWatchAd={acceptRevive}
            />
          </ModalPortal>
        )}

        {flowScreen === "reviveCountdown" && (
          <ModalPortal>
            <ReviveCountdownOverlay countdown={countdown} />
          </ModalPortal>
        )}

        {flowScreen === "finalGameOver" && finalizedRun && (
          <ModalPortal>
          <GameOverScreen
            score={finalizedRun.finalScore}
            harvestedItems={stats.harvestedItems}
            failureReason={hud.failureReason}
            isNewBest={finalizedRun.isNewBest}
            isDoubled={finalizedRun.multiplier === 2}
            adPending={adPending}
            onDoubleScore={handleDoubleFinalScore}
            onReplay={handleReplayFromResults}
          />
          </ModalPortal>
        )}

        {gameState === "paused" && flowScreen === "playing" && (
          <ModalPortal>
            <PauseOverlay
              onExit={() => handleConfirmExit(true)}
              onResume={() => handleConfirmExit(false)}
            />
          </ModalPortal>
        )}
      </div>
    </div>
  );
}

export function warmGameplayAssets() {
  return preloadCreatureTextures(ITEM_REGISTRY);
}
