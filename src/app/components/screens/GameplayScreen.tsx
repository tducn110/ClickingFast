import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  HarvestGameEngine,
  type GameState,
  type OrderState,
  type RuntimeSnapshot,
} from "../game/HarvestGameEngine";
import { FruitAssetImage } from "../ui/FruitAssetImage";
import { GAME_STRINGS, LOCAL_STORAGE_KEYS } from "../../lib/constants";
import { PauseOverlay } from "../overlays/PauseOverlay";
import { ReviveCountdownOverlay } from "../overlays/ReviveCountdownOverlay";
import { GameOverScreen } from "./GameOverScreen";
import { ReviveScreen } from "./ReviveScreen";
import { ITEM_REGISTRY } from "../game/itemRegistry";
import { MAX_MISSES, WATERLINE_RATIO } from "../game/constants";
import type { HarvestedItemResult } from "./GameOverScreen";

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

function HudHeart({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 22"
      aria-hidden="true"
      className="h-auto w-[clamp(10px,2.9vw,16px)] shrink-0 drop-shadow-[0_1px_0_rgba(113,57,24,0.24)]"
    >
      <path
        d="M12 20.2C9.2 17.8 2 12.6 2 7.1 2 3.7 4.3 1.5 7.4 1.5c2 0 3.7 1.1 4.6 2.7.9-1.6 2.6-2.7 4.6-2.7 3.1 0 5.4 2.2 5.4 5.6 0 5.5-7.2 10.7-10 13.1Z"
        fill={active ? "#ef3e36" : "#d8ccb5"}
        stroke={active ? "#b92825" : "#c6b99f"}
        strokeWidth="1.25"
      />
      {active && (
        <path
          d="M6.2 4.7c1.1-1 2.7-.8 3.5.1"
          fill="none"
          stroke="rgba(255,255,255,0.72)"
          strokeLinecap="round"
          strokeWidth="1.35"
        />
      )}
    </svg>
  );
}

function SkillButton({
  label,
  icon,
  active,
  cooldown,
  disabled,
  meta,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  cooldown: boolean;
  disabled: boolean;
  meta?: string;
  onClick: () => void;
}) {
  const accessibleLabel = meta ? `${label}: ${meta}` : label;

  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`gameplayPowerupButton${active ? " is-active" : ""}${
        cooldown ? " is-cooldown" : ""
      }`}
    >
      <span className="gameplayPowerupIcon" aria-hidden="true">
        {icon}
      </span>
      {meta && <span className="gameplayPowerupMeta">{meta}</span>}
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
  const layoutFrameRef = useRef(0);
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
    syncRuntime();
  }, [syncRuntime]);

  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    resetRunState();
    engineRef.current.startGame();
    syncRuntime();
  }, [resetRunState, syncRuntime]);

  const syncEngineLayout = useCallback(() => {
    window.cancelAnimationFrame(layoutFrameRef.current);
    layoutFrameRef.current = window.requestAnimationFrame(() => {
      layoutFrameRef.current = 0;
      if (!canvasRef.current || !engineRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const rendererWidth = Math.max(1, Math.round(rect.width));
      const rendererHeight = Math.max(1, Math.round(rect.height));
      engineRef.current.resize(rendererWidth, rendererHeight);

      const hudRect = hudRef.current?.getBoundingClientRect();
      const scaleY = rendererHeight / Math.max(1, rect.height);
      const safeTopCss = hudRect
        ? Math.max(0, hudRect.bottom - rect.top + 10)
        : 0;
      const gameplayBottom = rendererHeight * WATERLINE_RATIO;

      engineRef.current.setGameplayBounds({
        left: 0,
        right: rendererWidth,
        top: Math.min(rendererHeight - 1, safeTopCss * scaleY),
        bottom: Math.max(1, Math.min(gameplayBottom, rendererHeight)),
      });
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

  const acceptRevive = useCallback(() => {
    reviveUsedRef.current = true;
    engineRef.current?.reviveRun({ restoreLives: 5, minOrderTimeMs: 6000 });
    engineRef.current?.setGameState("countdown");
    syncRuntime();
    setCountdown(3);
    setFlowScreen("reviveCountdown");
  }, [syncRuntime]);

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

    window.addEventListener("resize", syncEngineLayout);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncEngineLayout);
    }

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(layoutFrameRef.current);
      window.removeEventListener("resize", syncEngineLayout);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", syncEngineLayout);
      }
    };
  }, [gameState, syncEngineLayout]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      syncRuntime();
    }, 150);
    return () => window.clearInterval(interval);
  }, [syncRuntime]);

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
      syncRuntime();
    }
  }, [syncRuntime]);

  const handleSlowTime = useCallback(() => {
    if (engineRef.current?.activateSlowTime()) {
      syncRuntime();
    }
  }, [syncRuntime]);

  const handleTap = useCallback((event: React.PointerEvent) => {
    if (flowScreen !== "playing" || gameState !== "playing") return;
    engineRef.current?.handleTap(event.clientX, event.clientY);
  }, [flowScreen, gameState]);

  const orderTimeProgress = currentOrder
    ? Math.max(
        0,
        Math.min(
          100,
          (currentOrder.timeRemainingMs / Math.max(1, currentOrder.timeLimitMs)) * 100
        )
      )
    : 0;
  const orderTimeColor =
    orderTimeProgress <= 25
      ? "#ef4b37"
      : orderTimeProgress <= 50
      ? "#f2a62d"
      : "#82bd18";
  const remainingLives = Math.max(0, MAX_MISSES - misses);

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
            <div className="mx-auto grid w-full max-w-[980px] grid-cols-[0.76fr_1.65fr_1fr] gap-1.5 md:grid-cols-[164px_minmax(300px,1fr)_236px] md:gap-3">
              <section
                aria-label="Điểm số"
                className="relative flex min-h-[102px] flex-col items-center justify-center overflow-hidden rounded-[17px] border-2 border-[#e2b56d] px-1.5 py-2 text-center md:min-h-[132px] md:rounded-[22px] md:px-3"
                style={{
                  background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
                  boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
                }}
              >
                <span className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-white/75 md:rounded-[18px]" />
                <div className="relative text-[clamp(8px,2.5vw,14px)] font-black uppercase tracking-[0.06em] text-[#74481f]">
                  {GAME_STRINGS.SCORE_LABEL}
                </div>
                <div className="relative mt-1 text-[clamp(28px,8vw,48px)] font-black leading-[0.9] tracking-[-0.06em] text-[#7a481d] drop-shadow-[0_1px_0_#fff]">
                  {score}
                </div>
                <div className="relative mt-2 whitespace-nowrap text-[clamp(7px,2.1vw,12px)] font-extrabold text-[#b26e18]">
                  {GAME_STRINGS.BEST_LABEL}: {bestScore}
                </div>
              </section>

              <section
                aria-label="Mục tiêu hiện tại"
                className="relative min-h-[102px] overflow-hidden rounded-[17px] border-2 border-[#e2b56d] px-2 py-2 md:min-h-[132px] md:rounded-[22px] md:px-4 md:py-3"
                style={{
                  background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
                  boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
                }}
              >
                <span className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-white/75 md:rounded-[18px]" />
                {currentOrder ? (
                  <div className="relative flex h-full min-w-0 flex-col justify-center">
                    <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center md:h-[66px] md:w-[66px]">
                        <FruitAssetImage
                          src={currentOrder.target.texturePath}
                          alt={currentOrder.target.name}
                          className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(91,48,17,0.28)]"
                          fallback={
                            <span className="text-[28px] leading-none md:text-[42px]">
                              {currentOrder.target.emoji}
                            </span>
                          }
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[clamp(12px,3.8vw,22px)] font-black uppercase leading-none tracking-[-0.02em] text-[#70451f] drop-shadow-[0_1px_0_#fff]">
                          {currentOrder.target.name}
                        </span>
                        <span className="mt-1 block text-[clamp(16px,5vw,28px)] font-black leading-none text-[#b86f12]">
                          {currentOrder.collected}/{currentOrder.required}
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 md:mt-3 md:gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-[17px] w-[17px] shrink-0 text-[#805125] md:h-6 md:w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.3"
                      >
                        <circle cx="12" cy="13" r="8.5" />
                        <path d="M9 2h6M12 4.5V7M12 13l3-2" />
                      </svg>
                      <div className="h-[9px] min-w-0 flex-1 overflow-hidden rounded-full border border-[#d6b27b] bg-[#e7d5b5] p-[1px] shadow-inner md:h-[13px]">
                        <div
                          className="h-full rounded-full transition-[width,background-color] duration-150"
                          style={{
                            width: `${orderTimeProgress}%`,
                            background: `linear-gradient(180deg, ${orderTimeColor}, color-mix(in srgb, ${orderTimeColor} 78%, #5f7e12))`,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)",
                          }}
                        />
                      </div>
                      <span className="min-w-[24px] text-right text-[clamp(10px,2.8vw,16px)] font-black text-[#70451f]">
                        {formatSeconds(currentOrder.timeRemainingMs)}s
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-full min-h-[82px] flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#a36b2c]">
                      Mục tiêu
                    </span>
                    <span className="mt-1 text-[clamp(12px,3vw,18px)] font-extrabold text-[#70451f]">
                      Đơn mới đang tới
                    </span>
                  </div>
                )}
              </section>

              <section
                aria-label="Combo và số lượt còn lại"
                className="pointer-events-auto relative min-h-[102px] overflow-hidden rounded-[17px] border-2 border-[#e2b56d] px-2 py-2 md:min-h-[132px] md:rounded-[22px] md:px-4 md:py-3"
                style={{
                  zIndex: "var(--z-hud-controls)",
                  background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
                  boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
                }}
              >
                <span className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-white/75 md:rounded-[18px]" />
                <div className="relative text-[clamp(8px,2.4vw,14px)] font-black uppercase tracking-[0.04em] text-[#74481f]">
                  {GAME_STRINGS.COMBO_LABEL}
                </div>
                <div className="relative mt-1 text-[clamp(21px,6vw,36px)] font-black leading-none tracking-[-0.04em] text-[#bd7311] drop-shadow-[0_1px_0_#fff]">
                  x{combo}
                </div>
                <div className="relative mt-2 flex items-end justify-between gap-1 md:mt-3 md:gap-2">
                  <div className="flex min-w-0 -space-x-0.5" aria-label={`${remainingLives} trên ${MAX_MISSES} lượt còn lại`}>
                    {Array.from({ length: MAX_MISSES }).map((_, index) => (
                      <HudHeart key={index} active={index < remainingLives} />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleMenuClick}
                    aria-label="Tạm dừng"
                    className="grid h-[31px] w-[31px] shrink-0 place-items-center rounded-[10px] border-2 border-[#e2b56d] bg-[#fff8e7] text-[#7a481d] shadow-[0_3px_0_#b87931,inset_0_2px_0_#fff] transition hover:bg-white active:translate-y-[2px] active:shadow-[0_1px_0_#b87931] md:h-11 md:w-11 md:rounded-[13px]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-[17px] w-[17px] md:h-6 md:w-6"
                      fill="currentColor"
                    >
                      <rect x="5" y="3" width="5" height="18" rx="2" />
                      <rect x="14" y="3" width="5" height="18" rx="2" />
                    </svg>
                  </button>
                </div>
              </section>
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
            className="gameplayPowerups"
            style={{ zIndex: "var(--z-hud-controls)" }}
          >
            <SkillButton
              label={GAME_STRINGS.SHIELD_LABEL}
              icon="🛡️"
              active={runtime.shield.active}
              cooldown={runtime.shield.cooldownRemainingMs > 0}
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
              cooldown={runtime.slowTime.cooldownRemainingMs > 0}
              disabled={!runtime.slowTime.available}
              meta={
                runtime.slowTime.active
                  ? `${formatSeconds(runtime.slowTime.remainingMs)}s`
                  : runtime.slowTime.cooldownRemainingMs > 0
                  ? `${formatSeconds(runtime.slowTime.cooldownRemainingMs)}s`
                  : undefined
              }
              onClick={handleSlowTime}
            />
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
            isNewBest={finalizedRun.isNewBest}
            isDoubled={finalizedRun.multiplier === 2}
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
