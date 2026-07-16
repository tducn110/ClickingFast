import { GAME_STRINGS } from "../../lib/constants";
import pandaAgainUrl from "../../../assets/characters/panda_again.png";
import rewardVideoUrl from "../../../assets/ui/reward_video.png";
import { GameButton } from "../ui/GameButton";

interface ReviveScreenProps {
  onSkip: () => void;
  onWatchAd: () => void;
}

export function ReviveScreen({ onSkip, onWatchAd }: ReviveScreenProps) {
  return (
    <div className="gameOverOverlay">
      <div className="revivePresentation">
        <div className="revivePandaCrop" aria-hidden="true">
          <img
            className="revivePandaImage"
            src={pandaAgainUrl}
            alt=""
            draggable={false}
          />
        </div>

        <div
          className="gameOverCard reviveOfferCard"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revive-title"
        >
          <div className="gameOverKicker">Chưa hết cơ hội</div>
          <h2 id="revive-title" className="gameOverTitle">
            {GAME_STRINGS.REVIVE_TITLE}
          </h2>
          <p className="gameOverMessage">{GAME_STRINGS.REVIVE_MESSAGE}</p>

          <div className="gameOverChoiceRow">
            <GameButton variant="ghost" size="md" fullWidth onClick={onSkip}>
              {GAME_STRINGS.SKIP}
            </GameButton>
            <GameButton
              variant="primary"
              size="md"
              fullWidth
              className="rewardVideoActionButton reviveRewardVideoActionButton"
              aria-label={GAME_STRINGS.WATCH_AD}
              icon={
                <img
                  className="rewardVideoButtonIcon rewardVideoButtonIcon--large"
                  src={rewardVideoUrl}
                  alt=""
                  draggable={false}
                />
              }
              onClick={onWatchAd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
