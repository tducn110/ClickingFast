import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AudioManager } from "./audioManager";
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from "./constants";
import { getStorageValue, setStorageValue } from "./safeStorage";

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
      getStorageValue(LOCAL_STORAGE_KEYS.SOUND) ??
      getStorageValue(LEGACY_LOCAL_STORAGE_KEYS.SOUND);
    return saved !== null ? saved === "true" : defaultSettings.soundEffects;
  });

  const [music, setMusic] = useState<boolean>(() => {
    const saved =
      getStorageValue(LOCAL_STORAGE_KEYS.MUSIC) ??
      getStorageValue(LEGACY_LOCAL_STORAGE_KEYS.MUSIC);
    return saved !== null ? saved === "true" : defaultSettings.music;
  });

  useEffect(() => {
    AudioManager.setSoundEnabled(soundEffects);
    setStorageValue(LOCAL_STORAGE_KEYS.SOUND, String(soundEffects));
  }, [soundEffects]);

  useEffect(() => {
    AudioManager.setMusicEnabled(music);
    setStorageValue(LOCAL_STORAGE_KEYS.MUSIC, String(music));
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
