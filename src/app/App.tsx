import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import { MenuScreen } from "./components/screens/MenuScreen";
import { AudioManager } from "./lib/audioManager";
import { useLocalLeaderboard } from "./hooks/useLocalLeaderboard";
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from "./lib/constants";
import { getStorageNumber, getStorageValue, setStorageValue } from "./lib/safeStorage";

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
  const [nickname, setNickname] = useState(
    () =>
      getStorageValue(LOCAL_STORAGE_KEYS.NICKNAME) ??
      getStorageValue(LEGACY_LOCAL_STORAGE_KEYS.PLAYER_NAME) ??
      ""
  );
  const { entries, addScore } = useLocalLeaderboard();
  const normalizedNickname = nickname.trim();
  const bestScore = getStorageNumber(LOCAL_STORAGE_KEYS.BEST_SCORE);

  const handleStartGame = useCallback(() => setScreen("game"), []);
  const handleSettings = useCallback(() => setScreen("settings"), []);
  const handleLeaderboard = useCallback(() => setScreen("leaderboard"), []);
  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  useEffect(() => {
    setStorageValue(LOCAL_STORAGE_KEYS.NICKNAME, normalizedNickname);
  }, [normalizedNickname]);

  useEffect(() => {
    const handleButtonClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("button");
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;
      if (button.dataset.uiSfx === "off") return;

      AudioManager.unlockAudio();
      AudioManager.playButton();
    };

    document.addEventListener("click", handleButtonClick, true);
    return () => document.removeEventListener("click", handleButtonClick, true);
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-background overflow-hidden relative">
      {screen === "menu" && (
        <MenuScreen
          onStartGame={handleStartGame}
          onLeaderboard={handleLeaderboard}
          onSettings={handleSettings}
          nickname={nickname}
          bestScore={bestScore}
          onNicknameChange={setNickname}
        />
      )}

      <Suspense fallback={<div className="h-full w-full bg-[#DCECF0]" />}>
        {screen === "game" && (
          <div className="relative w-full h-[100dvh]">
            <GameplayScreen
              onBackToMenu={handleBackToMenu}
              playerName={normalizedNickname || "Khách"}
              addLeaderboardScore={addScore}
            />
          </div>
        )}

        {screen === "settings" && (
          <SettingsScreen onBack={handleBackToMenu} />
        )}

        {screen === "leaderboard" && (
          <LeaderboardScreen
            entries={entries}
            nickname={normalizedNickname}
            onBack={handleBackToMenu}
          />
        )}
      </Suspense>
    </div>
  );
}
