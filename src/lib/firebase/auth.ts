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

// --- Safari detection (ITP + popup blocker) ---
const isSafari = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  // Safari check: includes 'safari' but NOT 'chrome' (Chrome also says 'safari')
  // Also covers iOS Safari (CriOS = Chrome on iOS, FxiOS = Firefox on iOS)
  if (!ua.includes("safari") || ua.includes("chrome") || ua.includes("crios")) {
    return false;
  }
  return true;
};

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

export const loginWithGoogle = async (): Promise<User | undefined> => {
  // Safari: skip popup entirely — go straight to redirect
  // (popup gets blocked + ITP breaks third-party cookies)
  if (isSafari()) {
    console.log("Safari detected — using redirect (first-party cookie flow)");
    // No need to save game state here; caller should call saveGameStateForRedirect() first
    await signInWithRedirect(auth, googleProvider);
    // Redirect happens — execution stops here, page reloads
    return undefined;
  }

  // Chrome / Firefox / Edge — try popup first (faster UX, no page reload)
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Lỗi đăng nhập Google (Popup):", error);
    const popupErrors = [
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cross-origin-cookies-blocked",
      "auth/network-request-failed",
    ];

    if (popupErrors.includes(error.code)) {
      console.warn("Popup bị chặn. Tự động chuyển sang Redirect...");
      await signInWithRedirect(auth, googleProvider);
      return undefined;
    }

    alert("Không thể đăng nhập. Hãy thử mở game bằng Chrome/Safari gốc nhé!");
    throw error;
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
