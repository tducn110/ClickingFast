// Constants — single source of truth, không hardcode rải rác trong component
export const LEADERBOARD_PREVIEW_LIMIT = 5;
export const LEADERBOARD_FULL_LIMIT = 10;

export const LOCAL_STORAGE_KEYS = {
  BEST_SCORE: "peanutTribeBest",
  SOUND: "peanutTribeSound",
  MUSIC: "peanutTribeMusic",
  DIFFICULTY: "peanutTribeDifficulty",
  NICKNAME: "peanutTribeNickname",
} as const;

export const GAME_STRINGS = {
  APP_NAME: "Bộ Lạc Đậu Phộng",
  TAGLINE: "Hành trình ngược về tuổi thơ — bắt trái cây cùng Lạc Lạc!",
  HOW_TO_PLAY: "Trái cây rơi từ trời — chạm tay để bắt. Combo càng cao điểm càng lớn. Đừng để rơi quá 5 quả!",

  // Buttons & Labels
  START_FISHING: "🥜 Vào Game",
  SETTINGS: "⚙️ Cài Đặt",
  LEADERBOARD_BUTTON: "🏆 Bảng Vàng",
  PLAY_AGAIN: "CHƠI LẠI",
  BACK_TO_MENU: "← Về Làng",
  LOGIN_WITH_GOOGLE: "Đăng nhập Google",
  LOGIN: "Đăng nhập",
  PLAY_AS_GUEST: "Chơi ngay",
  LOGOUT: "Đăng xuất",
  CONFIRM: "Xác nhận",
  YES: "Dạ",
  NO_RESUME: "Không, Chơi Tiếp",
  BACK: "Về Trang Chính",

  // Settings
  SETTINGS_TITLE: "Cài Đặt",
  SETTINGS_SOUND: "Âm Thanh",
  SETTINGS_MUSIC: "Nhạc Nền",
  SETTINGS_DIFFICULTY: "Độ Khó",

  // HUD
  SCORE_LABEL: "Điểm",
  BEST_LABEL: "Kỷ Lục",
  COMBO_LABEL: "COMBO",
  TIME_LABEL: "Thời gian",

  // Game States
  GAME_OVER: "HẾT LƯỢT",
  FINAL_SCORE: "ĐIỂM CUỐI",
  NEW_BEST: "KỶ LỤC MỚI!",
  LOADING: "Đang tải làng quê...",
  PAUSE_TITLE: "Tạm Dừng",
  PAUSE_MESSAGE: "Về lại làng hả?",
  SAVING_SCORE: "Đang lưu điểm...",

  // Login Screen
  LOGIN_PROMPT: "Đăng nhập để lưu điểm lên Bảng Xếp Hạng, thi tài cùng bà con!",
  CONTINUE_AS: "Tiếp tục với",
  DEFAULT_NAME: "Bạn",

  // Guest Prompt
  GUEST_SCORE_HIGH: "Điểm cao quá!",
  GUEST_SCORE_LOGIN: "Đăng nhập để ghi danh lên Bảng Xếp Hạng nha.",

  // Leaderboard
  LEADERBOARD_TITLE: "Bảng Xếp Hạng",
  LEADERBOARD_EMPTY: "Chưa có ai. Vào chơi đi! 🥜",
  LEADERBOARD_LOAD_ERROR: "Không tải được bảng xếp hạng.",
  LEADERBOARD_VIEW_TOP: "Xem Top 10 🏆",
  LEADERBOARD_COLLAPSE: "Thu gọn",
  LEADERBOARD_ANONYMOUS: "Ẩn Danh",
  LEADERBOARD_YOU: "(bạn)",

  // Nickname
  NICKNAME_TITLE: "Đặt Biệt Danh",
  NICKNAME_SUBTITLE: "Tên sẽ hiện trên Bảng Xếp Hạng",
  NICKNAME_SAVE_ERROR: "Không lưu được điểm.",
} as const;

export const NICKNAME_CONFIG = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 16,
  PLACEHOLDER: "Nhập nickname của bạn...",
  VALIDATION_MSG: "Nickname phải từ 2-16 ký tự",
} as const;
