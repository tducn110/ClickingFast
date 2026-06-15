# Plan 10: Refactor — Reusable Components, Hooks & Remove All Hardcode

## Goal
Tái cấu trúc codebase để bọc toàn bộ Firebase API calls và UI state vào các custom hooks và reusable components chuẩn. Xóa tất cả hardcode, inline logic, và string literal trong component. Toàn bộ code phải dễ tái sử dụng, dễ bảo trì.

## Design Decisions (Đã xác nhận với user)

| Câu hỏi | Quyết định |
|---------|-----------|
| Leaderboard hiển thị ở đâu? | **Chỉ ở màn hình Game Over** |
| Lưu điểm khi nào? | **Tự động lưu ngay khi game over** (nếu đã login, score > 0) |
| Tên hiển thị trên leaderboard? | **Nickname do người chơi tự nhập** lần đầu tiên |
| Giữ bao nhiêu điểm/user? | **1 điểm cao nhất (High Score)** — logic đã có sẵn trong `db.ts` |

---

## Phân tích Codebase Hiện Tại

### Những gì đã có sẵn (KHÔNG viết lại)
- `src/lib/firebase/auth.ts`: `useAuth()` hook, `loginWithGoogle()`, `logout()` ✅
- `src/lib/firebase/db.ts`: `saveUserScore()`, `getLeaderboard()` ✅
- `src/app/lib/SettingsContext.tsx`: `useSettings()`, `SettingsProvider` ✅
- `src/app/components/ui/button.tsx`: Shadcn Button base ✅
- `src/app/components/ui/dialog.tsx`, `switch.tsx`, `select.tsx`, v.v. ✅

### Vấn đề cần giải quyết
1. **`OceanGame.tsx` quá phình to (427 dòng):** Chứa quá nhiều logic lẫn UI inline — cần tách ra.
2. **Chưa có nickname flow:** Khi game over, nếu user chưa có nickname, cần nhập trước khi lưu.
3. **Leaderboard inline trong `OceanGame.tsx`:** Cần tách thành component riêng.
4. **Toàn bộ số magic, string hardcode** cần chuyển vào constants/config.
5. **`useAuth` đang nằm trong `auth.ts`** (không chuẩn) — nên chuyển vào `AuthContext.tsx` để cung cấp toàn app qua Provider.

---

## Proposed Changes (Thứ tự thực hiện)

### Step 1 — Tạo AuthContext (bọc useAuth thành Provider)

#### [NEW] `src/app/lib/AuthContext.tsx`
- Export `AuthProvider` và `useAuth()` hook chuẩn.
- Lấy logic từ `src/lib/firebase/auth.ts` (giữ nguyên raw functions ở đó, chỉ bọc context).
- Cung cấp: `{ user, loading }` cho toàn app.

#### [MODIFY] `src/main.tsx`
- Bọc app trong `<AuthProvider>` (ngoài `<SettingsProvider>`).

#### [MODIFY] `src/app/components/OceanGame.tsx`
- Thay import `useAuth` từ `../../lib/firebase/auth` → từ `../lib/AuthContext`.

---

### Step 2 — Tạo Constants File (xóa hardcode)

#### [NEW] `src/app/lib/constants.ts`
```ts
export const LEADERBOARD_LIMIT = 5;
export const LOCAL_STORAGE_KEYS = {
  BEST_SCORE: "deepTapBest",
  SOUND: "deepTapSound",
  MUSIC: "deepTapMusic",
  DIFFICULTY: "deepTapDifficulty",
  NICKNAME: "deepTapNickname",
};
export const MAX_MISSES = 5; // hoặc lấy từ game engine
```

---

### Step 3 — Tạo Custom Hooks

#### [NEW] `src/app/hooks/useLeaderboard.ts`
```ts
// Bọc getLeaderboard() với loading/error state
// interface: { data: ScoreRecord[], loading: boolean, error: string | null, refresh: () => void }
```

#### [NEW] `src/app/hooks/useScoreSubmit.ts`
```ts
// Bọc saveUserScore() với loading/error state
// Tích hợp nickname: check localStorage trước, nếu chưa có → trigger nickname dialog
// interface: { submit: (score, playtime) => Promise<void>, isLoading, isSuccess, error }
```

---

### Step 4 — Tạo Reusable Components

#### [NEW] `src/app/components/GameButton.tsx`
- Wrapper chuẩn over Shadcn `Button`.
- Variants: `primary` | `secondary` | `ghost` | `danger`.
- Props: `loading`, `icon`, `fullWidth`.
- Tích hợp `active:scale-95` animation.

#### [NEW] `src/app/components/NicknameDialog.tsx`
- Dialog yêu cầu nhập nickname lần đầu tiên (khi user chưa có nickname trong localStorage).
- Validate: 3-16 ký tự, không có ký tự đặc biệt.
- Lưu nickname vào `localStorage` với key `deepTapNickname`.
- Props: `open`, `onConfirm(nickname: string)`.

#### [NEW] `src/app/components/LeaderboardTable.tsx`
- Dùng `useLeaderboard()` hook.
- Hiển thị: rank, avatar (chữ cái đầu), nickname, score.
- Loading skeleton, error state, empty state.
- Highlight row nếu `userId === currentUser.uid`.

---

### Step 5 — Refactor OceanGame.tsx (Game Over Screen)

#### [MODIFY] `src/app/components/OceanGame.tsx`
Thay thế toàn bộ inline game over logic bằng các components đã tạo:

```tsx
// Trước (inline):
if (user && score > 0) {
  saveUserScore(user.uid, user.displayName || "Unknown", score, playtime)
    .then(() => getLeaderboard(5).then(setLeaderboard))...
}

// Sau (reusable):
const { submit: submitScore, isLoading: savingScore } = useScoreSubmit();
const { data: leaderboard, refresh: refreshLeaderboard } = useLeaderboard(LEADERBOARD_LIMIT);

// Khi game over → tự động submit → sau đó refresh leaderboard
```

Game Over UI:
```tsx
{gameState === "dead" && (
  <GameOverScreen
    score={score}
    bestScore={bestScore}
    isNewBest={newBest}
    isSaving={savingScore}
    leaderboard={leaderboard}
    onPlayAgain={startGame}
    onBackToMenu={handleMenuClick}
  />
)}
```

#### [NEW] `src/app/components/GameOverScreen.tsx` (optional — tách ra cho gọn)
- Nhận props thay vì đọc state trực tiếp.
- Chứa: score display, new best badge, `<LeaderboardTable />`, Play Again / Back to Menu buttons.

---

### Step 6 — Cleanup & Verify

- Xóa toàn bộ hardcoded string/number còn lại, thay bằng constants.
- Chạy `npm run build` để đảm bảo không có lỗi TypeScript.
- Kiểm tra lại: nickname dialog, auto-save score, leaderboard hiển thị sau game over.

---

## Verification Plan

### Automated
```bash
npm run build
```

### Manual Test Cases
1. Chơi hết game khi **chưa login** → không lưu điểm, không hiện leaderboard.
2. Chơi hết game khi **đã login lần đầu** → hiện `NicknameDialog` → nhập nickname → tự động lưu → leaderboard refresh.
3. Chơi hết game khi **đã có nickname** → tự động lưu luôn, không hỏi lại.
4. Điểm mới **thấp hơn High Score** → không ghi đè trên Firestore (logic đã có trong `db.ts`).

---

## File Summary

| File | Action | Mô tả |
|------|--------|-------|
| `src/app/lib/AuthContext.tsx` | NEW | Provider bọc useAuth |
| `src/app/lib/constants.ts` | NEW | Toàn bộ constants/magic numbers |
| `src/app/hooks/useLeaderboard.ts` | NEW | Hook fetch leaderboard |
| `src/app/hooks/useScoreSubmit.ts` | NEW | Hook submit score + nickname logic |
| `src/app/components/GameButton.tsx` | NEW | Reusable game button |
| `src/app/components/NicknameDialog.tsx` | NEW | Dialog nhập nickname lần đầu |
| `src/app/components/LeaderboardTable.tsx` | NEW | Bảng xếp hạng |
| `src/app/components/GameOverScreen.tsx` | NEW | Màn hình game over tách riêng |
| `src/app/components/OceanGame.tsx` | MODIFY | Refactor dùng hooks/components mới |
| `src/main.tsx` | MODIFY | Bọc AuthProvider |
