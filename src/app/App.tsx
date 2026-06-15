import { useState, useCallback } from "react";
import { PixiGame } from "./components/PixiGame";
import { OceanGame } from "./components/OceanGame";
import { SettingsDialog } from "./components/SettingsDialog";

type Screen = "menu" | "game" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");

  const handleStartGame = useCallback(() => setScreen("game"), []);
  const handleSettings = useCallback(() => setScreen("settings"), []);
  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  return (
    <div className="min-h-screen w-full bg-background">
      {screen === "menu" && (
        <PixiGame
          onStartGame={handleStartGame}
          onSettings={handleSettings}
        />
      )}

      {screen === "game" && (
        <div className="relative w-full h-screen">
          <OceanGame onBackToMenu={handleBackToMenu} />
        </div>
      )}

      {screen === "settings" && (
        <SettingsDialog onBack={handleBackToMenu} />
      )}
    </div>
  );
}
