import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { auth } from "./config";
import { useState, useEffect } from "react";

const googleProvider = new GoogleAuthProvider();

// --- sessionStorage keys for redirect state preservation ---
const STORAGE_KEYS = {
  REDIRECT_PENDING: "auth_redirect_pending",
  GAME_STATE: "auth_game_state",
} as const;

// --- Public helpers for saving/restoring app state across redirect ---
export const saveGameStateForRedirect = (gameState: string): void => {
  sessionStorage.setItem(STORAGE_KEYS.REDIRECT_PENDING, "1");
  sessionStorage.setItem(STORAGE_KEYS.GAME_STATE, gameState);
};

export const consumeRedirectGameState = (): string | null => {
  const wasPending = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_PENDING);
  const gameState = sessionStorage.getItem(STORAGE_KEYS.GAME_STATE);
  // Clear immediately so stale state doesn't linger
  sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_PENDING);
  sessionStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  if (wasPending === "1" && gameState) {
    return gameState;
  }
  return null;
};

// Popup-first with 12s timeout → redirect fallback
// Popup uses postMessage (works cross-origin, no ITP issue).
// Redirect is the fallback for popup-blockers / COOP / in-app browsers.
export const loginWithGoogle = async (): Promise<User | undefined> => {
  await auth.authStateReady();

  try {
    // Try popup with timeout — popup uses postMessage, avoids cross-origin storage issues
    const result = await Promise.race([
      signInWithPopup(auth, googleProvider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("POPUP_TIMEOUT")), 12000)
      ),
    ]);
    return result.user;
  } catch (error: any) {
    const reason = error?.message || error?.code || "unknown";
    console.warn("Popup auth failed (" + reason + "), falling back to redirect...");

    // Fallback to redirect — works even with popup blockers, but may have
    // cross-origin storage issues on Safari with aggressive ITP
    await signInWithRedirect(auth, googleProvider);
    // Redirect happens — execution stops here
    return undefined;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    // Clean up any redirect state
    sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_PENDING);
    sessionStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
    throw error;
  }
};

// Hook để lắng nghe trạng thái đăng nhập
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy kết quả từ Redirect (nếu vừa quay lại từ Google OAuth)
    getRedirectResult(auth).catch((error) => {
      console.error("Lỗi đăng nhập qua Redirect:", error);
      if (error.code === "auth/web-storage-unsupported") {
        alert("Trình duyệt Ẩn danh (Incognito) đang chặn lưu trữ. Vui lòng tắt chế độ Ẩn danh!");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};
