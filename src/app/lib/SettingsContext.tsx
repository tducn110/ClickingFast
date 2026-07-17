import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AudioManager } from "./audioManager";
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from "./constants";

interface SettingsState {
  soundEffects: boolean;
  music: boolean;
  setSoundEffects: (val: boolean) => void;
  setMusic: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

const defaultSettings = {
  soundEffects: true,
  music: true,
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [soundEffects, setSoundEffects] = useState<boolean>(() => {
    const saved =
      localStorage.getItem(LOCAL_STORAGE_KEYS.SOUND) ??
      localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.SOUND);
    return saved !== null ? saved === "true" : defaultSettings.soundEffects;
  });

  const [music, setMusic] = useState<boolean>(() => {
    const saved =
      localStorage.getItem(LOCAL_STORAGE_KEYS.MUSIC) ??
      localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.MUSIC);
    return saved !== null ? saved === "true" : defaultSettings.music;
  });

  useEffect(() => {
    AudioManager.init();
  }, []);

  useEffect(() => {
    AudioManager.setSoundEnabled(soundEffects);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SOUND, String(soundEffects));
  }, [soundEffects]);

  useEffect(() => {
    AudioManager.setMusicEnabled(music);
    localStorage.setItem(LOCAL_STORAGE_KEYS.MUSIC, String(music));
  }, [music]);

  return (
    <SettingsContext.Provider value={{
      soundEffects, setSoundEffects,
      music, setMusic,
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
