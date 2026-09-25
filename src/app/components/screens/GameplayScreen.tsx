import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  HarvestGameEngine,
  type GameState,
  type HudSnapshot,
  type GameplayViewportMetrics,
} from "../game/HarvestGameEngine";
import { AudioManager } from "../../lib/audioManager";
import { LOCAL_STORAGE_KEYS } from "../../lib/constants";
import { getStorageNumber, setStorageValue } from "../../lib/safeStorage";
import { PauseOverlay } from "../overlays/PauseOverlay";
import { CountdownOverlay } from "../overlays/ReviveCountdownOverlay";
import { GameOverScreen } from "./GameOverScreen";
import { ReviveScreen } from "./ReviveScreen";
import { ITEM_REGISTRY } from "../game/itemRegistry";
import { preloadCreatureTextures } from "../game/systems/CreatureSystem";
import { MAX_MISSES, WATERLINE_RATIO } from "../game/constants";
import type { HarvestedItemResult } from "./GameOverScreen";
import { type WinkIntegration } from "../../../integrations/wink/types";
import { showRewardedVideo } from "../../../integrations/ads/googleH5Ads";
import { useTranslation } from "react-i18next";
import { ModalPortal } from "../ui/ModalPortal";
import { GameplayHud } from "../hud/GameplayHud";

type FlowScreen =
  | "playing"
  | "countdown"
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
    targetPresenceRatio: 0,
    screenOccupancy: 0,
    hitCandidatesChecked: 0,
    swipeSegmentsProcessed: 0,
  },
};


export function GameplayScreen({
  onBackToMenu,
  wink,
  onScoreUpdate,
}: {
  onBackToMenu?: () => void;
  wink: WinkIntegration;
  onScoreUpdate?: (score: number) => void;
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
  const pendingScoreRef = useRef<{ score: number; playTimeSec: number } | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [flowScreen, setFlowScreen] = useState<FlowScreen>("playing");
  const [countdown, setCountdown] = useState(3);
  const [manualPaused, setManualPaused] = useState(false);
  const [resumeRequired, setResumeRequired] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const [engineRetryKey, setEngineRetryKey] = useState(0);

  const [finalizedRun, setFinalizedRun] = useState<FinalizedRun | null>(null);
  const [adPending, setAdPending] = useState(false);

  const isGameplayPaused = wink.hostPaused || manualPaused || resumeRequired;

  const { score, misses, currentOrder } = hud;
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
    pendingScoreRef.current = null;
    setFinalizedRun(null);
    setFlowScreen("playing");
    setCountdown(3);
    setManualPaused(false);
    setResumeRequired(false);
    syncHud();
  }, [syncHud]);

  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
    AudioManager.playBGM(AudioManager.GAME_BGM_VOLUME);
    resetRunState();
    setManualPaused(false);
    setResumeRequired(false);
    if (!roundStartedRef.current) {
      wink.gameplayStart();
      roundStartedRef.current = true;
    }
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

  const submitScoreSafely = useCallback((targetScore: number) => {
    if (!wink.canSubmitScore) return;
    const playTimeSec = engineRef.current
      ? Math.max(0, Math.floor(engineRef.current.gameTime / 1000))
      : 0;

    if (submitInFlightRef.current) {
      pendingScoreRef.current = { score: targetScore, playTimeSec };
      return;
    }

    submitInFlightRef.current = true;
    pendingScoreRef.current = null;

    wink.submitFinalScore({
      score: targetScore,
      playTimeSec,
    })
    .then(async (submission) => {
      if (!submission) return;
      const current = finalizedRunRef.current;
      if (current && current.finalScore === targetScore) {
        const isBest = submission.isNewBest || current.isNewBest;
        const updated = { ...current, isNewBest: isBest };
        finalizedRunRef.current = updated;
        setFinalizedRun(updated);
      }
      if (wink.canGetLeaderboard) {
        await wink.refreshLeaderboard({ force: true });
      } else {
        await wink.refreshPersonalBest({ force: true });
      }
    })
    .catch((error) => console.warn("Score submit failed:", error))
    .finally(() => {
      submitInFlightRef.current = false;
      const pending = pendingScoreRef.current;
      if (pending && pending.score > targetScore) {
        pendingScoreRef.current = null;
        submitScoreSafely(pending.score);
      }
    });
  }, [wink]);

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

      const currentStoredBest = getStorageNumber(LOCAL_STORAGE_KEYS.BEST_SCORE, 0);
      const currentRemoteBest = wink.personalBest?.score ?? 0;
      const previousBest = Math.max(currentStoredBest, currentRemoteBest);
      const isNewBest = finalScore > previousBest;

      if (finalScore > currentStoredBest) {
        setStorageValue(LOCAL_STORAGE_KEYS.BEST_SCORE, String(finalScore));
        onScoreUpdate?.(finalScore);
      }

      const result = {
        runScore,
        multiplier,
        finalScore,
        isNewBest,
      } satisfies FinalizedRun;

      hasFinalizedRunRef.current = true;
      finalizedRunRef.current = result;
      setFinalizedRun(result);

      // Stop semantic round immediately at the final boundary
      if (roundStartedRef.current) {
        roundStartedRef.current = false;
        wink.gameplayStop();
      }

      // Submit score with queue support (handles X2 even if X1 is in-flight)
      submitScoreSafely(finalScore);

      return result;
    },
    [onScoreUpdate, score, submitScoreSafely, wink.personalBest?.score]
  );

  const openFinalGameOver = useCallback(() => {
    finalizeRun(1);
    setFlowScreen("finalGameOver");
  }, [finalizeRun]);

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
    setFlowScreen("countdown");
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
          openFinalGameOver();
        } else {
          setFlowScreen("reviveOffer");
        }
      }
    },
    [openFinalGameOver]
  );

  const startGameRef = useRef(startGame);
  startGameRef.current = startGame;
  const handleGameStateChangeRef = useRef(handleGameStateChange);
  handleGameStateChangeRef.current = handleGameStateChange;

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new HarvestGameEngine(canvasRef.current, {
      onHudChange: setHud,
      onGameStateChange: (state) => handleGameStateChangeRef.current(state),
      onReady: () => {
        setEngineError(false);
        startGameRef.current();
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
  }, [engineRetryKey, syncEngineLayout]);

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

  const hasActiveRun = Boolean(
    roundStartedRef.current &&
    (flowScreen === "playing" || flowScreen === "countdown" || flowScreen === "reviveCountdown") &&
    gameState !== "dead"
  );

  const prevHostPausedRef = useRef(wink.hostPaused);

  // Focus loss (blur & visibility hidden): pause active run matching 01_fruit standard
  useEffect(() => {
    const handleLostFocus = () => {
      if (hasActiveRun) {
        setManualPaused(true);
        setResumeRequired(true);
        if (engineRef.current?.gameState === "playing" || engineRef.current?.gameState === "countdown") {
          engineRef.current.setGameState("paused");
        }
        AudioManager.pauseBGM();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        handleLostFocus();
      }
    };

    const handleBlur = () => {
      handleLostFocus();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [hasActiveRun]);

  // Wink SDK contract: when host pauses, pause gameplay; when host resumes, unpause with countdown
  useEffect(() => {
    const wasHostPaused = prevHostPausedRef.current;
    prevHostPausedRef.current = wink.hostPaused;

    if (wink.hostPaused) {
      setManualPaused(true);
      if (engineRef.current?.gameState === "playing" || engineRef.current?.gameState === "countdown") {
        engineRef.current.setGameState("paused");
      }
      AudioManager.pauseBGM();
    } else if (wasHostPaused && !wink.hostPaused) {
      setManualPaused(false);
      setResumeRequired(false);
      if (roundStartedRef.current && gameState !== "dead") {
        setCountdown(3);
        setFlowScreen("countdown");
        engineRef.current?.setGameState("countdown");
      }
    }
  }, [wink.hostPaused, gameState]);

  // Synchronize effective gameplay pause state to engine and audio matching 01_fruit
  useEffect(() => {
    if (isGameplayPaused) {
      if (engineRef.current?.gameState === "playing" || engineRef.current?.gameState === "countdown") {
        engineRef.current.setGameState("paused");
      }
      AudioManager.pauseBGM();
    } else if (hasActiveRun) {
      if (!document.hidden && engineRef.current?.gameState === "paused") {
        if (flowScreen === "playing") {
          engineRef.current.setGameState("playing");
          AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
          AudioManager.resumeBGM(AudioManager.GAME_BGM_VOLUME);
        } else if (flowScreen === "countdown" || flowScreen === "reviveCountdown") {
          engineRef.current.setGameState("countdown");
        }
      }
    }
  }, [isGameplayPaused, hasActiveRun, flowScreen]);

  useEffect(() => {
    if (flowScreen !== "countdown" && flowScreen !== "reviveCountdown") return;
    if (isGameplayPaused) return;

    if (countdown <= 0) {
      if (!isGameplayPaused) {
        engineRef.current?.setGameState("playing");
        AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
        AudioManager.resumeBGM(AudioManager.GAME_BGM_VOLUME);
        syncHud();
        setFlowScreen("playing");
      }
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, flowScreen, isGameplayPaused, syncHud]);

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
    if (
      (gameState === "playing" || gameState === "countdown") &&
      (flowScreen === "playing" || flowScreen === "countdown" || flowScreen === "reviveCountdown")
    ) {
      setManualPaused(true);
      return;
    }

    if (isGameplayPaused || flowScreen === "finalGameOver") {
      if (roundStartedRef.current) {
        finalizeRun(1);
      }
      AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
      AudioManager.resumeBGM(AudioManager.LANDING_BGM_VOLUME);
      onBackToMenu?.();
    }
  }, [finalizeRun, flowScreen, gameState, isGameplayPaused, onBackToMenu]);

  const handleConfirmExit = useCallback(
    (exit: boolean) => {
      if (exit) {
        if (roundStartedRef.current) {
          finalizeRun(1);
        }
        AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
        AudioManager.resumeBGM(AudioManager.LANDING_BGM_VOLUME);
        onBackToMenu?.();
        return;
      }
      setManualPaused(false);
      setResumeRequired(false);
      setCountdown(3);
      setFlowScreen("countdown");
      engineRef.current?.setGameState("countdown");
    },
    [finalizeRun, onBackToMenu]
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (flowScreen !== "playing" || gameState !== "playing" || isGameplayPaused) return;
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    engineRef.current?.handlePointerDown(event.clientX, event.clientY, event.pointerId);
  }, [flowScreen, gameState, isGameplayPaused]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (flowScreen !== "playing" || gameState !== "playing" || isGameplayPaused || !event.isPrimary) return;
    engineRef.current?.handlePointerMove(event.clientX, event.clientY);
  }, [flowScreen, gameState, isGameplayPaused]);

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
          <GameplayHud
            ref={hudRef}
            score={score}
            combo={hud.combo}
            comboWindow={hud.comboWindow}
            currentOrder={currentOrder}
            remainingLives={remainingLives}
            slowTime={hud.slowTime}
            onPauseClick={handleMenuClick}
          />
          {debugEnabled && (
            <pre className="pointer-events-none absolute left-2 top-2 z-[var(--z-debug)] max-w-[min(92vw,440px)] overflow-hidden rounded bg-black/70 p-2 text-[calc(10*var(--su))] leading-tight text-lime-200">
              {JSON.stringify({
                order: hud.currentOrder?.requirements,
                orderId: hud.metrics.orderId,
                orderPhase: hud.orderPhase,
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

        {!isGameplayPaused && (flowScreen === "countdown" || flowScreen === "reviveCountdown") && (
          <ModalPortal>
            <CountdownOverlay countdown={countdown} />
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
            onHome={() => handleConfirmExit(true)}
          />
          </ModalPortal>
        )}

        {isGameplayPaused &&
          (flowScreen === "playing" || flowScreen === "countdown" || flowScreen === "reviveCountdown") && (
          <ModalPortal>
            <PauseOverlay
              isHostPaused={wink.hostPaused}
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
