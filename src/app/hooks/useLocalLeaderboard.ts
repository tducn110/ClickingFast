import { useCallback, useEffect, useState } from "react";
import {
  LEADERBOARD_FULL_LIMIT,
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  NICKNAME_CONFIG,
} from "../lib/constants";

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
}

function createEntryId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `score-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function normalizeEntries(value: unknown): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];

      const entry = candidate as Partial<LeaderboardEntry>;
      const score = Number(entry.score);
      if (!Number.isFinite(score) || score < 0) return [];

      const name =
        String(entry.name ?? "Khách")
          .trim()
          .slice(0, NICKNAME_CONFIG.MAX_LENGTH) || "Khách";
      const parsedDate =
        typeof entry.date === "string" ? Date.parse(entry.date) : Number.NaN;

      return [
        {
          id:
            typeof entry.id === "string" && entry.id
              ? entry.id
              : createEntryId(),
          name,
          score: Math.round(score),
          date: Number.isFinite(parsedDate)
            ? new Date(parsedDate).toISOString()
            : new Date(0).toISOString(),
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, LEADERBOARD_FULL_LIMIT);
}

function loadEntries() {
  const preferred = localStorage.getItem(LOCAL_STORAGE_KEYS.LEADERBOARD);
  const legacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.LEADERBOARD);
  const saved = preferred ?? legacy;
  if (!saved) return [];

  try {
    return normalizeEntries(JSON.parse(saved));
  } catch (error) {
    console.warn("Failed to parse leaderboard", error);
    return [];
  }
}

export function useLocalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(loadEntries);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.LEADERBOARD,
      JSON.stringify(entries),
    );
  }, [entries]);

  const addScore = useCallback((name: string, score: number) => {
    const newEntry: LeaderboardEntry = {
      id: createEntryId(),
      name:
        name.trim().slice(0, NICKNAME_CONFIG.MAX_LENGTH) || "Khách",
      score: Math.max(0, Math.round(score)),
      date: new Date().toISOString(),
    };

    setEntries((previous) => normalizeEntries([...previous, newEntry]));
  }, []);

  return { entries, addScore };
}
