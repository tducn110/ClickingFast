import { useEffect, useRef, useState, useCallback } from "react";
import { CREATURES } from "./game/constants";
import { HarvestGameEngine, type GameState } from "./game/HarvestGameEngine";
import { useSettings } from "../lib/SettingsContext";
import { GameButton } from "./GameButton";
import { AudioManager } from "../lib/audioManager";
import {
  LOCAL_STORAGE_KEYS,
  GAME_STRINGS,
} from "../lib/constants";
import { useLocalLeaderboard } from "../hooks/useLocalLeaderboard";
import { LeaderboardTable } from "./LeaderboardTable";

export function HarvestGame({ onBackToMenu }: { onBackToMenu?: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HarvestGameEngine | null>(null);
  const { difficulty } = useSettings();

  // React UI state (only what the overlay needs)
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => Number(localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0)
  );
  const [combo, setCombo] = useState(0);
  const [ordersCompleted, setOrdersCompleted] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [countdown, setCountdown] = useState(0);

  // Continue & Leaderboard states
  const { entries, addScore } = useLocalLeaderboard();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("playerName") || "");
  const [scoreSaved, setScoreSaved] = useState(false);
  const [showContinueOffer, setShowContinueOffer] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    highestCombo: 0,
    highestPerfect: 0,
    totalHarvested: 0,
  });

  // Start / Restart
  const startGame = useCallback(() => {
    if (engineRef.current) {
      setNewBest(false);
      setScoreSaved(false);
      setShowContinueOffer(false);
      engineRef.current.startGame();
    }
  }, []);

  const handleMenuClick = useCallback(() => {
    if (gameState === "playing" || gameState === "countdown") {
      if (engineRef.current) engineRef.current.setGameState("paused");
    } else if (gameState === "idle" || gameState === "dead") {
      if (onBackToMenu) onBackToMenu();
    }
  }, [gameState, onBackToMenu]);

  const handleConfirmExit = useCallback(
    (exit: boolean) => {
      if (exit) {
        if (onBackToMenu) onBackToMenu();
      } else {
        setCountdown(3);
        if (engineRef.current) engineRef.current.setGameState("countdown");
      }
    },
    [onBackToMenu]
  );

  useEffect(() => {
    if (gameState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "countdown" && countdown === 0) {
      if (engineRef.current) engineRef.current.setGameState("playing");
    }
  }, [gameState, countdown]);

  const handleContinue = useCallback(() => {
    if (engineRef.current) {
      setShowContinueOffer(false);
      engineRef.current.continueGame();
    }
  }, []);

  const handleDeclineContinue = useCallback(() => {
    setShowContinueOffer(false);
    setBestScore((prev) => {
      const isNew = score > prev;
      setNewBest(isNew);
      const next = isNew ? score : prev;
      localStorage.setItem(LOCAL_STORAGE_KEYS.BEST_SCORE, String(next));
      return next;
    });
  }, [score]);

  useEffect(() => {
    if (gameState === "dead") {
      if (engineRef.current) {
        setStats({
          highestCombo: engineRef.current.highestCombo,
          highestPerfect: engineRef.current.highestPerfect,
          totalHarvested: engineRef.current.totalHarvested,
        });
      }

      if (!engineRef.current?.hasContinued) {
        setShowContinueOffer(true);
      } else {
        setShowContinueOffer(false);
        setBestScore((prev) => {
          const isNew = score > prev;
          setNewBest(isNew);
          const next = isNew ? score : prev;
          localStorage.setItem(LOCAL_STORAGE_KEYS.BEST_SCORE, String(next));
          return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const handleSaveScore = () => {
    if (!playerName.trim()) return;
    addScore(playerName, score);
    localStorage.setItem("playerName", playerName);
    setScoreSaved(true);
  };

  // Engine Setup & Cleanup
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new HarvestGameEngine(canvasRef.current, {
      onScoreChange: setScore,
      onComboChange: setCombo,
      onOrdersCompletedChange: setOrdersCompleted,
      onMissesChange: () => {},
      onGameStateChange: setGameState,
      onReady: () => {
        if (engine.gameState === "loading") {
          engine.setGameState("idle");
        }
      },
    });
    engine.setDifficulty(difficulty);
    engineRef.current = engine;
    engine.init();

    const updateSize = () => {
      if (canvasRef.current && engineRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        engineRef.current.resize(
          Math.max(1, Math.round(rect.width)),
          Math.max(1, Math.round(rect.height))
        );
      }
    };

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(canvasRef.current);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateSize);
    }

    return () => {
      observer.disconnect();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateSize);
      }
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDifficulty(difficulty);
    }
  }, [difficulty]);

  const handleTap = useCallback((e: React.PointerEvent) => {
    if (engineRef.current) {
      engineRef.current.handleTap(e.clientX, e.clientY);
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#DCECF0] text-foreground font-sans select-none flex justify-center">
      <div className="relative w-full h-full shadow-[0_0_40px_rgba(0,0,0,0.05)] bg-[#FFFFFF]">
      <style>{`
        @keyframes comboIn{0%{transform:translateX(-50%) scale(.6);opacity:0}60%{transform:translateX(-50%) scale(1.15);opacity:1}100%{transform:translateX(-50%) scale(1);opacity:1}}
        .combo-badge{animation:comboIn .3s ease-out forwards;}
      `}</style>

      {/* PixiJS canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0"
        style={{ cursor: "crosshair", touchAction: "none" }}
        onPointerDown={handleTap}
      />

      {/* Score HUD — top left */}
      {(gameState === "playing" || gameState === "dead") && (
        <div className="absolute top-3 left-3 pointer-events-none z-30">
          <div className="bg-card border border-border rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 flex gap-2 sm:gap-4 items-center shadow-md">
            <div>
              <div
                className="text-muted-foreground font-medium uppercase"
                style={{ fontSize: "10px", letterSpacing: ".1em" }}
              >
                {GAME_STRINGS.SCORE_LABEL}
              </div>
              <div className="text-foreground font-display font-bold text-xl sm:text-2xl leading-none mt-0.5">
                {score}
              </div>
            </div>
            <div className="border-l border-border pl-2 sm:pl-3">
              <div
                className="text-muted-foreground font-medium uppercase"
                style={{ fontSize: "10px", letterSpacing: ".1em" }}
              >
                ĐƠN ĐÃ XONG
              </div>
              <div className="text-primary font-display font-bold text-base sm:text-lg leading-none mt-0.5">
                {ordersCompleted}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combo badge — top center */}
      {gameState === "playing" && combo >= 2 && (
        <div
          key={combo}
          className="combo-badge absolute top-3 pointer-events-none z-30"
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2 backdrop-blur-md">
            <div
              className="text-foreground font-display font-bold"
              style={{ fontSize: "14px" }}
            >
              x{combo} {GAME_STRINGS.COMBO_LABEL} {combo >= 10 ? " — Bội Thu!" : ""}
            </div>
          </div>
        </div>
      )}

      {/* Loading screen */}
      {gameState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none bg-[#DCECF0]/90">
          <div className="w-10 h-10 border-[3px] border-[#DCECF0] border-t-[#EED05E] rounded-full animate-spin" />
          <div className="mt-4 text-[#4A4D4E] font-extrabold text-[18px]">{GAME_STRINGS.LOADING}</div>
        </div>
      )}

      {/* Idle screen */}
      {gameState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-[#DCECF0]/70 backdrop-blur-sm">
          <div className="bg-[#DCECF0] rounded-[24px] p-8 max-w-lg w-full mx-4 flex flex-col items-center gap-5 shadow-[0_6px_28px_rgba(74,77,78,0.1)] border border-[rgba(74,77,78,0.1)]">
            <div className="text-center">
              <div className="text-[#4A4D4E] font-extrabold" style={{ fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.15, textShadow: "0 2px 0 rgba(255,255,255,0.6)" }}>Falling Harvest</div>
              <div className="text-[#7A7D7E] mt-2 font-medium text-[15px]">Thu hoạch theo đơn hàng - Chờ đúng độ chín để Perfect!</div>
            </div>
            <div className="hidden sm:flex gap-2 flex-wrap justify-center">
              {CREATURES.map((c) => (
                <div key={c.name} className="bg-white/80 rounded-xl px-3 py-1.5 text-center border border-[rgba(138,125,101,0.15)] flex flex-col items-center">
                  <div className="text-2xl mb-1">{c.emoji}</div>
                  <div className="text-[#4A4D4E] font-semibold text-[13px]">{c.name}</div>
                  {c.type === "good" ? (
                    <div className="text-[#EED05E] font-extrabold text-[11px]">+{c.points}</div>
                  ) : (
                    <div className="text-[#CC7069] font-extrabold text-[11px]">-1 Tim</div>
                  )}
                </div>
              ))}
            </div>
            <GameButton
              variant="primary"
              size="lg"
              fullWidth
              className="pointer-events-auto"
              onClick={startGame}
            >
              Thu Hoạch Ngay!
            </GameButton>
          </div>
        </div>
      )}

      {/* Continue Offer Screen */}
      {gameState === "dead" && showContinueOffer && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none p-4 bg-[#000000]/60 backdrop-blur-md z-40">
          <div className="bg-[#DCECF0] rounded-[20px] px-8 py-6 text-center max-w-sm w-full shadow-[0_6px_24px_rgba(74,77,78,0.08)] border border-[rgba(74,77,78,0.1)] pointer-events-auto">
            <h3 className="text-[#4A4D4E] font-extrabold text-[22px] mb-2">Chưa kết thúc đâu!</h3>
            <p className="text-[#7A7D7E] text-[15px] mb-4">Bạn có muốn chơi tiếp không?<br/>Điểm sẽ được <b>NHÂN ĐÔI (x2)</b>!</p>
            <div className="flex flex-col gap-3">
              <GameButton variant="primary" size="md" onClick={handleContinue}>Chơi tiếp (x2 điểm)</GameButton>
              <GameButton variant="secondary" size="md" onClick={handleDeclineContinue}>Không, kết thúc</GameButton>
            </div>
          </div>
        </div>
      )}

      {/* Final Game Over screen */}
      {gameState === "dead" && !showContinueOffer && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none p-4 bg-[#000000]/60 backdrop-blur-md z-40 overflow-y-auto">
          <div className="text-[#ff5555] font-extrabold text-[40px] drop-shadow-md mt-10">GAME OVER</div>
          <div className="bg-[#DCECF0] rounded-[20px] px-8 py-6 text-center max-w-sm w-full shadow-[0_6px_24px_rgba(74,77,78,0.08)] border border-[rgba(74,77,78,0.1)] pointer-events-auto flex flex-col gap-4">
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                <div className="text-[11px] text-gray-500 font-bold">TỔNG ĐIỂM</div>
                <div className="text-[#EED05E] font-extrabold text-[28px] leading-none">{score}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                <div className="text-[11px] text-gray-500 font-bold">SỐ ĐƠN XONG</div>
                <div className="text-[#4A4D4E] font-extrabold text-[28px] leading-none">{ordersCompleted}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                <div className="text-[11px] text-gray-500 font-bold">PERFECT CAO NHẤT</div>
                <div className="text-[#4A4D4E] font-extrabold text-[20px] leading-none">{stats.highestPerfect}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                <div className="text-[11px] text-gray-500 font-bold">COMBO CAO NHẤT</div>
                <div className="text-[#4A4D4E] font-extrabold text-[20px] leading-none">{stats.highestCombo}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-black/5 col-span-2">
                <div className="text-[11px] text-gray-500 font-bold">TỔNG THU HOẠCH</div>
                <div className="text-[#4A4D4E] font-extrabold text-[20px] leading-none">{stats.totalHarvested} nông sản</div>
              </div>
            </div>

            {newBest ? <div className="text-[#CC7069] font-bold text-[14px] mt-2">{GAME_STRINGS.NEW_BEST}</div>
              : bestScore > 0 && <div className="text-[#7A7D7E] text-[13px] mt-2">kỷ lục điểm: {bestScore}</div>}

            {!scoreSaved ? (
              <div className="mt-4 flex flex-col gap-2">
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Nhập tên của bạn để lưu điểm"
                  className="px-3 py-2 border border-[#B0B3B4] rounded-md bg-white text-sm outline-none focus:border-[#EED05E] text-center"
                />
                <GameButton variant="primary" size="sm" onClick={handleSaveScore}>Lưu điểm</GameButton>
              </div>
            ) : (
              <div className="mt-4 border-t border-[#B0B3B4]/30 pt-4">
                <div className="text-[#CC7069] font-bold text-[14px] mb-2">Bảng Xếp Hạng</div>
                <LeaderboardTable data={entries} />
              </div>
            )}
          </div>
          <GameButton variant="primary" size="md" className="pointer-events-auto mt-2 z-50 relative mb-10" onClick={startGame}>{GAME_STRINGS.PLAY_AGAIN}</GameButton>
        </div>
      )}

      {/* Menu button */}
      {(gameState === "playing" || gameState === "countdown" || gameState === "paused" || gameState === "dead") && (
        <GameButton variant="ghost" size="sm" onClick={handleMenuClick} className="absolute bottom-4 left-4 z-50 pointer-events-auto bg-[#DCECF0]/95">{GAME_STRINGS.BACK_TO_MENU}</GameButton>
      )}

      {/* Pause */}
      {gameState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-50 bg-[rgba(74,77,78,0.35)] backdrop-blur-sm pointer-events-auto">
          <div className="bg-[#DCECF0] rounded-[20px] p-8 text-center max-w-sm w-full mx-4 shadow-[0_12px_36px_rgba(74,77,78,0.15)] border border-[rgba(74,77,78,0.1)]">
            <h2 className="text-[#4A4D4E] font-extrabold text-[36px] mb-2">{GAME_STRINGS.PAUSE_TITLE}</h2>
            <p className="text-[#7A7D7E] mb-6 text-[15px]">{GAME_STRINGS.PAUSE_MESSAGE}</p>
            <div className="flex justify-center gap-4">
              <GameButton variant="secondary" size="md" onClick={() => handleConfirmExit(true)}>{GAME_STRINGS.YES}</GameButton>
              <GameButton variant="primary" size="md" onClick={() => handleConfirmExit(false)}>{GAME_STRINGS.NO_RESUME}</GameButton>
            </div>
          </div>
        </div>
      )}

      {/* Countdown */}
      {gameState === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-[#DCECF0]/50 backdrop-blur-[2px]">
          <div className="text-[#EED05E] font-extrabold animate-bounce" style={{ fontSize: "120px", textShadow: "0 4px 0 rgba(238,208,94,0.3)" }}>{countdown}</div>
        </div>
      )}
      </div>
    </div>
  );
}
