// Constants — single source of truth, không hardcode rải rác trong component
export const LEADERBOARD_PREVIEW_LIMIT = 5;
export const LEADERBOARD_FULL_LIMIT = 50;

export const LOCAL_STORAGE_KEYS = {
  BEST_SCORE: "peanutTribeBest",
  SOUND: "peanutTribeSound",
  MUSIC: "peanutTribeMusic",
  NICKNAME: "peanutTribeNickname",
  LEADERBOARD: "peanutTribeLeaderboard",
} as const;

export const LEGACY_LOCAL_STORAGE_KEYS = {
  SOUND: "deepTapSound",
  MUSIC: "deepTapMusic",
  LEADERBOARD: "ocean_leaderboard",
  PLAYER_NAME: "playerName",
} as const;

export const GAME_STRINGS = {
  APP_NAME: "Bộ Lạc Đậu Phộng",
  TAGLINE: "Thu hoạch trái cây, giữ nhịp combo!",
  HOW_TO_PLAY: "Chạm thật nhanh để bắt đúng nông sản đang được gọi. Hụt đủ 5 lần là hết tim.",

  // Buttons & Labels
  START_FISHING: "Chơi ngay",
  SETTINGS: "Cài Đặt",
  LEADERBOARD_BUTTON: "Bảng Vàng",
  PLAY_AGAIN: "CHƠI LẠI",
  BACK_TO_MENU: "Về Làng",
  CONFIRM: "Xác nhận",
  YES: "Về Làng",
  NO_RESUME: "Quay Lại",
  BACK: "Về Trang Chính",
  WATCH_AD: "Xem quảng cáo",
  SKIP: "Bỏ qua",
  APPLY_X2: "X2",

  // Settings
  SETTINGS_TITLE: "Cài Đặt",
  SETTINGS_SOUND: "Âm Thanh",
  SETTINGS_MUSIC: "Nhạc Nền",

  // HUD
  SCORE_LABEL: "Điểm",
  BEST_LABEL: "Kỷ Lục",
  COMBO_LABEL: "COMBO",
  TIME_LABEL: "Thời gian",
  SHIELD_LABEL: "Khiên",
  SLOW_TIME_LABEL: "Chậm",

  // Game States
  GAME_OVER: "HẾT LƯỢT",
  FINAL_SCORE: "ĐIỂM CUỐI",
  NEW_BEST: "KỶ LỤC MỚI!",
  LOADING: "Đang tải làng quê...",
  PAUSE_TITLE: "Tạm Dừng",
  PAUSE_MESSAGE: "Về lại làng hả?",
  SAVING_SCORE: "Đang lưu điểm...",
  REVIVE_TITLE: "Còn muốn tiếp tục?",
  REVIVE_MESSAGE: "Xem một quảng cáo để hồi sinh lại đúng 1 lần.",
  AD_TITLE: "Quảng cáo thưởng",
  AD_MESSAGE: "Giữ màn hình mở tới khi thanh chạy xong để hồi sinh.",
  X2_TITLE: "Nhân đôi điểm?",
  X2_MESSAGE: "Lần thua này có thể chốt x2 trước khi vào bảng điểm.",
  LEADERBOARD_SAVED: "Điểm đã được lưu vào bảng vàng.",
  CURRENT_SCORE: "Điểm hiện tại",

  // Menu
  MENU_NICKNAME: "Biệt danh",
  MENU_NICKNAME_HINT: "Để trống sẽ lưu là Khách",

  // Leaderboard
  LEADERBOARD_TITLE: "Bảng Xếp Hạng",
  LEADERBOARD_EMPTY: "Chưa có ai. Vào chơi đi!",
  LEADERBOARD_LOAD_ERROR: "Không tải được bảng xếp hạng.",
  LEADERBOARD_ANONYMOUS: "Khách",
  LEADERBOARD_YOU: "Bạn",
} as const;

export const NICKNAME_CONFIG = {
  MIN_LENGTH: 0,
  MAX_LENGTH: 16,
  PLACEHOLDER: "Khách",
  VALIDATION_MSG: "Nickname tối đa 16 ký tự",
} as const;
