import { useState, useCallback } from "react";
import { PixiGame } from "./components/PixiGame";
import { OceanGame } from "./components/OceanGame";
import { useSettings, Difficulty } from "./lib/SettingsContext";

type Screen = "menu" | "game" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const { soundEffects, setSoundEffects, music, setMusic, difficulty, setDifficulty } = useSettings();

  const handleStartGame = useCallback(() => setScreen("game"), []);
  const handleSettings = useCallback(() => setScreen("settings"), []);
  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  const toggleDifficulty = () => {
    const diffs: Difficulty[] = ["Easy", "Normal", "Hard"];
    const idx = diffs.indexOf(difficulty);
    setDifficulty(diffs[(idx + 1) % diffs.length]);
  };

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
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 md:p-12 w-full max-w-sm sm:max-w-md text-center">
            <h2 className="text-foreground font-display font-extrabold text-[32px] sm:text-[40px] leading-[1.2] mb-6">Settings</h2>

            <div className="space-y-4 text-left mb-8 select-none">
              <div 
                className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-4 border border-[rgba(74,77,78,0.15)] cursor-pointer"
                onClick={() => setSoundEffects(!soundEffects)}
              >
                <span className="text-foreground font-medium" style={{ fontSize: "16px", lineHeight: "1.5" }}>Sound Effects</span>
                <div className={`w-11 h-6 rounded-full relative transition-colors ${soundEffects ? "bg-primary" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${soundEffects ? "right-0.5" : "left-0.5"}`} />
                </div>
              </div>
              <div 
                className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-4 border border-[rgba(74,77,78,0.15)] cursor-pointer"
                onClick={() => setMusic(!music)}
              >
                <span className="text-foreground font-medium" style={{ fontSize: "16px", lineHeight: "1.5" }}>Music</span>
                <div className={`w-11 h-6 rounded-full relative transition-colors ${music ? "bg-primary" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${music ? "right-0.5" : "left-0.5"}`} />
                </div>
              </div>
              <div 
                className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-4 border border-[rgba(74,77,78,0.15)] cursor-pointer"
                onClick={toggleDifficulty}
              >
                <span className="text-foreground font-medium" style={{ fontSize: "16px", lineHeight: "1.5" }}>Difficulty</span>
                <span className="text-primary font-bold">{difficulty}</span>
              </div>
            </div>

            <button
              onClick={handleBackToMenu}
              className="bg-primary hover:bg-[#D6B847] text-primary-foreground font-semibold py-3 px-10 rounded-full transition-colors duration-200 w-full"
              style={{ fontSize: "15px", lineHeight: "1" }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
