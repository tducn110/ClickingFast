import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LANGUAGE_STORAGE_KEY = "fruit-slashing-language";
type SupportedLanguage = "vi" | "en";
const isSupportedLanguage = (value: string | null): value is SupportedLanguage => value === "vi" || value === "en";
const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") return "en";
  try { const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY); return isSupportedLanguage(value) ? value : "en"; } catch { return "en"; }
};
const persistLanguage = (language: string): void => {
  const normalized = language.split("-")[0];
  if (typeof window === "undefined" || !isSupportedLanguage(normalized)) return;
  try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized); } catch { /* Optional persistence. */ }
};

const resources = {
  vi: {
    translation: {
      common: {
        play: "Chơi",
        pause: "Tạm dừng",
        resume: "Tiếp tục",
        back: "Quay lại",
        close: "Đóng",
        retry: "Chơi lại",
        loading: "Đang tải...",
        on: "Bật",
        off: "Tắt",
      },
      menu: {
        studioBadge: "Papa Studio 2026",
        titleLine1: "Bộ Lạc",
        titleLine2: "Đậu Phộng",
        tagline: "Thu hoạch trái cây, giữ nhịp combo!",
        bestScore: "Điểm cao nhất",
        greeting: "Xin chào, sẵn sàng vào mùa vụ chưa?",
        mascotAlt: "Gấu trúc đeo khăn đỏ đang vẫy tay",
        playNow: "Chơi ngay",
        leaderboard: "Bảng vàng",
        settings: "Cài đặt",
        connecting: "Đang kết nối...",
        errorPrefix: "Lỗi kết nối:",
      },
      gameplay: {
        score: "Điểm số",
        combo: "Combo",
        order: "Mục tiêu hiện tại",
        orderLabel: "Mục tiêu",
        orderIncoming: "Đơn mới đang tới",
        lives: "Lượt",
        pause: "Tạm dừng",
        slowTime: "Làm chậm",
        openFailed: "Không mở được màn chơi",
        retry: "Thử lại",
      },
      items: {
        mango: "Xoài",
        strawberry: "Dâu",
        apple: "Táo",
        pear: "Lê",
        guava: "Ổi",
      },
      pause: {
        title: "Tạm Dừng",
        message: "Nghỉ một chút nhé!",
        resume: "Tiếp Tục",
        exit: "Về Làng",
        soundSettings: "Tùy chọn âm thanh",
      },
      revive: {
        kicker: "Cơ hội cuối",
        title: "Tiếp tục mùa vụ?",
        message: "Hồi đầy 5 tim và tiếp tục ngay. Mỗi lượt chỉ dùng một lần.",
        ready: "Sẵn sàng trở lại",
        keepScore: "Giữ nguyên điểm hiện tại",
        revive: "Hồi sinh",
        finishRun: "Kết thúc lượt",
        hearts: "Hồi đầy 5 tim",
        lifeCount: "tim",
        watchAd: "Xem quảng cáo để hồi sinh",
      },
      gameover: {
        kicker: "Mùa vụ",
        title: "Kết thúc",
        finalScore: "Điểm cuối",
        harvestTitle: "Nông sản đã thu hoạch",
        noHarvest: "Chưa thu hoạch được nông sản nào.",
        replay: "Chơi lại",
        double: "X2",
        doubled: "Đã X2",
        failure: {
          hazard: "Bạn chạm phải chướng ngại vật.",
          "order-timeout": "Đơn hàng đã hết giờ.",
          "missed-target": "Bạn đã để mục tiêu rơi mất.",
        },
      },
      leaderboard: {
        title: "Bảng Xếp Hạng",
        best: "Kỷ lục của bạn",
        score: "Điểm",
        goal: "Mục tiêu",
        goalWin: "Giữ vững top 1",
        goalCatchup: "Vượt top 1",
        hint: "Bạn có thể làm được!",
        rank: "Hạng",
        player: "Người chơi",
        top10: "Top 10 người chơi, có thể cuộn",
        yourPosition: "Vị trí của bạn",
        back: "Quay lại",
        currentPlayer: "Bạn",
        noScore: "Chưa có",
      },
      settings: {
        title: "Cài đặt",
        language: "Ngôn ngữ",
        music: "Nhạc nền",
        sfx: "Hiệu ứng âm thanh",
        soundOptions: "Tùy chọn âm thanh",
        on: "Bật",
        off: "Tắt",
        languageNames: {
          vi: "VI",
          en: "EN",
        },
      },
    },
  },
  en: {
    translation: {
      common: {
        play: "Play",
        pause: "Pause",
        resume: "Resume",
        back: "Back",
        close: "Close",
        retry: "Play again",
        loading: "Loading...",
        on: "On",
        off: "Off",
      },
      menu: {
        studioBadge: "Papa Studio 2026",
        titleLine1: "Peanut",
        titleLine2: "Tribe",
        tagline: "Harvest fruit, keep the combo rhythm!",
        bestScore: "Best score",
        greeting: "Hello, ready for harvest?",
        mascotAlt: "Panda wearing a red scarf and waving",
        playNow: "Play now",
        leaderboard: "Leaderboard",
        settings: "Settings",
        connecting: "Connecting...",
        errorPrefix: "Connection error:",
      },
      gameplay: {
        score: "Score",
        combo: "Combo",
        order: "Current target",
        orderLabel: "Target",
        orderIncoming: "New order is coming",
        lives: "Lives",
        pause: "Pause",
        slowTime: "Slow time",
        openFailed: "Unable to open the game",
        retry: "Retry",
      },
      items: {
        mango: "Mango",
        strawberry: "Strawberry",
        apple: "Apple",
        pear: "Pear",
        guava: "Guava",
      },
      pause: {
        title: "Pause",
        message: "Take a short break!",
        resume: "Resume",
        exit: "Back to village",
        soundSettings: "Sound options",
      },
      revive: {
        kicker: "Last chance",
        title: "Continue the harvest?",
        message: "Refill 5 lives and continue right away. One use per run.",
        ready: "Ready to return",
        keepScore: "Keep current score",
        revive: "Revive",
        finishRun: "End run",
        hearts: "Refill 5 lives",
        lifeCount: "lives",
        watchAd: "Watch an ad to revive",
      },
      gameover: {
        kicker: "Harvest season",
        title: "Game over",
        finalScore: "Final score",
        harvestTitle: "Harvested produce",
        noHarvest: "No produce harvested yet.",
        replay: "Replay",
        double: "x2",
        doubled: "x2 applied",
        failure: {
          hazard: "You hit a hazard.",
          "order-timeout": "The order timer ran out.",
          "missed-target": "A required target was missed.",
        },
      },
      leaderboard: {
        title: "Leaderboard",
        best: "Your best",
        score: "Score",
        goal: "Goal",
        goalWin: "Keep top 1",
        goalCatchup: "Reach top 1",
        hint: "You can do it!",
        rank: "Rank",
        player: "Player",
        top10: "Top 10 players, scroll to browse",
        yourPosition: "Your position",
        back: "Back",
        currentPlayer: "You",
        noScore: "No score yet",
      },
      settings: {
        title: "Settings",
        language: "Language",
        music: "Background music",
        sfx: "Sound effects",
        soundOptions: "Sound options",
        on: "On",
        off: "Off",
        languageNames: {
          vi: "VI",
          en: "EN",
        },
      },
    },
  },
} as const;

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    supportedLngs: ["vi", "en"],
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
i18n.on("languageChanged", persistLanguage);

export default i18n;
