import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AudioManager } from "./audioManager";

export type Difficulty = "Easy" | "Normal" | "Hard";

interface SettingsState {
  soundEffects: boolean;
  music: boolean;
  difficulty: Difficulty;
  setSoundEffects: (val: boolean) => void;
  setMusic: (val: boolean) => void;
  setDifficulty: (val: Difficulty) => void;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

const defaultSettings = {
  soundEffects: true,
  music: true,
  difficulty: "Normal" as Difficulty,
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [soundEffects, setSoundEffects] = useState<boolean>(() => {
    const saved = localStorage.getItem("deepTapSound");
    return saved !== null ? saved === "true" : defaultSettings.soundEffects;
  });

  const [music, setMusic] = useState<boolean>(() => {
    const saved = localStorage.getItem("deepTapMusic");
    return saved !== null ? saved === "true" : defaultSettings.music;
  });

  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = localStorage.getItem("deepTapDifficulty") as Difficulty;
    return saved ? saved : defaultSettings.difficulty;
  });

  useEffect(() => {
    AudioManager.init();
    AudioManager.setSoundEnabled(soundEffects);
    localStorage.setItem("deepTapSound", String(soundEffects));
  }, [soundEffects]);

  useEffect(() => {
    AudioManager.init();
    AudioManager.setMusicEnabled(music);
    localStorage.setItem("deepTapMusic", String(music));
  }, [music]);

  useEffect(() => {
    localStorage.setItem("deepTapDifficulty", difficulty);
  }, [difficulty]);

  return (
    <SettingsContext.Provider value={{
      soundEffects, setSoundEffects,
      music, setMusic,
      difficulty, setDifficulty
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
