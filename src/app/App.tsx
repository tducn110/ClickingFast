import { useState, useCallback } from "react";
import { PixiGame } from "./components/PixiGame";
import { OceanGame } from "./components/OceanGame";

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
        <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4">
          <div className="bg-card border border-border rounded-[24px] p-8 md:p-12 w-full max-w-md text-center">
            <h2 className="text-foreground font-display font-extrabold text-3xl mb-6">Settings</h2>

            <div className="space-y-4 text-left mb-8">
              <div className="flex items-center justify-between bg-background rounded-[16px] px-5 py-4 border border-border">
                <span className="text-foreground font-medium">Sound Effects</span>
                <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-background rounded-[16px] px-5 py-4 border border-border">
                <span className="text-foreground font-medium">Music</span>
                <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-background rounded-[16px] px-5 py-4 border border-border">
                <span className="text-foreground font-medium">Difficulty</span>
                <span className="text-primary font-bold">Normal</span>
              </div>
            </div>

            <button
              onClick={handleBackToMenu}
              className="bg-primary hover:bg-[#D6B847] text-primary-foreground font-semibold py-3 px-10 rounded-full transition-colors duration-200 w-full"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
