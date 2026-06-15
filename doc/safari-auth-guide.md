# 🍎 Safari Firebase Auth — Kinh nghiệm & Giải pháp

> Tổng hợp mọi vấn đề gặp phải khi tích hợp Google Sign-In với Firebase Auth trên Safari và cách fix triệt để.

---

## 1. Vấn đề gốc

Safari có 3 cơ chế bảo mật gây khó cho Firebase Auth:

| Cơ chế | Ảnh hưởng |
|--------|-----------|
| **Popup Blocker** | Chặn `window.open()` → `signInWithPopup` không chạy |
| **ITP (Intelligent Tracking Prevention)** | Chặn third-party cookies + partition storage giữa các origin khác nhau |
| **Storage Partitioning** | `sessionStorage`/`localStorage`/`IndexedDB` bị cô lập theo origin → cross-origin redirect mất state |

---

## 2. Các phương án đã thử

### ❌ Phương án 1: Popup-first, redirect fallback (code cũ)

```ts
try {
  await signInWithPopup(auth, provider);
} catch (e) {
  if (popupErrors.includes(e.code)) {
    await signInWithRedirect(auth, provider);
  }
}
```

**Kết quả:** Thất bại trên Safari vì:
- Popup bị chặn → rơi vào redirect
- Redirect dùng `authDomain=games-2f526.firebaseapp.com` (khác origin với app) → ITP chặn storage → **"missing initial state"**

### ❌ Phương án 2: Redirect-only, browserLocalPersistence

```ts
setPersistence(auth, browserLocalPersistence);
await signInWithRedirect(auth, provider);
```

**Kết quả:** Vẫn thất bại. `browserLocalPersistence` chỉ fix được vấn đề IndexedDB → localStorage, nhưng storage partitioning của Safari vẫn chặn vì auth domain (`firebaseapp.com`) **khác origin** với app domain (`vercel.app`).

### ❌ Phương án 3: Chỉ dùng popup

**Kết quả:** Safari chặn popup + ITP chặn third-party cookies trong popup → không hoạt động.

### ✅ Phương án 4 (FINAL): Popup-first + Same-origin Auth Domain

**Chiến lược:**
1. **Popup-first**: Thử popup trước (dùng `postMessage` nội bộ, không bị cross-origin storage issue)
2. **Timeout 12 giây**: Nếu popup treo (COOP policy, in-app browser) → fallback redirect
3. **Auth domain = app domain**: `clicking-fast.vercel.app` → redirect handler chạy cùng origin
4. **Vercel proxy**: Rewrite `__/auth/*` → Firebase Hosting để handler hoạt động trên cùng domain

---

## 3. Cấu hình bắt buộc

### 3.1 Vercel — `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/__/auth/:path*",
      "destination": "https://games-2f526.firebaseapp.com/__/auth/:path*"
    }
  ]
}
```

> Proxy tất cả request `__/auth/*` từ Vercel domain sang Firebase Hosting. Browser chỉ thấy 1 origin duy nhất.

### 3.2 Vercel Dashboard — Environment Variables

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_AUTH_DOMAIN` | `clicking-fast.vercel.app` |

> **Quan trọng:** Phải set trong Vercel Dashboard (Settings → Environment Variables), không phải `.env.local` (chỉ dùng cho local dev). Sau khi set xong phải **Redeploy**.

### 3.3 Firebase Console

Authentication → Settings → Authorized domains → thêm:
- `clicking-fast.vercel.app`
- `games-2f526.firebaseapp.com` (cho local dev)
- `localhost`

### 3.4 Google Cloud Console (QUAN TRỌNG NHẤT)

APIs & Services → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs → thêm:

```
https://clicking-fast.vercel.app/__/auth/handler
https://games-2f526.firebaseapp.com/__/auth/handler
```

> Thiếu bước này → lỗi `redirect_uri_mismatch` (Error 400).

---

## 4. Code chuẩn

### 4.1 `src/lib/firebase/config.ts`

```ts
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Dùng localStorage thay vì IndexedDB — tương thích Safari ITP
setPersistence(auth, browserLocalPersistence);
```

### 4.2 `src/lib/firebase/auth.ts` — `loginWithGoogle()`

```ts
export const loginWithGoogle = async (): Promise<User | undefined> => {
  await auth.authStateReady();

  try {
    // 1. Thử popup trước (dùng postMessage, tránh cross-origin storage)
    const result = await Promise.race([
      signInWithPopup(auth, googleProvider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("POPUP_TIMEOUT")), 12000)
      ),
    ]);
    return result.user;
  } catch (error: any) {
    // 2. Popup fail → fallback redirect (cùng origin nhờ Vercel proxy)
    await signInWithRedirect(auth, googleProvider);
    return undefined;
  }
};
```

### 4.3 State preservation cho redirect

Vì redirect reload trang, cần lưu game state vào `sessionStorage` trước khi redirect:

```ts
// Trước khi gọi loginWithGoogle():
saveGameStateForRedirect("idle"); // hoặc "dead", "login"
if (gameState === "dead") {
  sessionStorage.setItem("auth_game_score", String(score));
}

// Trong useEffect on mount:
const restoredState = consumeRedirectGameState();
if (restoredState === "idle") setGameState("idle");
if (restoredState === "dead") { /* restore score + setGameState("dead") */ }
if (restoredState === "login" && user) setGameState("idle"); // auto-advance
```

---

## 5. Flow tổng thể

```
User click "Đăng nhập"
        │
        ▼
  saveGameStateForRedirect("...")
        │
        ▼
  auth.authStateReady()
        │
        ├─── Popup mở được? ─── YES ──▶ Google OAuth trong popup
        │         │                          │
        │         │                    postMessage về app
        │         │                          │
        │         │                    return result.user ✅
        │         │
        │         NO (bị chặn / timeout 12s)
        │         │
        │         ▼
        └──▶ signInWithRedirect()
                    │
              Redirect đến:
         clicking-fast.vercel.app/__/auth/handler
                    │
         Vercel proxy → Firebase Hosting
                    │
              Google OAuth page
                    │
              Redirect về:
         clicking-fast.vercel.app/__/auth/handler
                    │
              Handler xử lý kết quả
         (cùng origin → storage hoạt động ✅)
                    │
              Redirect về app
                    │
         getRedirectResult() → user
                    │
         consumeRedirectGameState()
                    │
         Restore game state ✅
```

---

## 6. Các lỗi thường gặp & fix

| Lỗi | Nguyên nhân | Fix |
|-----|------------|-----|
| `redirect_uri_mismatch` (400) | Google Cloud Console chưa authorize redirect URI | Thêm URI vào OAuth client (mục 3.4) |
| `missing initial state` | Cross-origin storage bị Safari ITP chặn | Đổi authDomain thành cùng origin với app + Vercel proxy (mục 3.1, 3.2) |
| `auth/popup-blocked` | Safari chặn popup | Fallback redirect (đã có trong code) |
| `auth/web-storage-unsupported` | Incognito/private mode | Hiển thị alert yêu cầu tắt ẩn danh |
| COOP policy block window.closed | Browser policy chặn popup communication | Timeout 12s → fallback redirect |
| Login xong vẫn thấy màn hình login | Redirect về không auto-advance | `consumeRedirectGameState()` check `restoredState === "login" && user` → auto set `idle` |

---

## 7. Checklist deploy

- [ ] `vercel.json` có rewrite `__/auth/:path*` → Firebase Hosting
- [ ] Vercel Dashboard env: `VITE_FIREBASE_AUTH_DOMAIN=clicking-fast.vercel.app`
- [ ] Đã Redeploy trên Vercel sau khi set env
- [ ] Firebase Console → Authorized domains: có `clicking-fast.vercel.app`
- [ ] Google Cloud Console → OAuth client → Redirect URIs: có `https://clicking-fast.vercel.app/__/auth/handler`
- [ ] Test trên Safari thật (không phải simulator)
- [ ] Test trên Safari Incognito
- [ ] Test trên Chrome (popup path)
- [ ] Test trên mobile Safari (iOS)
