import { useState, useCallback, useEffect } from "react";
import { PixiGame } from "./components/PixiGame";
import { HarvestGame } from "./components/HarvestGame";
import { SettingsDialog } from "./components/SettingsDialog";
import { AudioManager } from "./lib/audioManager";

type Screen = "menu" | "game" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");

  const handleStartGame = useCallback(async () => {
    AudioManager.init();
    await AudioManager.unlockAudio();
    setScreen("game");
  }, []);
  const handleSettings = useCallback(async () => {
    AudioManager.init();
    await AudioManager.unlockAudio();
    setScreen("settings");
  }, []);
  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  return (
    <div className="h-[100dvh] w-full bg-background overflow-hidden relative">
      {screen === "menu" && (
        <PixiGame
          onStartGame={handleStartGame}
          onSettings={handleSettings}
        />
      )}

      {screen === "game" && (
        <div className="relative w-full h-[100dvh]">
          <HarvestGame onBackToMenu={handleBackToMenu} />
        </div>
      )}

      {screen === "settings" && (
        <SettingsDialog onBack={handleBackToMenu} />
      )}
    </div>
  );
}
