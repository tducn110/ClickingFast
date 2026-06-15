import { useEffect, useRef, useState, useCallback } from "react";
import { CREATURES } from "./game/constants";
import { OceanGameEngine, type GameState } from "./game/OceanGameEngine";
import { useAuth, loginWithGoogle, logout } from "../../lib/firebase/auth";
import { saveUserScore, getLeaderboard, type ScoreRecord } from "../../lib/firebase/db";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useSettings } from "../lib/SettingsContext";

export function OceanGame({ onBackToMenu }: { onBackToMenu?: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OceanGameEngine | null>(null);
  const { difficulty } = useSettings();

  // React UI state (only what the overlay needs)
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("deepTapBest") ?? 0));
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [countdown, setCountdown] = useState(0);

  const { user, loading: authLoading } = useAuth();
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);

  // Initial Auth check
  useEffect(() => {
    if (!authLoading) {
      if (gameState === "loading") {
        setGameState("login");
      }
    }
  }, [authLoading, gameState]);

  useEffect(() => {
    if (gameState === "idle") {
      if (user) {
        getLeaderboard(5).then(setLeaderboard);
      } else {
        setLeaderboard([]);
      }
    }
  }, [gameState, user]);

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
      const playtime = Math.floor((engineRef.current?.gameTime || 0) / 1000);
      setBestScore(prev => {
        const nb = score > prev;
        setNewBest(nb);
        const next2 = nb ? score : prev;
        localStorage.setItem("deepTapBest", String(next2));
        return next2;
      });
      if (user && score > 0) {
        saveUserScore(user.uid, user.displayName || "Unknown", score, playtime)
          .then(() => getLeaderboard(5).then(setLeaderboard))
          .catch(console.error);
      } else if (user) {
        getLeaderboard(5).then(setLeaderboard);
      } else {
        setLeaderboard([]);
      }
    }
  }, [gameState, score, user]);

  // Engine Setup & Cleanup
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new OceanGameEngine(canvasRef.current, {
      onScoreChange: setScore,
      onComboChange: setCombo,
      onMissesChange: setMisses,
      onGameStateChange: setGameState,
      onReady: () => {},
    });
    engine.setDifficulty(difficulty);
    
    engineRef.current = engine;
    engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update engine if difficulty changes while mounted (though typically it doesn't since settings are in another screen)
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDifficulty(difficulty);
    }
  }, [difficulty]);

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
      {(gameState === "playing" || gameState === "dead") && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="bg-card border border-border rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 flex gap-2 sm:gap-4 items-center">
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

      {/* Login Dedicated Screen */}
      {gameState === "login" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-50 pointer-events-auto">
          <div className="bg-card border border-border rounded-3xl p-10 max-w-md w-full mx-4 flex flex-col items-center text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🌊</span>
            </div>
            <h1 className="text-foreground font-display font-extrabold text-[36px] leading-tight mb-3">
              Ocean Tap
            </h1>
            <p className="text-muted-foreground text-[15px] mb-8">
              Đăng nhập để lưu điểm số của bạn lên Bảng Xếp Hạng toàn cầu và thi tài cùng mọi người!
            </p>
            
            <div className="flex flex-col gap-4 w-full">
              <Button 
                size="lg" 
                className="w-full text-[15px] font-bold py-6 rounded-full"
                onClick={() => {
                  if (user) {
                    setGameState("idle");
                  } else {
                    loginWithGoogle()
                      .then(() => setGameState("idle"))
                      .catch(console.error);
                  }
                }}
              >
                {user ? `Tiếp tục dưới tên ${user.displayName?.split(" ")[0] || "Bạn"}` : "Đăng nhập bằng Google"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-[14px] text-muted-foreground hover:text-foreground hover:bg-transparent"
                onClick={() => {
                  if (user) {
                    logout().catch(console.error);
                  }
                  setGameState("idle");
                }}
              >
                Chơi ngay không cần lưu điểm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Idle screen */}
      {gameState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm pointer-events-none z-10">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-lg w-full mx-4 flex flex-col items-center gap-6 shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)]">
            <div className="text-center">
              <div className="text-foreground font-display font-extrabold" style={{ fontSize: "40px", letterSpacing: ".05em", lineHeight: "1.2" }}>
                Ocean Tap
              </div>
              <div className="text-muted-foreground mt-2 font-medium" style={{ fontSize: "16px" }}>
                Tap the sea creatures before they disappear.
              </div>
            </div>
            
            <div className="hidden sm:flex gap-2 flex-wrap justify-center">
              {CREATURES.map(c => (
                <div key={c.name} className="bg-background border border-border rounded-xl px-3 py-1.5 text-center shadow-sm">
                  <div className="text-foreground font-medium" style={{ fontSize: "13px" }}>{c.name}</div>
                  <div className="text-primary font-bold" style={{ fontSize: "12px" }}>+{c.points}</div>
                </div>
              ))}
            </div>

            {/* Auth Section for Idle Screen */}
            <div className="absolute top-4 right-4 pointer-events-auto">
              {user ? (
                <div className="flex items-center gap-3 bg-card/80 backdrop-blur border border-border rounded-full px-2 py-1.5 shadow-sm">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                    <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col pr-3">
                    <span className="text-[12px] font-bold text-foreground leading-none">{user.displayName}</span>
                    <button 
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors text-left mt-0.5"
                      onClick={() => logout().catch(console.error)}
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="rounded-full shadow-sm text-[12px]"
                  onClick={() => loginWithGoogle().catch(console.error)}
                >
                  Đăng nhập
                </Button>
              )}
            </div>

            {/* Leaderboard Section */}
            {user && leaderboard.length > 0 && (
              <div className="w-full mt-2 pointer-events-auto bg-card border border-border rounded-xl p-4">
                <div className="text-center font-bold text-foreground mb-3 uppercase tracking-wider text-[12px]">Bảng Xếp Hạng</div>
                <div className="flex flex-col gap-2">
                  {leaderboard.map((record, i) => (
                    <div key={i} className="flex justify-between items-center text-[14px]">
                      <span className="font-medium text-muted-foreground">{i + 1}. {record.displayName}</span>
                      <div className="text-right">
                        <span className="font-bold text-primary">{record.score}</span>
                        {record.playtime !== undefined && <span className="text-[10px] text-muted-foreground ml-2">({record.playtime}s)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              className="pointer-events-auto cursor-pointer rounded-full px-10 py-3.5 font-bold tracking-wider text-primary-foreground bg-primary transition-colors duration-200 hover:bg-[#D6B847] w-full sm:w-auto"
              style={{ fontSize: "15px", lineHeight: "1", touchAction: "manipulation" }}
              onClick={startGame}
            >
              START FISHING
            </button>
          </div>
        </div>
      )}

      {/* Game over screen */}
      {gameState === "dead" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm pointer-events-none p-4">
          <div className="text-foreground font-display font-bold text-[32px] leading-[1.2]">GAME OVER</div>

          {/* Leaderboard for Authenticated Users */}
          {user && leaderboard.length > 0 && (
            <div className="w-full max-w-sm pointer-events-auto bg-card border border-border rounded-2xl p-4 shadow-lg">
              <div className="text-center font-bold text-foreground mb-3 uppercase tracking-wider text-[12px]">Bảng Xếp Hạng (Mới cập nhật)</div>
              <div className="flex flex-col gap-2">
                {leaderboard.map((record, i) => (
                  <div key={i} className="flex justify-between items-center text-[14px]">
                    <span className="font-medium text-muted-foreground">{i + 1}. {record.displayName}</span>
                    <div className="text-right">
                      <span className="font-bold text-primary">{record.score}</span>
                      {record.playtime !== undefined && <span className="text-[10px] text-muted-foreground ml-2">({record.playtime}s)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl px-8 py-6 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)] max-w-sm w-full">
            <div className="text-muted-foreground font-medium" style={{ fontSize: "13px" }}>FINAL SCORE</div>
            <div className="text-primary font-display font-extrabold mt-1" style={{ fontSize: "48px", lineHeight: "1" }}>{score}</div>
            {newBest
              ? <div className="text-secondary font-bold mt-2" style={{ fontSize: "14px" }}>NEW BEST!</div>
              : bestScore > 0 && <div className="text-muted-foreground mt-2" style={{ fontSize: "13px" }}>best: {bestScore}</div>
            }
            <div className="text-muted-foreground mt-1" style={{ fontSize: "12px" }}>Thời gian: {Math.floor((engineRef.current?.gameTime || 0) / 1000)}s</div>
            
            {/* Prompt for Guest */}
            {!user && score > 0 && (
              <div className="mt-4 p-3 bg-secondary/10 border border-secondary/30 rounded-xl pointer-events-auto">
                <p className="text-[12px] text-foreground mb-2">
                  Điểm của bạn rất cao!<br/>Đăng nhập ngay để ghi danh lên Bảng xếp hạng.
                </p>
                <Button 
                  size="sm" 
                  className="w-full text-[12px]" 
                  onClick={() => loginWithGoogle().catch(console.error)}
                >
                  Đăng nhập với Google
                </Button>
              </div>
            )}
          </div>
          <button
            className="pointer-events-auto cursor-pointer rounded-full px-8 py-3 font-bold text-primary-foreground bg-primary transition-colors duration-200 hover:bg-[#D6B847] mt-2 z-50 relative"
            style={{ fontSize: "15px", lineHeight: "1", touchAction: "manipulation" }}
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
          className="absolute bottom-4 left-4 z-50 bg-card/95 border border-border rounded-full px-5 py-2 font-semibold text-foreground hover:bg-card transition-colors duration-200 cursor-pointer pointer-events-auto"
          style={{ fontSize: "15px", lineHeight: "1", touchAction: "manipulation" }}
        >
          ← Menu
        </button>
      )}

      {/* Pause / Confirm Exit dialog */}
      {gameState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/50 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)] max-w-sm w-full">
            <h2 className="text-foreground font-display font-bold text-[40px] leading-[1.2] mb-2">Pause</h2>
            <p className="text-muted-foreground mb-6" style={{ fontSize: "16px", lineHeight: "1.6" }}>Are you sure you want to quit to menu?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleConfirmExit(true)}
                className="bg-secondary hover:bg-[#B3605A] text-secondary-foreground px-6 py-2 rounded-full font-bold transition-colors"
                style={{ fontSize: "15px", lineHeight: "1" }}
              >
                Yes
              </button>
              <button
                onClick={() => handleConfirmExit(false)}
                className="bg-primary hover:bg-[#D6B847] text-primary-foreground px-6 py-2 rounded-full font-bold transition-colors"
                style={{ fontSize: "15px", lineHeight: "1" }}
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
