import { describe, expect, it, beforeEach } from "vitest";
import i18n, {
  LANGUAGE_STORAGE_KEY,
  getInitialLanguage,
  hasStoredLanguagePreference,
  applyHostLocale,
} from "./i18n";

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
};

(globalThis as any).localStorage = localStorageMock;
(globalThis as any).window = {
  ...globalThis,
  localStorage: localStorageMock,
};

describe("i18n configuration and persistence (03_muavu)", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("has translations for both 'en' and 'vi'", () => {
    expect(i18n.getResourceBundle("en", "translation")).toBeDefined();
    expect(i18n.getResourceBundle("vi", "translation")).toBeDefined();
    expect(i18n.t("common.play", { lng: "en" })).toBe("Play");
    expect(i18n.t("common.play", { lng: "vi" })).toBe("Chơi");
  });

  it("persists language change to localStorage when changed", async () => {
    await i18n.changeLanguage("vi");
    expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe("vi");
    expect(i18n.t("gameplay.score")).toBe("Điểm số");

    await i18n.changeLanguage("en");
    expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(i18n.t("gameplay.score")).toBe("Score");
  });

  it("migrates from legacy storage key if present", () => {
    localStorageMock.setItem("fruit-slashing-language", "vi");
    expect(getInitialLanguage()).toBe("vi");
    expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe("vi");
  });

  it("defaults to English ('en') on fresh storage (first fallback is English)", () => {
    expect(getInitialLanguage()).toBe("en");
    expect(hasStoredLanguagePreference()).toBe(false);
  });

  it("falls back to 'en' when storage contains invalid language", () => {
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, "invalid-locale");
    expect(getInitialLanguage()).toBe("en");
    expect(hasStoredLanguagePreference()).toBe(false);
  });

  it("hasStoredLanguagePreference returns true only after valid preference is saved", async () => {
    expect(hasStoredLanguagePreference()).toBe(false);
    await i18n.changeLanguage("vi");
    expect(hasStoredLanguagePreference()).toBe(true);
    expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe("vi");
  });

  it("applyHostLocale does NOT overwrite localStorage or player preference", async () => {
    // 1. When player already has preference 'en'
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, "en");
    await i18n.changeLanguage("en");
    expect(hasStoredLanguagePreference()).toBe(true);

    // Host sends 'vi' -> must NOT override user choice
    const result = applyHostLocale("vi");
    expect(result).toBe("en");
    expect(i18n.resolvedLanguage).toBe("en");
    expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");

    // 2. When player has NO preference
    localStorageMock.clear();
    expect(hasStoredLanguagePreference()).toBe(false);

    // Host sends 'vi' -> sets language in memory without polluting localStorage
    const freshResult = applyHostLocale("vi");
    expect(freshResult).toBe("vi");
    expect(i18n.resolvedLanguage).toBe("vi");
    expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    expect(hasStoredLanguagePreference()).toBe(false);
  });

  it("has close key in both locales", () => {
    expect(i18n.t("common.close", { lng: "en" })).toBe("Close");
    expect(i18n.t("common.close", { lng: "vi" })).toBe("Đóng");
  });
});
