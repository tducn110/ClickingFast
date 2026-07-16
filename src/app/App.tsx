import { useState, useCallback, useEffect } from "react";
import { MenuScreen } from "./components/screens/MenuScreen";
import { GameplayScreen } from "./components/screens/GameplayScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { LeaderboardScreen } from "./components/screens/LeaderboardScreen";
import { AudioManager } from "./lib/audioManager";
import { useLocalLeaderboard } from "./hooks/useLocalLeaderboard";
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from "./lib/constants";

type Screen = "menu" | "game" | "settings" | "leaderboard";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [nickname, setNickname] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.NICKNAME) ??
      localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.PLAYER_NAME) ??
      ""
  );
  const { entries, addScore } = useLocalLeaderboard();
  const normalizedNickname = nickname.trim();
  const bestScore = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.BEST_SCORE) ?? 0);

  const handleStartGame = useCallback(() => setScreen("game"), []);
  const handleSettings = useCallback(() => setScreen("settings"), []);
  const handleLeaderboard = useCallback(() => setScreen("leaderboard"), []);
  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NICKNAME, normalizedNickname);
  }, [normalizedNickname]);

  useEffect(() => {
    const handleButtonClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("button");
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;
      if (button.dataset.uiSfx === "off") return;

      void AudioManager.unlockAudio().then(() => AudioManager.playButton());
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
    </div>
  );
}
