import { useState, useEffect, useCallback } from "react";
import { getLeaderboard, type ScoreRecord } from "../../lib/firebase/db";

interface UseLeaderboardReturn {
  data: ScoreRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useLeaderboard = (limit: number): UseLeaderboardReturn => {
  const [data, setData] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    getLeaderboard(limit)
      .then(setData)
      .catch(() => setError("Không thể tải bảng xếp hạng."))
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
};
