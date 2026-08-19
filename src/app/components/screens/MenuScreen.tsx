import { Leaf, Play, Settings, Trophy } from "lucide-react";
import pandaMenuWave from "../../../assets/characters/panda_menu_wave.webp";
import { GAME_STRINGS, NICKNAME_CONFIG } from "../../lib/constants";

interface MenuScreenProps {
  onStartGame: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  bestScore: number;
  isConnecting?: boolean;
  errorMessage?: string | null;
}

export function MenuScreen({
  onStartGame,
  onLeaderboard,
  onSettings,
  bestScore,
  isConnecting,
  errorMessage,
}: MenuScreenProps) {
  return (
    <div className="mainMenuScreen game-shell-background">
      <main className="mainMenuPanel" aria-labelledby="main-menu-title">
        <div className="mainMenuStudioBadge">
          <Leaf aria-hidden="true" />
          <span>Papa Studio 2026</span>
          <Leaf aria-hidden="true" />
        </div>

        <section className="mainMenuHero" aria-label={GAME_STRINGS.APP_NAME}>
          <img
            className="mainMenuPanda"
            src={pandaMenuWave}
            alt="Gấu trúc đeo khăn đỏ đang vẫy tay"
            draggable="false"
          />

          <h1 id="main-menu-title" className="mainMenuLogo" aria-label={GAME_STRINGS.APP_NAME}>
            <span className="mainMenuLogoLine mainMenuLogoLineGreen" aria-hidden="true">
              Bộ Lạc
            </span>
            <span className="mainMenuLogoLine mainMenuLogoLineOrange" aria-hidden="true">
              Đậu Phộng
            </span>
          </h1>

          <p className="mainMenuTagline">
            <Leaf aria-hidden="true" />
            <span>{GAME_STRINGS.TAGLINE}</span>
            <Leaf aria-hidden="true" />
          </p>
        </section>

        <section className="mainMenuStats" aria-label="Thông tin người chơi">
          <div className="mainMenuStatCard mainMenuScoreCard">
            <div className="mainMenuStatLabel">
              <Trophy aria-hidden="true" />
              <span>Điểm cao nhất</span>
            </div>
            <strong className="mainMenuBestScore">
              {bestScore.toLocaleString("vi-VN")}
            </strong>
          </div>
        </section>

        <p className="mainMenuGreeting">
          <Leaf aria-hidden="true" />
          <span>Xin chào, sẵn sàng vào mùa vụ chưa?</span>
          <Leaf aria-hidden="true" />
        </p>

        {errorMessage && (
          <p className="text-red-500 text-sm font-bold mt-2 mb-2 text-center bg-red-100 p-2 rounded">
            Lỗi kết nối: {errorMessage}
          </p>
        )}

        <button 
          type="button" 
          className="mainMenuPlayButton" 
          onClick={onStartGame}
          disabled={isConnecting || !!errorMessage}
          style={{ opacity: (isConnecting || errorMessage) ? 0.5 : 1 }}
        >
          <span className="mainMenuPlayIcon" aria-hidden="true">
            <Play />
          </span>
          <span>{isConnecting ? "Đang kết nối..." : GAME_STRINGS.START_FISHING}</span>
        </button>

        <div className="mainMenuSecondaryActions">
          <button type="button" className="mainMenuSecondaryButton" onClick={onLeaderboard}>
            <Trophy aria-hidden="true" />
            <span>Bảng vàng</span>
          </button>
          <button type="button" className="mainMenuSecondaryButton" onClick={onSettings}>
            <Settings aria-hidden="true" />
            <span>Cài đặt</span>
          </button>
        </div>
      </main>
    </div>
  );
}
