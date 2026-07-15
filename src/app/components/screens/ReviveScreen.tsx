import { GAME_STRINGS } from "../../lib/constants";
import rewardVideoUrl from "../../../assets/ui/reward_video.png";
import { CharacterStage } from "../ui/CharacterStage";
import { GameButton } from "../ui/GameButton";

interface ReviveScreenProps {
  onSkip: () => void;
  onWatchAd: () => void;
}

export function ReviveScreen({ onSkip, onWatchAd }: ReviveScreenProps) {
  return (
    <div className="gameOverOverlay">
      <div className="gameOverPresentation">
        <CharacterStage pose="revive" />
        <div className="gameOverCard gameOverCard--revive">
          <div className="gameOverKicker">Chưa hết cơ hội</div>
          <h2 className="gameOverTitle">{GAME_STRINGS.REVIVE_TITLE}</h2>
          <p className="gameOverMessage">{GAME_STRINGS.REVIVE_MESSAGE}</p>
          <div className="gameOverChoiceRow">
            <GameButton variant="ghost" size="md" fullWidth onClick={onSkip}>
              {GAME_STRINGS.SKIP}
            </GameButton>
            <GameButton
              variant="primary"
              size="md"
              fullWidth
              className="rewardVideoActionButton"
              icon={
                <img
                  className="rewardVideoButtonIcon"
                  src={rewardVideoUrl}
                  alt=""
                  draggable={false}
                />
              }
              onClick={onWatchAd}
            >
              {GAME_STRINGS.WATCH_AD}
            </GameButton>
          </div>
        </div>
      </div>
    </div>
  );
}
