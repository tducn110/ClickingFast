import { useEffect, useRef, useState, useCallback } from "react";
import { CREATURES } from "./game/constants";
import { OceanGameEngine, type GameState } from "./game/OceanGameEngine";

export function OceanGame({ onBackToMenu }: { onBackToMenu?: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OceanGameEngine | null>(null);

  // React UI state (only what the overlay needs)
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("deepTapBest") ?? 0));
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [countdown, setCountdown] = useState(0);

  // Start / Restart
  const startGame = useCallback(() => {
    if (engineRef.current) {
      setNewBest(false);
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

  const handleConfirmExit = useCallback((exit: boolean) => {
    if (exit) {
      if (onBackToMenu) onBackToMenu();
    } else {
      setCountdown(3);
      if (engineRef.current) engineRef.current.setGameState("countdown");
    }
  }, [onBackToMenu]);

  useEffect(() => {
    if (gameState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "countdown" && countdown === 0) {
      if (engineRef.current) engineRef.current.setGameState("playing");
    }
  }, [gameState, countdown]);

  // Handle Game Over locally to update best score
  useEffect(() => {
    if (gameState === "dead") {
      setBestScore(prev => {
        const nb = score > prev;
        setNewBest(nb);
        const next2 = nb ? score : prev;
        localStorage.setItem("deepTapBest", String(next2));
        return next2;
      });
    }
  }, [gameState, score]);

  // Engine Setup & Cleanup
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new OceanGameEngine(canvasRef.current, {
      onScoreChange: setScore,
      onComboChange: setCombo,
      onMissesChange: setMisses,
      onGameStateChange: setGameState,
    });
    
    engineRef.current = engine;
    engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Canvas tap
  const handleTap = useCallback((e: React.PointerEvent) => {
    if (engineRef.current) {
      engineRef.current.handleTap(e.clientX, e.clientY);
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-background text-foreground font-sans select-none">
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
      {gameState === "playing" && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="bg-card border border-border shadow-md rounded-[16px] px-3 sm:px-4 py-1.5 sm:py-2 flex gap-2 sm:gap-4 items-center">
            <div>
              <div className="text-muted-foreground font-medium uppercase" style={{ fontSize: "10px", letterSpacing: ".1em" }}>Score</div>
              <div className="text-foreground font-display font-bold text-xl sm:text-2xl leading-none mt-0.5">{score}</div>
            </div>
            {bestScore > 0 && (
              <div className="border-l border-border pl-2 sm:pl-3">
                <div className="text-muted-foreground font-medium uppercase" style={{ fontSize: "10px", letterSpacing: ".1em" }}>Best</div>
                <div className="text-primary font-display font-bold text-base sm:text-lg leading-none mt-0.5">{bestScore}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Combo badge — top center */}
      {gameState === "playing" && combo >= 2 && (
        <div key={combo} className="combo-badge absolute top-3 pointer-events-none"
          style={{ left: "50%", transform: "translateX(-50%)" }}>
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2">
            <div className="text-foreground font-display font-bold" style={{ fontSize: "14px" }}>x{combo} COMBO</div>
          </div>
        </div>
      )}

      {/* Loading screen */}
      {gameState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-50 pointer-events-none">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          <div className="mt-5 text-foreground font-display font-bold" style={{ fontSize: "20px", letterSpacing: ".05em" }}>
            Loading Ocean...
          </div>
        </div>
      )}

      {/* Idle screen */}
      {gameState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none z-10">
          <div className="text-center drop-shadow-lg">
            <div className="text-white font-display font-extrabold" style={{ fontSize: "40px", letterSpacing: ".05em" }}>
              Ocean Tap
            </div>
            <div className="text-white/90 mt-2 font-medium" style={{ fontSize: "16px" }}>
              Tap the sea creatures before they disappear.
            </div>
          </div>
          <div className="hidden sm:flex gap-2 flex-wrap justify-center px-8 max-w-sm">
            {CREATURES.map(c => (
              <div key={c.name} className="bg-muted border border-border rounded-[12px] px-3 py-1 text-center">
                <div className="text-foreground font-medium" style={{ fontSize: "13px" }}>{c.name}</div>
                <div className="text-secondary font-bold" style={{ fontSize: "12px" }}>+{c.points}</div>
              </div>
            ))}
          </div>
          <button
            className="pointer-events-auto cursor-pointer rounded-full px-10 py-4 font-bold tracking-wider text-primary-foreground bg-primary transition-colors duration-200 hover:bg-[#D6B847] z-50 relative"
            style={{ fontSize: "16px", touchAction: "manipulation" }}
            onClick={startGame}
          >
            START FISHING
          </button>
        </div>
      )}

      {/* Game over screen */}
      {gameState === "dead" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="text-foreground font-display font-bold" style={{ fontSize: "32px" }}>GAME OVER</div>
          <div className="bg-card border border-border rounded-[16px] px-8 py-6 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)]">
            <div className="text-muted-foreground font-medium" style={{ fontSize: "13px" }}>FINAL SCORE</div>
            <div className="text-primary font-display font-extrabold mt-1" style={{ fontSize: "48px", lineHeight: "1" }}>{score}</div>
            {newBest
              ? <div className="text-secondary font-bold mt-2" style={{ fontSize: "14px" }}>NEW BEST!</div>
              : bestScore > 0 && <div className="text-muted-foreground mt-2" style={{ fontSize: "13px" }}>best: {bestScore}</div>
            }
          </div>
          <button
            className="pointer-events-auto cursor-pointer rounded-full px-8 py-3 font-bold text-primary-foreground bg-primary transition-colors duration-200 hover:bg-[#D6B847] mt-2 z-50 relative"
            style={{ fontSize: "15px", touchAction: "manipulation" }}
            onClick={startGame}
          >
            PLAY AGAIN
          </button>
        </div>
      )}


      {/* Menu Button (bottom left) */}
      {(gameState === "playing" || gameState === "countdown" || gameState === "paused" || gameState === "dead") && (
        <button
          onClick={handleMenuClick}
          className="absolute bottom-4 left-4 z-50 bg-card/95 border border-border rounded-full px-5 py-2 font-semibold text-foreground hover:bg-card transition-colors duration-200 shadow-md cursor-pointer pointer-events-auto"
          style={{ fontSize: "14px", touchAction: "manipulation" }}
        >
          ← Menu
        </button>
      )}

      {/* Pause / Confirm Exit dialog */}
      {gameState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/50 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-[16px] p-8 text-center shadow-lg max-w-sm w-full">
            <h2 className="text-foreground font-display font-bold text-2xl mb-2">Pause</h2>
            <p className="text-muted-foreground mb-6">Are you sure you want to quit to menu?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleConfirmExit(true)}
                className="bg-secondary hover:bg-[#B3605A] text-secondary-foreground px-6 py-2 rounded-full font-bold transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleConfirmExit(false)}
                className="bg-primary hover:bg-[#D6B847] text-primary-foreground px-6 py-2 rounded-full font-bold transition-colors"
              >
                No, Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {gameState === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px] z-50 pointer-events-none">
          <div className="text-primary font-display font-extrabold animate-bounce" style={{ fontSize: "120px" }}>
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}
