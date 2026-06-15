import { useEffect, useRef, useState, useCallback } from "react";
import { CREATURES } from "./game/constants";
import { OceanGameEngine, type GameState } from "./game/OceanGameEngine";
import { useAuth } from "../lib/AuthContext";
import { saveGameStateForRedirect, consumeRedirectGameState } from "../../lib/firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSettings } from "../lib/SettingsContext";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { useScoreSubmit, getNickname, saveNickname } from "../hooks/useScoreSubmit";
import { GameButton } from "./GameButton";
import { NicknameDialog } from "./NicknameDialog";
import { LeaderboardTable } from "./LeaderboardTable";
import { AudioManager } from "../lib/audioManager";
import {
  LOCAL_STORAGE_KEYS,
  LEADERBOARD_PREVIEW_LIMIT,
  LEADERBOARD_FULL_LIMIT,
  GAME_STRINGS,
} from "../lib/constants";

export function OceanGame({ onBackToMenu }: { onBackToMenu?: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OceanGameEngine | null>(null);
  const { difficulty } = useSettings();

  // React UI state (only what the overlay needs)
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => Number(localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0)
  );
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [countdown, setCountdown] = useState(0);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  // Pending score/playtime waiting for nickname
  const pendingScoreRef = useRef<{ score: number; playtime: number } | null>(null);

  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const { submit: submitScore, isLoading: savingScore } = useScoreSubmit();

  // Leaderboard: preview (5) for game over screen, full (10) for expand
  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    refresh: refreshLeaderboard,
  } = useLeaderboard(LEADERBOARD_FULL_LIMIT);

  // Initial Auth check
  useEffect(() => {
    if (!authLoading) {
      if (gameState === "loading") {
        setGameState("login");
      }
    }
  }, [authLoading, gameState]);

  // On mount: restore game state if returning from auth redirect
  useEffect(() => {
    if (!authLoading) {
      const restoredState = consumeRedirectGameState();
      if (restoredState === "idle") {
        setGameState("idle");
      } else if (restoredState === "dead") {
        // Restore score from sessionStorage so game-over screen shows it
        const savedScore = sessionStorage.getItem("auth_game_score");
        if (savedScore) {
          setScore(Number(savedScore));
          sessionStorage.removeItem("auth_game_score");
        }
        setGameState("dead");
      } else if (restoredState === "login" && user) {
        // Just returned from login redirect — user is now authenticated, skip to idle
        setGameState("idle");
      }
      // "login" without user → stay on login screen (user cancelled or error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // BGM control: play on menu/idle/dead, stop when actively playing
  useEffect(() => {
    AudioManager.init();
    const menuStates: GameState[] = ["login", "idle", "dead"];
    const activeStates: GameState[] = ["playing", "countdown", "paused"];
    if (menuStates.includes(gameState)) {
      AudioManager.playBGM();
    } else if (activeStates.includes(gameState)) {
      AudioManager.stopBGM();
    }
  }, [gameState]);

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

  // Handle Game Over: update best score + auto-save to Firebase
  const doSubmitScore = useCallback(
    async (finalScore: number, playtime: number) => {
      if (!user || finalScore <= 0) return;
      const nickname = getNickname();
      if (!nickname) {
        // Show nickname dialog first, then submit after
        pendingScoreRef.current = { score: finalScore, playtime };
        setShowNicknameDialog(true);
        return;
      }
      try {
        await submitScore(user.uid, finalScore, playtime);
        refreshLeaderboard();
      } catch {
        // silently fail — score saved locally as best
      }
    },
    [user, submitScore, refreshLeaderboard]
  );

  useEffect(() => {
    if (gameState === "dead") {
      const playtime = Math.floor((engineRef.current?.gameTime || 0) / 1000);
      setBestScore((prev) => {
        const isNew = score > prev;
        setNewBest(isNew);
        const next = isNew ? score : prev;
        localStorage.setItem(LOCAL_STORAGE_KEYS.BEST_SCORE, String(next));
        return next;
      });
      doSubmitScore(score, playtime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const handleNicknameConfirm = useCallback(
    async (nickname: string) => {
      saveNickname(nickname);
      setShowNicknameDialog(false);
      if (pendingScoreRef.current && user) {
        const { score: s, playtime } = pendingScoreRef.current;
        pendingScoreRef.current = null;
        try {
          await submitScore(user.uid, s, playtime);
          refreshLeaderboard();
        } catch {
          // silently fail
        }
      }
    },
    [user, submitScore, refreshLeaderboard]
  );

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
    <div className="relative w-full h-full overflow-hidden bg-background text-foreground font-sans select-none">
      <style>{`
        @keyframes comboIn{0%{transform:translateX(-50%) scale(.6);opacity:0}60%{transform:translateX(-50%) scale(1.15);opacity:1}100%{transform:translateX(-50%) scale(1);opacity:1}}
        .combo-badge{animation:comboIn .3s ease-out forwards;}
      `}</style>

      {/* NicknameDialog — shown over everything */}
      <NicknameDialog
        open={showNicknameDialog}
        onConfirm={handleNicknameConfirm}
      />

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
            {bestScore > 0 && (
              <div className="border-l border-border pl-2 sm:pl-3">
                <div
                  className="text-muted-foreground font-medium uppercase"
                  style={{ fontSize: "10px", letterSpacing: ".1em" }}
                >
                  {GAME_STRINGS.BEST_LABEL}
                </div>
                <div className="text-primary font-display font-bold text-base sm:text-lg leading-none mt-0.5">
                  {bestScore}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Combo badge — top center */}
      {gameState === "playing" && combo >= 2 && (
        <div
          key={combo}
          className="combo-badge absolute top-3 pointer-events-none"
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2">
            <div
              className="text-foreground font-display font-bold"
              style={{ fontSize: "14px" }}
            >
              x{combo} {GAME_STRINGS.COMBO_LABEL}
            </div>
          </div>
        </div>
      )}

      {/* Loading screen */}
      {gameState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-50 pointer-events-none">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <div
            className="mt-5 text-foreground font-display font-bold"
            style={{ fontSize: "20px", letterSpacing: ".05em" }}
          >
            {GAME_STRINGS.LOADING}
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
              {GAME_STRINGS.APP_NAME}
            </h1>
            <p className="text-muted-foreground text-[15px] mb-8">
              {GAME_STRINGS.LOGIN_PROMPT}
            </p>
            <div className="flex flex-col gap-4 w-full">
              <GameButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  if (user) {
                    setGameState("idle");
                  } else {
                    saveGameStateForRedirect("login");
                    loginWithGoogle()
                      .then(() => setGameState("idle"))
                      .catch(console.error);
                  }
                }}
              >
                {user
                  ? `${GAME_STRINGS.CONTINUE_AS} ${user.displayName?.split(" ")[0] || GAME_STRINGS.DEFAULT_NAME}`
                  : GAME_STRINGS.LOGIN_WITH_GOOGLE}
              </GameButton>
              <GameButton
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => {
                  if (user) logout().catch(console.error);
                  setGameState("idle");
                }}
              >
                {GAME_STRINGS.PLAY_AS_GUEST}
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {/* Idle screen */}
      {gameState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 pointer-events-none z-10">
          <div className="bg-card border-2 border-border rounded-3xl p-8 max-w-lg w-full mx-4 flex flex-col items-center gap-6 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18)]">
            <div className="text-center">
              <div
                className="text-foreground font-display font-extrabold"
                style={{ fontSize: "52px", letterSpacing: ".04em", lineHeight: "1.1" }}
              >
                {GAME_STRINGS.APP_NAME}
              </div>
              <div
                className="text-foreground/70 mt-2 font-semibold"
                style={{ fontSize: "17px" }}
              >
                {GAME_STRINGS.TAGLINE}
              </div>
            </div>

            <div className="hidden sm:flex gap-2 flex-wrap justify-center">
              {CREATURES.map((c) => (
                <div
                  key={c.name}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-center shadow-sm"
                >
                  <div
                    className="text-foreground font-semibold"
                    style={{ fontSize: "14px" }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="text-primary font-bold"
                    style={{ fontSize: "12px" }}
                  >
                    +{c.points}
                  </div>
                </div>
              ))}
            </div>

            {/* Auth Section for Idle Screen */}
            <div className="absolute top-4 right-4 pointer-events-auto">
              {user ? (
                <div className="flex items-center gap-3 bg-card/80 backdrop-blur border border-border rounded-full px-2 py-1.5 shadow-sm">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage
                      src={user.photoURL || undefined}
                      alt={user.displayName || "User"}
                    />
                    <AvatarFallback>
                      {user.displayName?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col pr-3">
                    <span className="text-[12px] font-bold text-foreground leading-none">
                      {user.displayName}
                    </span>
                    <button
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors text-left mt-0.5"
                      onClick={() => logout().catch(console.error)}
                    >
                      {GAME_STRINGS.LOGOUT}
                    </button>
                  </div>
                </div>
              ) : (
                <GameButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    saveGameStateForRedirect("idle");
                    loginWithGoogle().catch(console.error);
                  }}
                >
                  {GAME_STRINGS.LOGIN}
                </GameButton>
              )}
            </div>

            <GameButton
              variant="primary"
              size="lg"
              fullWidth
              className="pointer-events-auto"
              onClick={startGame}
            >
              {GAME_STRINGS.START_FISHING}
            </GameButton>
          </div>
        </div>
      )}

      {/* Game over screen */}
      {gameState === "dead" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm pointer-events-none p-4">
          <div className="text-foreground font-display font-bold text-[32px] leading-[1.2]">
            {GAME_STRINGS.GAME_OVER}
          </div>

          {/* Score card */}
          <div className="bg-card border border-border rounded-2xl px-8 py-6 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)] max-w-sm w-full">
            <div
              className="text-muted-foreground font-medium"
              style={{ fontSize: "13px" }}
            >
              {GAME_STRINGS.FINAL_SCORE}
            </div>
            <div
              className="text-primary font-display font-extrabold mt-1"
              style={{ fontSize: "48px", lineHeight: "1" }}
            >
              {score}
            </div>
            {newBest ? (
              <div
                className="text-secondary font-bold mt-2"
                style={{ fontSize: "14px" }}
              >
                {GAME_STRINGS.NEW_BEST}
              </div>
            ) : (
              bestScore > 0 && (
                <div
                  className="text-muted-foreground mt-2"
                  style={{ fontSize: "13px" }}
                >
                  best: {bestScore}
                </div>
              )
            )}
            <div
              className="text-muted-foreground mt-1"
              style={{ fontSize: "12px" }}
            >
              {GAME_STRINGS.TIME_LABEL}: {Math.floor((engineRef.current?.gameTime || 0) / 1000)}s
            </div>

            {/* Saving indicator */}
            {savingScore && (
              <div className="mt-2 text-[12px] text-muted-foreground animate-pulse">
                {GAME_STRINGS.SAVING_SCORE}
              </div>
            )}

            {/* Prompt for Guest */}
            {!user && score > 0 && (
              <div className="mt-4 p-3 bg-secondary/10 border border-secondary/30 rounded-xl pointer-events-auto">
                <p className="text-[12px] text-foreground mb-2">
                  {GAME_STRINGS.GUEST_SCORE_HIGH}
                  <br />
                  {GAME_STRINGS.GUEST_SCORE_LOGIN}
                </p>
                <GameButton
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    saveGameStateForRedirect("dead");
                    sessionStorage.setItem("auth_game_score", String(score));
                    loginWithGoogle().catch(console.error);
                  }}
                >
                  {GAME_STRINGS.LOGIN_WITH_GOOGLE}
                </GameButton>
              </div>
            )}
          </div>

          {/* Leaderboard — chỉ hiện khi đã login, preview 5 rows + "View Top 10" */}
          {user && (
            <div className="w-full max-w-sm pointer-events-auto">
              <LeaderboardTable
                data={leaderboardData}
                loading={leaderboardLoading}
                error={leaderboardError}
                currentUserId={user.uid}
                previewLimit={LEADERBOARD_PREVIEW_LIMIT}
                defaultExpanded={false}
              />
            </div>
          )}

          <GameButton
            variant="primary"
            size="md"
            className="pointer-events-auto mt-2 z-50 relative"
            onClick={startGame}
          >
            {GAME_STRINGS.PLAY_AGAIN}
          </GameButton>
        </div>
      )}

      {/* Menu Button (bottom left) */}
      {(gameState === "playing" ||
        gameState === "countdown" ||
        gameState === "paused" ||
        gameState === "dead") && (
        <GameButton
          variant="ghost"
          size="sm"
          onClick={handleMenuClick}
          className="absolute bottom-4 left-4 z-50 bg-card/95 pointer-events-auto"
        >
          {GAME_STRINGS.BACK_TO_MENU}
        </GameButton>
      )}

      {/* Pause / Confirm Exit dialog */}
      {gameState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/50 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)] max-w-sm w-full">
            <h2 className="text-foreground font-display font-bold text-[40px] leading-[1.2] mb-2">
              {GAME_STRINGS.PAUSE_TITLE}
            </h2>
            <p
              className="text-muted-foreground mb-6"
              style={{ fontSize: "16px", lineHeight: "1.6" }}
            >
              {GAME_STRINGS.PAUSE_MESSAGE}
            </p>
            <div className="flex justify-center gap-4">
              <GameButton
                variant="secondary"
                size="md"
                onClick={() => handleConfirmExit(true)}
              >
                {GAME_STRINGS.YES}
              </GameButton>
              <GameButton
                variant="primary"
                size="md"
                onClick={() => handleConfirmExit(false)}
              >
                {GAME_STRINGS.NO_RESUME}
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {gameState === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px] z-50 pointer-events-none">
          <div
            className="text-primary font-display font-extrabold animate-bounce"
            style={{ fontSize: "120px" }}
          >
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}
