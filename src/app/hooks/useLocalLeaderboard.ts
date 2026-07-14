import { useState, useEffect } from 'react';
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from '../lib/constants';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
}

export function useLocalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const preferred = localStorage.getItem(LOCAL_STORAGE_KEYS.LEADERBOARD);
    const legacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.LEADERBOARD);
    const saved = preferred ?? legacy;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LeaderboardEntry[];
        setEntries(parsed);
        if (!preferred && legacy) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.LEADERBOARD, JSON.stringify(parsed));
        }
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }
  }, []);

  const addScore = (name: string, score: number) => {
    const newEntry: LeaderboardEntry = {
      id: crypto.randomUUID(),
      name: name || "Khách",
      score,
      date: new Date().toISOString(),
    };

    setEntries(prev => {
      const updated = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 50); // Keep top 50
      localStorage.setItem(LOCAL_STORAGE_KEYS.LEADERBOARD, JSON.stringify(updated));
      return updated;
    });
  };

  return { entries, addScore };
}
