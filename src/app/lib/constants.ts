// Constants — single source of truth, không hardcode rải rác trong component
export const LEADERBOARD_PREVIEW_LIMIT = 5;
export const LEADERBOARD_FULL_LIMIT = 10;

export const LOCAL_STORAGE_KEYS = {
  BEST_SCORE: "deepTapBest",
  SOUND: "deepTapSound",
  MUSIC: "deepTapMusic",
  DIFFICULTY: "deepTapDifficulty",
  NICKNAME: "deepTapNickname",
} as const;

export const GAME_STRINGS = {
  APP_NAME: "Ocean Tap",
  TAGLINE: "Tap the sea creatures before they disappear.",
  LEADERBOARD_TITLE: "Bảng Xếp Hạng",
  LEADERBOARD_UPDATED: "Bảng Xếp Hạng (Mới cập nhật)",
  GAME_OVER: "GAME OVER",
  FINAL_SCORE: "FINAL SCORE",
  NEW_BEST: "NEW BEST!",
  START_FISHING: "START FISHING",
  PLAY_AGAIN: "PLAY AGAIN",
  BACK_TO_MENU: "← Menu",
  LOGIN_WITH_GOOGLE: "Đăng nhập bằng Google",
  PLAY_AS_GUEST: "Chơi ngay không cần lưu điểm",
  LOGOUT: "Đăng xuất",
  LOADING: "Loading Ocean...",
  VIEW_TOP_10: "Xem Top 10 🏆",
  CLOSE: "Đóng",
} as const;

export const NICKNAME_CONFIG = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 16,
  PLACEHOLDER: "Nhập nickname của bạn...",
  VALIDATION_MSG: "Nickname phải từ 2-16 ký tự",
} as const;
