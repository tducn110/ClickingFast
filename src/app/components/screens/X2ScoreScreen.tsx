import { GAME_STRINGS } from "../../lib/constants";
import rewardVideoUrl from "../../../assets/ui/reward_video.webp";
import { CharacterStage } from "../ui/CharacterStage";
import { GameButton } from "../ui/GameButton";

interface X2ScoreScreenProps {
  score: number;
  onSkip: () => void;
  onAccept: () => void;
}

export function X2ScoreScreen({
  score,
  onSkip,
  onAccept,
}: X2ScoreScreenProps) {
  return (
    <div className="gameOverOverlay">
      <div className="gameOverPresentation">
        <CharacterStage pose="x2" />
        <div className="gameOverCard">
          <div className="gameOverKicker">Tổng kết</div>
          <h2 className="gameOverTitle">X2?</h2>
          <div className="gameOverScoreBlock">
            <span>{GAME_STRINGS.CURRENT_SCORE}</span>
            <strong>{score.toLocaleString("vi-VN")}</strong>
          </div>
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
              onClick={onAccept}
            >
              {GAME_STRINGS.APPLY_X2}
            </GameButton>
          </div>
        </div>
      </div>
    </div>
  );
}
