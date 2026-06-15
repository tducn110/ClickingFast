import { useState, useCallback } from "react";
import { saveUserScore } from "../../lib/firebase/db";
import { LOCAL_STORAGE_KEYS } from "../lib/constants";

interface UseScoreSubmitReturn {
  submit: (userId: string, score: number, playtime: number) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

// Lấy nickname từ localStorage, hoặc fallback về displayName
export const getNickname = (): string | null => {
  return localStorage.getItem(LOCAL_STORAGE_KEYS.NICKNAME);
};

export const saveNickname = (nickname: string): void => {
  localStorage.setItem(LOCAL_STORAGE_KEYS.NICKNAME, nickname.trim());
};

export const useScoreSubmit = (): UseScoreSubmitReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (userId: string, score: number, playtime: number) => {
      const nickname = getNickname();
      if (!nickname) {
        // Caller phải xử lý trường hợp chưa có nickname (hiện NicknameDialog)
        throw new Error("NO_NICKNAME");
      }
      setIsLoading(true);
      setIsSuccess(false);
      setError(null);
      try {
        await saveUserScore(userId, nickname, score, playtime);
        setIsSuccess(true);
      } catch {
        setError("Không thể lưu điểm. Thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { submit, isLoading, isSuccess, error };
};
