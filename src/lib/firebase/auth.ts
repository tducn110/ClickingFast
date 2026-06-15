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

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Lỗi đăng nhập Google (Popup):", error);
    // Bắt lỗi trình duyệt chặn Popup (In-app browser như FB/Zalo) hoặc chặn Cookie
    const popupErrors = [
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cross-origin-cookies-blocked",
      "auth/network-request-failed"
    ];
    
    if (popupErrors.includes(error.code)) {
      console.warn("Popup bị chặn. Tự động chuyển sang chế độ Chuyển trang (Redirect)...");
      // Dùng phương thức chuyển hẳn trang để lách luật chặn popup
      await signInWithRedirect(auth, googleProvider);
    } else {
      alert("Không thể đăng nhập. Hãy thử mở game bằng Chrome/Safari gốc nhé!");
      throw error;
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
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
    // Kiểm tra xem user có vừa được trả về từ trang Redirect không (nếu vừa bị fallback)
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
