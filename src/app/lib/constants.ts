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
  HOW_TO_PLAY: "Tap the sea creatures as they swim across the screen. Build combos for bonus points — but miss too many and it's game over!",

  // Buttons & Labels
  START_FISHING: "🎣 Start Fishing",
  SETTINGS: "⚙️ Settings",
  LEADERBOARD_BUTTON: "Leaderboard",
  PLAY_AGAIN: "PLAY AGAIN",
  BACK_TO_MENU: "← Menu",
  LOGIN_WITH_GOOGLE: "Đăng nhập bằng Google",
  LOGIN: "Đăng nhập",
  PLAY_AS_GUEST: "Chơi ngay không cần lưu điểm",
  LOGOUT: "Đăng xuất",
  CONFIRM: "Xác nhận",
  YES: "Yes",
  NO_RESUME: "No, Resume",
  BACK: "Back to Menu",

  // Settings
  SETTINGS_TITLE: "Settings",
  SETTINGS_SOUND: "Sound Effects",
  SETTINGS_MUSIC: "Music",
  SETTINGS_DIFFICULTY: "Difficulty",

  // HUD
  SCORE_LABEL: "Score",
  BEST_LABEL: "Best",
  COMBO_LABEL: "COMBO",
  TIME_LABEL: "Thời gian",

  // Game States
  GAME_OVER: "GAME OVER",
  FINAL_SCORE: "FINAL SCORE",
  NEW_BEST: "NEW BEST!",
  LOADING: "Loading Ocean...",
  PAUSE_TITLE: "Pause",
  PAUSE_MESSAGE: "Are you sure you want to quit to menu?",
  SAVING_SCORE: "Đang lưu điểm...",

  // Login Screen
  LOGIN_PROMPT: "Đăng nhập để lưu điểm số của bạn lên Bảng Xếp Hạng toàn cầu và thi tài cùng mọi người!",
  CONTINUE_AS: "Tiếp tục dưới tên",
  DEFAULT_NAME: "Bạn",

  // Guest Prompt
  GUEST_SCORE_HIGH: "Điểm của bạn rất cao!",
  GUEST_SCORE_LOGIN: "Đăng nhập ngay để ghi danh lên Bảng xếp hạng.",

  // Leaderboard
  LEADERBOARD_TITLE: "Bảng Xếp Hạng",
  LEADERBOARD_EMPTY: "Chưa có điểm nào. Hãy là người đầu tiên! 🎣",
  LEADERBOARD_LOAD_ERROR: "Không thể tải bảng xếp hạng.",
  LEADERBOARD_VIEW_TOP: "Xem Top 10 🏆",
  LEADERBOARD_COLLAPSE: "Thu gọn",
  LEADERBOARD_ANONYMOUS: "Anonymous",
  LEADERBOARD_YOU: "(bạn)",

  // Nickname
  NICKNAME_TITLE: "Đặt Nickname",
  NICKNAME_SUBTITLE: "Nickname sẽ hiển thị trên Bảng Xếp Hạng",
  NICKNAME_SAVE_ERROR: "Không thể lưu điểm. Thử lại sau.",
} as const;

export const NICKNAME_CONFIG = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 16,
  PLACEHOLDER: "Nhập nickname của bạn...",
  VALIDATION_MSG: "Nickname phải từ 2-16 ký tự",
} as const;
