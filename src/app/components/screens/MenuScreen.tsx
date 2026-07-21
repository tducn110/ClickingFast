import { Leaf, Play, Settings, Trophy } from "lucide-react";
import pandaMenuWave from "../../../assets/characters/panda_menu_wave.webp";
import { GAME_STRINGS, NICKNAME_CONFIG } from "../../lib/constants";

interface MenuScreenProps {
  onStartGame: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  nickname: string;
  bestScore: number;
  onNicknameChange: (value: string) => void;
}

export function MenuScreen({
  onStartGame,
  onLeaderboard,
  onSettings,
  nickname,
  bestScore,
  onNicknameChange,
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

          <label className="mainMenuStatCard mainMenuNicknameCard">
            <span className="mainMenuStatLabel mainMenuNicknameLabel">
              {GAME_STRINGS.MENU_NICKNAME}
              <Leaf aria-hidden="true" />
            </span>
            <input
              type="text"
              value={nickname}
              maxLength={NICKNAME_CONFIG.MAX_LENGTH}
              placeholder={NICKNAME_CONFIG.PLACEHOLDER}
              autoComplete="nickname"
              onChange={(event) => onNicknameChange(event.target.value)}
              className="mainMenuNicknameInput"
            />
          </label>
        </section>

        <p className="mainMenuGreeting">
          <Leaf aria-hidden="true" />
          <span>Xin chào, sẵn sàng vào mùa vụ chưa?</span>
          <Leaf aria-hidden="true" />
        </p>

        <button type="button" className="mainMenuPlayButton" onClick={onStartGame}>
          <span className="mainMenuPlayIcon" aria-hidden="true">
            <Play />
          </span>
          <span>{GAME_STRINGS.START_FISHING}</span>
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
