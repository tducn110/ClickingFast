import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import { MenuScreen } from "./components/screens/MenuScreen";
import { AudioManager } from "./lib/audioManager";
import {
  scheduleIdle,
  shouldSkipPixiWarmUp,
  warmCriticalImages,
} from "./lib/warmGameplayAssets";
import { useWinkPlatform } from "../integrations/wink/useWinkPlatform";
import { winkGame } from "../integrations/wink/client";
import type { LeaderboardEntry } from "./types";
import { useTranslation } from "react-i18next";

type Screen = "menu" | "game" | "settings" | "leaderboard";

const GameplayScreen = lazy(() =>
  import("./components/screens/GameplayScreen").then((module) => ({
    default: module.GameplayScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import("./components/screens/SettingsScreen").then((module) => ({
    default: module.SettingsScreen,
  })),
);
const LeaderboardScreen = lazy(() =>
  import("./components/screens/LeaderboardScreen").then((module) => ({
    default: module.LeaderboardScreen,
  })),
);

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [winkLeaderboard, setWinkLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [bestScore, setBestScore] = useState<number>(0);
  const platform = useWinkPlatform();
  const { t } = useTranslation();

  const handleStartGame = useCallback(() => {
    // Keep this direct call in the Play button's click stack for iOS Safari.
    AudioManager.playBGM();
    setScreen("game");
  }, []);
  const handleSettings = useCallback(() => setScreen("settings"), []);

  const refreshWinkLeaderboard = useCallback(async () => {
    if (winkGame.capabilities.getLeaderboard) {
      try {
        const [res, personalBest] = await Promise.all([
          winkGame.refreshLeaderboard(),
          winkGame.getPersonalBest()
        ]);
        if (personalBest) {
          setBestScore(personalBest.score);
        }
        setWinkLeaderboard(
          res.entries.map((e) => ({
            id: e.id,
            name: e.displayName ?? (e.isAnonymous ? t("leaderboard.currentPlayer") : t("leaderboard.player")),
            isCurrentPlayer: winkGame.lastSubmittedEntryId === e.id || e.id === personalBest?.id,
            score: e.score,
            date: e.createdAt,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch Wink leaderboard:", err);
      }
    }
  }, [t]);

  const handleLeaderboard = useCallback(() => {
    refreshWinkLeaderboard();
    setScreen("leaderboard");
  }, [refreshWinkLeaderboard]);

  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  useEffect(() => {
    if (platform.connection === "anonymous" || platform.connection === "signed-in") {
      refreshWinkLeaderboard();
    }
  }, [platform.connection, refreshWinkLeaderboard]);


  useEffect(() => {
    if (screen !== "game") AudioManager.pauseBGM();
  }, [screen]);

  useEffect(() => {
    AudioManager.preload();

    let cancelled = false;
    let warmUpStarted = false;
    const beginWarmUp = () => {
      if (cancelled || warmUpStarted) return;
      warmUpStarted = true;

      scheduleIdle(() => {
        if (cancelled) return;
        warmCriticalImages();

        if (shouldSkipPixiWarmUp()) return;
        scheduleIdle(() => {
          if (cancelled) return;
          void import("./components/screens/GameplayScreen")
            .then((module) => module.warmGameplayAssets?.())
            .catch(() => {
              // Best-effort warm-up; the engine preloads on demand anyway.
            });
        }, 3000);
      }, 1500);
    };

    const handleFirstInteraction = () => beginWarmUp();
    document.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
      passive: true,
    });
    document.addEventListener("keydown", handleFirstInteraction, {
      once: true,
      passive: true,
    });

    const handleButtonClick = (event: MouseEvent) => {
      // play() is invoked synchronously inside unlockAudio, before React effects
      // or async work can lose Safari's transient user activation.
      void AudioManager.unlockAudio();

      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("button");
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;
      if (button.dataset.uiSfx === "off") return;

      AudioManager.playButton();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      void AudioManager.unlockAudio();
    };

    document.addEventListener("click", handleButtonClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("click", handleButtonClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-background overflow-hidden relative">
      {screen === "menu" && (
        <MenuScreen
          onStartGame={handleStartGame}
          onLeaderboard={handleLeaderboard}
          onSettings={handleSettings}
          bestScore={bestScore}
          isConnecting={platform.connection === "connecting"}
          errorMessage={platform.connection === "error" ? platform.errorCode : null}
        />
      )}

      <Suspense fallback={<div className="h-full w-full bg-[#DCECF0]" />}>
        {screen === "game" && (
          <div className="relative w-full h-[100dvh]">
            <GameplayScreen
              onBackToMenu={handleBackToMenu}
            />
          </div>
        )}

        {screen === "settings" && (
          <SettingsScreen onBack={handleBackToMenu} />
        )}

        {screen === "leaderboard" && (
          <LeaderboardScreen
            entries={winkLeaderboard ?? []}
            playerName={winkGame.displayName ?? undefined}
            onBack={handleBackToMenu}
          />
        )}
      </Suspense>
    </div>
  );
}
