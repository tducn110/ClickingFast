import { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
}

export function useLocalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('ocean_leaderboard');
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }
  }, []);

  const addScore = (name: string, score: number) => {
    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || "Anonymous",
      score,
      date: new Date().toISOString(),
    };

    setEntries(prev => {
      const updated = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 50); // Keep top 50
      localStorage.setItem('ocean_leaderboard', JSON.stringify(updated));
      return updated;
    });
  };

  return { entries, addScore };
}
