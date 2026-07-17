import { Flag, HeartPulse } from "lucide-react";
import { GAME_STRINGS } from "../../lib/constants";
import pandaAgainUrl from "../../../assets/characters/panda_again.png";
import rewardVideoUrl from "../../../assets/ui/reward_video.png";
import { MAX_MISSES } from "../game/constants";
import { GameButton } from "../ui/GameButton";

interface ReviveScreenProps {
  onSkip: () => void;
  onWatchAd: () => void;
}

export function ReviveScreen({ onSkip, onWatchAd }: ReviveScreenProps) {
  return (
    <div className="endGameBackdrop reviveBackdrop">
      <main
        className="endGamePanel revivePanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revive-title"
      >
        <div className="reviveShell">
          <header className="endGameHeader reviveHeader">
            <h2 id="revive-title" className="endGameTitle reviveTitle">
              <span className="endGameTitleKicker reviveTitleKicker">
                Cơ hội cuối
              </span>
              <span className="endGameTitleMain reviveTitleMain">
                <HeartPulse aria-hidden="true" />
                <span>{GAME_STRINGS.REVIVE_TITLE}</span>
                <HeartPulse className="reviveTitleIconRight" aria-hidden="true" />
              </span>
            </h2>
            <p className="reviveMessage">{GAME_STRINGS.REVIVE_MESSAGE}</p>
          </header>

          <div className="reviveBody">
            <figure className="reviveMascot">
              <img
                className="reviveMascotImage"
                src={pandaAgainUrl}
                alt="Gấu trúc sẵn sàng trở lại vườn"
                draggable={false}
              />
            </figure>

            <section className="reviveLifeOffer" aria-label="Hồi đầy 5 tim">
              <span className="reviveLifeLabel">Sẵn sàng trở lại</span>
              <div className="reviveHeartRow" aria-hidden="true">
                {Array.from({ length: MAX_MISSES }).map((_, index) => (
                  <img
                    key={index}
                    src="/assets/items/heart.png"
                    alt=""
                    draggable={false}
                  />
                ))}
              </div>
              <strong className="reviveLifeValue">{MAX_MISSES} / {MAX_MISSES} tim</strong>
              <span className="reviveLifeNote">Giữ nguyên điểm hiện tại</span>
            </section>
          </div>

          <div className="endGameActions reviveActions">
            <GameButton
              variant="primary"
              size="lg"
              fullWidth
              className="endGameDoubleButton revivePrimaryButton"
              aria-label={`${GAME_STRINGS.WATCH_AD} để hồi sinh`}
              icon={
                <img
                  className="rewardVideoButtonIcon reviveRewardIcon"
                  src={rewardVideoUrl}
                  alt=""
                  draggable={false}
                />
              }
              onClick={onWatchAd}
            >
              Hồi sinh
            </GameButton>

            <GameButton
              variant="ghost"
              size="lg"
              fullWidth
              className="endGameReplayButton reviveSkipButton"
              icon={<Flag size={23} strokeWidth={2.8} aria-hidden="true" />}
              onClick={onSkip}
            >
              Kết thúc lượt
            </GameButton>
          </div>
        </div>
      </main>
    </div>
  );
}
