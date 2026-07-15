import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  HarvestGameEngine,
  type GameState,
  type OrderState,
  type RuntimeSnapshot,
} from "../game/HarvestGameEngine";
import { GameButton } from "../ui/GameButton";
import { FruitAssetImage } from "../ui/FruitAssetImage";
import { AudioManager } from "../../lib/audioManager";
import { GAME_STRINGS, LOCAL_STORAGE_KEYS } from "../../lib/constants";
import { RewardedAdDialog } from "../overlays/RewardedAdDialog";
import { ReviveCountdownOverlay } from "../overlays/ReviveCountdownOverlay";
import { GameOverScreen } from "./GameOverScreen";
import { ReviveScreen } from "./ReviveScreen";
import { ITEM_REGISTRY } from "../game/itemRegistry";
import type { HarvestedItemResult } from "./GameOverScreen";

type FlowScreen =
  | "playing"
  | "reviveOffer"
  | "rewardedAd"
  | "reviveCountdown"
  | "finalGameOver";

type FinalizedRun = {
  runScore: number;
  multiplier: 1 | 2;
  finalScore: number;
  isNewBest: boolean;
};

const EMPTY_RUNTIME: RuntimeSnapshot = {
  modifiers: {
    fallSpeedMultiplier: 1,
    scoreMultiplier: 1,
    comboGraceSeconds: 2,
    feverSegments: 0,
    shieldCharges: 0,
    nextOrderExtraRequired: 0,
  },
  effects: [],
  shield: {
    active: false,
    available: false,
    remainingMs: 0,
    cooldownRemainingMs: 0,
    charges: 0,
  },
  slowTime: {
    active: false,
    available: false,
    remainingMs: 0,
    cooldownRemainingMs: 0,
    charges: 0,
  },
};

function formatSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

function SkillButton({
  label,
  icon,
  active,
  disabled,
  meta,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  disabled: boolean;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-[88px] flex-col rounded-[14px] border px-3 py-2 text-left transition ${
        active
          ? "border-[#7bd7ff] bg-[#7bd7ff]/18"
          : "border-black/10 bg-white/90"
      } ${disabled ? "opacity-55" : "hover:bg-white"}`}
    >
      <span className="text-[18px] leading-none">{icon}</span>
      <span className="mt-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#7A7D7E]">
        {label}
      </span>
      <span className="mt-1 text-[13px] font-extrabold text-[#4A4D4E]">
        {meta}
      </span>
    </button>
  );
}

function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function GameplayScreen({
  onBackToMenu,
  playerName,
  addLeaderboardScore,
}: {
  onBackToMenu?: () => void;
  playerName: string;
  addLeaderboardScore: (name: string, score: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const skillControlsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HarvestGameEngine | null>(null);
  const reviveUsedRef = useRef(false);
  const hasFinalizedRunRef = useRef(false);
  const finalizedRunRef = useRef<FinalizedRun | null>(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => Number(localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0)
  );
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ordersCompleted, setOrdersCompleted] = useState(0);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [flowScreen, setFlowScreen] = useState<FlowScreen>("playing");
  const [countdown, setCountdown] = useState(3);
  const [adProgress, setAdProgress] = useState(0);
  const [adStatus, setAdStatus] = useState<"idle" | "playing" | "completed" | "cancelled">("idle");

  const [currentOrder, setCurrentOrder] = useState<OrderState | null>(null);
  const [feverMeter, setFeverMeter] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>(EMPTY_RUNTIME);
  const [finalizedRun, setFinalizedRun] = useState<FinalizedRun | null>(null);

  const [stats, setStats] = useState({
    highestCombo: 0,
    totalHarvested: 0,
    harvestedItems: [] as HarvestedItemResult[],
  });

  const syncRuntime = useCallback(() => {
    if (engineRef.current) {
      setRuntime(engineRef.current.getRuntimeSnapshot());
    }
  }, []);

  const resetRunState = useCallback(() => {
    reviveUsedRef.current = false;
    hasFinalizedRunRef.current = false;
    finalizedRunRef.current = null;
    setFinalizedRun(null);
    setFlowScreen("playing");
    setCountdown(3);
    setAdProgress(0);
    setAdStatus("idle");
    syncRuntime();
  }, [syncRuntime]);

  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    resetRunState();
    engineRef.current.startGame();
    syncRuntime();
  }, [resetRunState, syncRuntime]);

  const syncEngineLayout = useCallback(() => {
    if (!canvasRef.current || !engineRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rendererWidth = Math.max(1, Math.round(rect.width));
    const rendererHeight = Math.max(1, Math.round(rect.height));
    engineRef.current.resize(rendererWidth, rendererHeight);

    const hudRect = hudRef.current?.getBoundingClientRect();
    const controlsRect = skillControlsRef.current?.getBoundingClientRect();
    const scaleY = rendererHeight / Math.max(1, rect.height);
    const safeTopCss = hudRect
      ? Math.max(0, hudRect.bottom - rect.top + 10)
      : 0;
    const safeBottomCss = controlsRect
      ? Math.max(0, rect.bottom - controlsRect.top + 10)
      : 0;

    engineRef.current.setGameplayBounds({
      left: 0,
      right: rendererWidth,
      top: Math.min(rendererHeight - 1, safeTopCss * scaleY),
      bottom: Math.max(
        1,
        Math.min(rendererHeight - safeBottomCss * scaleY, rendererHeight)
      ),
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
      const currentBest = Number(
        localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0
      );
      const isNewBest = finalScore > currentBest;
      const nextBest = isNewBest ? finalScore : currentBest;

      localStorage.setItem(LOCAL_STORAGE_KEYS.BEST_SCORE, String(nextBest));
      addLeaderboardScore(playerName || "Khách", finalScore);

      const result = {
        runScore,
        multiplier,
        finalScore,
        isNewBest,
      } satisfies FinalizedRun;

      hasFinalizedRunRef.current = true;
      finalizedRunRef.current = result;
      setFinalizedRun(result);
      setBestScore(nextBest);
      return result;
    },
    [addLeaderboardScore, playerName, score]
  );

  const openFinalGameOver = useCallback(() => {
    const runScore = engineRef.current?.score ?? score;
    const currentBest = Number(
      localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0
    );
    const preview = {
      runScore,
      multiplier: 1,
      finalScore: runScore,
      isNewBest: runScore > currentBest,
    } satisfies FinalizedRun;

    hasFinalizedRunRef.current = false;
    finalizedRunRef.current = preview;
    setFinalizedRun(preview);
    setFlowScreen("finalGameOver");
  }, [score]);

  const handleDoubleFinalScore = useCallback(() => {
    finalizeRun(2);
  }, [finalizeRun]);

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
          const currentBest = Number(
            localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0
          );
          const preview = {
            runScore,
            multiplier: 1,
            finalScore: runScore,
            isNewBest: runScore > currentBest,
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
      onScoreChange: setScore,
      onComboChange: setCombo,
      onMissesChange: setMisses,
      onOrdersCompletedChange: setOrdersCompleted,
      onOrderChange: setCurrentOrder,
      onFeverChange: (meter, fever) => {
        setFeverMeter(meter);
        setIsFever(fever);
      },
      onGameStateChange: handleGameStateChange,
      onReady: () => {
        startGame();
        syncEngineLayout();
      },
    });

    engineRef.current = engine;
    void engine.init().catch((error) => {
      console.error("Failed to initialize the gameplay engine", error);
      if (engineRef.current === engine) {
        setGameState("idle");
      }
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleGameStateChange, startGame, syncEngineLayout]);

  useEffect(() => {
    syncEngineLayout();

    const observer = new ResizeObserver(syncEngineLayout);
    if (canvasRef.current) observer.observe(canvasRef.current);
    if (hudRef.current) observer.observe(hudRef.current);
    if (skillControlsRef.current) observer.observe(skillControlsRef.current);

    window.addEventListener("resize", syncEngineLayout);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncEngineLayout);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncEngineLayout);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", syncEngineLayout);
      }
    };
  }, [currentOrder, flowScreen, gameState, syncEngineLayout]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      syncRuntime();
    }, 150);
    return () => window.clearInterval(interval);
  }, [syncRuntime]);

  useEffect(() => {
    if (flowScreen !== "rewardedAd") return;

    setAdProgress(0);
    setAdStatus("playing");
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 2800);
      setAdProgress(progress);
      if (progress >= 1) {
        setAdStatus("completed");
        reviveUsedRef.current = true;
        engineRef.current?.reviveRun({ restoreLives: 5, minOrderTimeMs: 6000 });
        engineRef.current?.setGameState("countdown");
        syncRuntime();
        setCountdown(3);
        setFlowScreen("reviveCountdown");
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [flowScreen, syncRuntime]);

  useEffect(() => {
    if (flowScreen !== "reviveCountdown") return;

    if (countdown <= 0) {
      engineRef.current?.setGameState("playing");
      syncRuntime();
      setFlowScreen("playing");
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, flowScreen, syncRuntime]);

  const handleMenuClick = useCallback(() => {
    if (gameState === "playing") {
      engineRef.current?.setGameState("paused");
      return;
    }

    if (gameState === "paused" || flowScreen === "finalGameOver") {
      onBackToMenu?.();
    }
  }, [flowScreen, gameState, onBackToMenu]);

  const handleConfirmExit = useCallback(
    (exit: boolean) => {
      if (exit) {
        onBackToMenu?.();
        return;
      }
      engineRef.current?.setGameState("playing");
    },
    [onBackToMenu]
  );

  const handleShield = useCallback(() => {
    if (engineRef.current?.activateShield()) {
      AudioManager.playPop();
      syncRuntime();
    }
  }, [syncRuntime]);

  const handleSlowTime = useCallback(() => {
    if (engineRef.current?.activateSlowTime()) {
      AudioManager.playPop();
      syncRuntime();
    }
  }, [syncRuntime]);

  const handleTap = useCallback((event: React.PointerEvent) => {
    if (flowScreen !== "playing" || gameState !== "playing") return;
    engineRef.current?.handleTap(event.clientX, event.clientY);
  }, [flowScreen, gameState]);

  return (
    <div className="relative flex h-full w-full justify-center overflow-hidden bg-[#DCECF0] text-foreground font-sans select-none">
      <div className="relative h-full w-full bg-[#FFFFFF]">
        <div
          ref={canvasRef}
          className={`absolute inset-0 z-0 h-full w-full ${
            flowScreen !== "playing" || gameState === "paused" ? "blur-[2px]" : ""
          }`}
          style={{ cursor: "crosshair", touchAction: "none", zIndex: "var(--z-pixi-canvas)" }}
          onPointerDown={handleTap}
        />

        {(gameState === "playing" ||
          gameState === "paused" ||
          gameState === "dead" ||
          gameState === "countdown") && (
          <>
          <div
            ref={hudRef}
            className="pointer-events-none absolute left-0 right-0 top-0 p-[max(10px,env(safe-area-inset-top))] pb-2"
            style={{ zIndex: "var(--z-hud-info)" }}
          >
            <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(86px,110px)_1fr_minmax(86px,112px)] gap-2 md:grid-cols-[136px_minmax(220px,1fr)_174px] md:gap-3">
              <div className="rounded-[14px] border border-border bg-card/92 px-3 py-2 shadow-sm backdrop-blur-md">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {GAME_STRINGS.SCORE_LABEL}
                </div>
                <div className="mt-1 text-[19px] font-bold leading-none text-foreground md:text-xl">
                  {score}
                </div>
                <div className="mt-1 text-[10px] font-bold text-[#9b8324] md:text-[11px]">
                  {GAME_STRINGS.BEST_LABEL}: {bestScore}
                </div>
              </div>

              <div className="rounded-[14px] border border-border bg-card/92 px-3 py-2 shadow-sm backdrop-blur-md md:px-4">
                {currentOrder ? (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Đang Thu Hoạch
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center md:h-11 md:w-11">
                        <FruitAssetImage
                          src={currentOrder.target.texturePath}
                          alt={currentOrder.target.name}
                          className="h-full w-full object-contain drop-shadow-[0_3px_2px_rgba(74,45,16,0.2)]"
                          fallback={
                            <span className="text-xl leading-none md:text-2xl">
                              {currentOrder.target.emoji}
                            </span>
                          }
                        />
                      </span>
                      <span className="min-w-0 truncate text-[15px] font-bold text-foreground md:text-lg">
                        {currentOrder.target.name.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="text-[16px] font-extrabold text-[#9b8324] md:text-[18px]">
                        {currentOrder.collected}/{currentOrder.required}
                      </div>
                      <div className="text-[13px] font-bold text-muted-foreground">
                        {formatSeconds(currentOrder.timeRemainingMs)}s
                      </div>
                    </div>
                    <div className="mt-2 flex h-[6px] overflow-hidden rounded-full bg-black/10">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-full flex-1 border-r border-white/20 ${
                            index < feverMeter ? "bg-[#EED05E]" : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-14 items-center justify-center text-sm font-bold text-muted-foreground">
                    Đơn hàng mới đang tới
                  </div>
                )}
              </div>

              <div className="pointer-events-auto flex items-stretch justify-end gap-2" style={{ zIndex: "var(--z-hud-controls)" }}>
                  <div className="rounded-[14px] border border-border bg-card/92 px-2 py-2 shadow-sm backdrop-blur-md md:px-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {GAME_STRINGS.COMBO_LABEL}
                    </div>
                    <div className="mt-1 text-[16px] font-bold leading-none text-[#9b8324] md:text-lg">
                      x{combo}
                    </div>
                    <div className="mt-1 flex gap-0.5 md:mt-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span
                          key={index}
                          className="text-[10px] md:text-[12px]"
                          style={{
                            filter:
                              index >= 5 - misses
                                ? "grayscale(1) opacity(0.3)"
                                : "none",
                          }}
                        >
                          ❤️
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleMenuClick}
                    className="min-h-11 min-w-11 rounded-[12px] border border-border bg-card/95 p-2 shadow-sm backdrop-blur-md transition hover:bg-white active:scale-95"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#4A4D4E]"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  </button>
              </div>
            </div>

            {runtime.effects.length > 0 && (
              <div className="pointer-events-none mx-auto mt-2 flex w-full max-w-5xl flex-wrap gap-2">
                {runtime.effects.map((effect) => (
                  <div
                    key={effect.id}
                    className={`rounded-full px-3 py-1 text-[12px] font-bold ${
                      effect.tone === "buff"
                        ? "bg-[#EED05E]/92 text-[#4A4D4E]"
                        : "bg-[#CC7069]/92 text-white"
                    }`}
                  >
                    {effect.icon} {effect.label} {formatSeconds(effect.remainingMs)}s
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            ref={skillControlsRef}
            className="pointer-events-auto absolute bottom-0 left-0 right-0 flex justify-center px-[max(12px,env(safe-area-inset-left))] pb-[max(12px,env(safe-area-inset-bottom))]"
            style={{ zIndex: "var(--z-hud-controls)" }}
          >
            <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-border bg-white/78 p-2 shadow-[0_10px_28px_rgba(74,77,78,0.16)] backdrop-blur-md">
              <SkillButton
                label={GAME_STRINGS.SHIELD_LABEL}
                icon="🛡️"
                active={runtime.shield.active}
                disabled={!runtime.shield.available}
                meta={
                  runtime.shield.active
                    ? `${formatSeconds(runtime.shield.remainingMs)}s`
                    : runtime.shield.cooldownRemainingMs > 0
                    ? `${formatSeconds(runtime.shield.cooldownRemainingMs)}s`
                    : `${runtime.shield.charges}`
                }
                onClick={handleShield}
              />
              <SkillButton
                label={GAME_STRINGS.SLOW_TIME_LABEL}
                icon="⏳"
                active={runtime.slowTime.active}
                disabled={!runtime.slowTime.available}
                meta={
                  runtime.slowTime.active
                    ? `${formatSeconds(runtime.slowTime.remainingMs)}s`
                    : runtime.slowTime.cooldownRemainingMs > 0
                    ? `${formatSeconds(runtime.slowTime.cooldownRemainingMs)}s`
                    : "Sẵn"
                }
                onClick={handleSlowTime}
              />
            </div>
          </div>
          </>
        )}

        {gameState === "loading" && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#DCECF0]/90">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#DCECF0] border-t-[#EED05E]" />
            <div className="mt-4 text-[18px] font-extrabold text-[#4A4D4E]">
              {GAME_STRINGS.LOADING}
            </div>
          </div>
        )}

        {flowScreen === "reviveOffer" && (
          <ModalPortal>
          <ReviveScreen
            onSkip={openFinalGameOver}
            onWatchAd={() => setFlowScreen("rewardedAd")}
          />
          </ModalPortal>
        )}

        {flowScreen === "rewardedAd" && (
          <ModalPortal>
          <RewardedAdDialog
            progress={adProgress}
            status={adStatus}
            onCancel={() => {
              setAdStatus("cancelled");
              openFinalGameOver();
            }}
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
            isNewBest={finalizedRun.isNewBest}
            isDoubled={finalizedRun.multiplier === 2}
            onDoubleScore={handleDoubleFinalScore}
            onReplay={handleReplayFromResults}
          />
          </ModalPortal>
        )}

        {gameState === "paused" && flowScreen === "playing" && (
          <ModalPortal>
          <div className="fixed inset-0 flex items-center justify-center bg-[rgba(74,77,78,0.35)] backdrop-blur-sm" style={{ zIndex: "var(--z-modal)" }}>
            <div className="mx-4 w-full max-w-sm rounded-[16px] border border-[rgba(74,77,78,0.1)] bg-[#DCECF0] p-8 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)]">
              <h2 className="mb-2 text-[36px] font-extrabold text-[#4A4D4E]">
                {GAME_STRINGS.PAUSE_TITLE}
              </h2>
              <p className="mb-6 text-[15px] text-[#7A7D7E]">
                {GAME_STRINGS.PAUSE_MESSAGE}
              </p>
              <div className="flex justify-center gap-4">
                <GameButton variant="secondary" size="md" onClick={() => handleConfirmExit(true)}>
                  {GAME_STRINGS.YES}
                </GameButton>
                <GameButton variant="primary" size="md" onClick={() => handleConfirmExit(false)}>
                  {GAME_STRINGS.NO_RESUME}
                </GameButton>
              </div>
            </div>
          </div>
          </ModalPortal>
        )}
      </div>
    </div>
  );
}
