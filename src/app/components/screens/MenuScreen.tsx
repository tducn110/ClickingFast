import { Leaf, Play, Settings, Trophy } from "lucide-react";
import pandaMenuWave from "../../../assets/characters/panda_menu_wave.webp";
import i18n from "../../../i18n";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const numberLocale = i18n.resolvedLanguage === "en" ? "en-US" : "vi-VN";

  return (
    <div className="mainMenuScreen game-shell-background">
      <main className="mainMenuPanel" aria-labelledby="main-menu-title">
        <div className="mainMenuStudioBadge">
          <Leaf aria-hidden="true" />
          <span>{t("menu.studioBadge")}</span>
          <Leaf aria-hidden="true" />
        </div>

        <section className="mainMenuHero" aria-label={`${t("menu.titleLine1")} ${t("menu.titleLine2")}`}>
          <img
            className="mainMenuPanda"
            src={pandaMenuWave}
            alt={t("menu.mascotAlt")}
            draggable="false"
          />

          <h1 id="main-menu-title" className="mainMenuLogo" aria-label={`${t("menu.titleLine1")} ${t("menu.titleLine2")}`}>
            <span className="mainMenuLogoLine mainMenuLogoLineGreen" aria-hidden="true">
              {t("menu.titleLine1")}
            </span>
            <span className="mainMenuLogoLine mainMenuLogoLineOrange" aria-hidden="true">
              {t("menu.titleLine2")}
            </span>
          </h1>

          <p className="mainMenuTagline">
            <Leaf aria-hidden="true" />
            <span>{t("menu.tagline")}</span>
            <Leaf aria-hidden="true" />
          </p>
        </section>

        <section className="mainMenuStats" aria-label={t("menu.bestScore")}>
          <div className="mainMenuStatCard mainMenuScoreCard">
            <div className="mainMenuStatLabel">
              <Trophy aria-hidden="true" />
              <span>{t("menu.bestScore")}</span>
            </div>
            <strong className="mainMenuBestScore">
              {bestScore.toLocaleString(numberLocale)}
            </strong>
          </div>
        </section>

        <p className="mainMenuGreeting">
          <Leaf aria-hidden="true" />
          <span>{t("menu.greeting")}</span>
          <Leaf aria-hidden="true" />
        </p>

        {errorMessage && (
          <p className="text-red-500 text-sm font-bold mt-2 mb-2 text-center bg-red-100 p-2 rounded">
            {t("menu.errorPrefix")} {errorMessage}
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
          <span>{isConnecting ? t("menu.connecting") : t("menu.playNow")}</span>
        </button>

        <div className="mainMenuSecondaryActions">
          <button type="button" className="mainMenuSecondaryButton" onClick={onLeaderboard}>
            <Trophy aria-hidden="true" />
            <span>{t("menu.leaderboard")}</span>
          </button>
          <button type="button" className="mainMenuSecondaryButton" onClick={onSettings}>
            <Settings aria-hidden="true" />
            <span>{t("menu.settings")}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
