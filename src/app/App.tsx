import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import { MenuScreen } from "./components/screens/MenuScreen";
import { AudioManager } from "./lib/audioManager";
import {
  scheduleIdle,
  shouldSkipPixiWarmUp,
  warmCriticalImages,
} from "./lib/warmGameplayAssets";
import { useWinkIntegration } from "../integrations/wink/useWinkIntegration";
import type { LeaderboardEntry } from "./types";
import { useTranslation } from "react-i18next";
import { preloadCriticalResources, preloadNonCriticalResources } from "../utils/game-loader";
import { completeGameLoading, onGameLoadingDismiss, setGameLoadingProgress } from "../utils/loading-controller";

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
  const wink = useWinkIntegration();
  const { t } = useTranslation();

  // Unified PapaStudio loading screen lifecycle barrier
  useEffect(() => {
    setGameLoadingProgress(25);
    const criticalPromise = preloadCriticalResources((pct) => {
      setGameLoadingProgress(Math.min(95, pct));
    });

    void Promise.allSettled([criticalPromise, wink.readyPromise]).then(() => {
      completeGameLoading();
    });

    const unbind = onGameLoadingDismiss(() => {
      void AudioManager.unlockAudio().then((unlocked) => {
        if (unlocked && AudioManager.isMusicEnabled && !AudioManager.isBgmPlaying) {
          AudioManager.playBGM(AudioManager.LANDING_BGM_VOLUME);
        }
      }).catch(() => {});
      preloadNonCriticalResources();
    });
    return unbind;
  }, [wink.readyPromise]);

  const [screen, setScreen] = useState<Screen>("menu");

  const handleStartGame = useCallback(() => {
    // Keep this direct call in the Play button's click stack for iOS Safari.
    void AudioManager.unlockAudio();
    if (!AudioManager.isBgmPlaying) {
      AudioManager.playBGM(AudioManager.GAME_BGM_VOLUME);
    } else {
      AudioManager.setBgmVolume(AudioManager.GAME_BGM_VOLUME);
    }
    setScreen("game");
  }, []);
  const handleSettings = useCallback(() => {
    AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
    setScreen("settings");
  }, []);

  const refreshWinkLeaderboard = useCallback(async () => {
    if (wink.canSubmitScore) {
      try {
        await Promise.all([
          wink.refreshLeaderboard(),
          wink.refreshPersonalBest()
        ]);
      } catch (err) {
        console.error("Failed to fetch Wink leaderboard:", err);
      }
    }
  }, [wink]);

  const handleLeaderboard = useCallback(() => {
    AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
    void refreshWinkLeaderboard();
    setScreen("leaderboard");
  }, [refreshWinkLeaderboard]);

  const handleBackToMenu = useCallback(() => {
    AudioManager.setBgmVolume(AudioManager.LANDING_BGM_VOLUME);
    if (!AudioManager.isBgmPlaying && AudioManager.isMusicEnabled) {
      AudioManager.playBGM(AudioManager.LANDING_BGM_VOLUME);
    }
    setScreen("menu");
  }, []);

  useEffect(() => {
    if (wink.phase === "ready_anonymous" || wink.phase === "ready_authenticated") {
      void refreshWinkLeaderboard();
    }
  }, [wink.phase, refreshWinkLeaderboard]);

  // Lifecycle control matching 01_fruit standard: pause on blur/hidden, resume on focus/visible when in menu/landing
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        AudioManager.pauseBGM();
      } else if (screen !== "game" && AudioManager.isMusicEnabled) {
        AudioManager.resumeBGM(AudioManager.LANDING_BGM_VOLUME);
      }
    };
    const handleBlur = () => {
      AudioManager.pauseBGM();
    };
    const handleFocus = () => {
      if (screen !== "game" && AudioManager.isMusicEnabled) {
        AudioManager.resumeBGM(AudioManager.LANDING_BGM_VOLUME);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
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

    const handleFirstInteraction = () => {
      beginWarmUp();
      void AudioManager.unlockAudio().then((unlocked) => {
        if (unlocked && AudioManager.isMusicEnabled && !AudioManager.isBgmPlaying && screen !== "game") {
          AudioManager.playBGM(AudioManager.LANDING_BGM_VOLUME);
        }
      }).catch(() => {});
    };
    document.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
      passive: true,
    });
    document.addEventListener("touchstart", handleFirstInteraction, {
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
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("click", handleButtonClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [screen]);

  const mappedLeaderboard = wink.leaderboard.map((e, index) => ({
    id: e.id ?? String(index),
    name: e.displayName ?? (e.isAnonymous ? t("leaderboard.currentPlayer") : t("leaderboard.player")),
    isCurrentPlayer: wink.personalBest?.id === e.id,
    score: e.score,
    date: e.createdAt ?? "",
  }));

  return (
    <div className="h-[100dvh] w-full bg-background overflow-hidden relative">
      {screen === "menu" && (
        <MenuScreen
          onStartGame={handleStartGame}
          onLeaderboard={handleLeaderboard}
          onSettings={handleSettings}
          bestScore={wink.personalBest?.score ?? 0}
          isConnecting={wink.status === "connecting"}
          errorMessage={wink.error ? wink.error.message : null}
        />
      )}

      <Suspense fallback={<div className="h-full w-full bg-[#DCECF0]" />}>
        {screen === "game" && (
          <div className="relative w-full h-[100dvh]">
            <GameplayScreen
              onBackToMenu={handleBackToMenu}
              wink={wink}
            />
          </div>
        )}

        {screen === "settings" && (
          <SettingsScreen onBack={handleBackToMenu} />
        )}

        {screen === "leaderboard" && (
          <LeaderboardScreen
            entries={mappedLeaderboard}
            playerName={wink.displayName ?? undefined}
            onBack={handleBackToMenu}
          />
        )}
      </Suspense>
    </div>
  );
}
