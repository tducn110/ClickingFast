import { GAME_STRINGS } from "../../lib/constants";
import { GameButton } from "../GameButton";

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
      <div className="gameOverCard">
        <div className="gameOverKicker">Tổng kết</div>
        <h2 className="gameOverTitle">{GAME_STRINGS.X2_TITLE}</h2>
        <div className="gameOverScoreBlock">
          <span>{GAME_STRINGS.CURRENT_SCORE}</span>
          <strong>{score.toLocaleString("vi-VN")}</strong>
        </div>
        <p className="text-[16px] font-extrabold text-[#CC7069]">x2</p>
        <p className="text-[14px] font-medium leading-6 text-[#7A7D7E]">
          {GAME_STRINGS.X2_MESSAGE}
        </p>
        <div className="gameOverChoiceRow">
          <GameButton variant="ghost" size="md" fullWidth onClick={onSkip}>
            {GAME_STRINGS.SKIP}
          </GameButton>
          <GameButton variant="primary" size="md" fullWidth onClick={onAccept}>
            {GAME_STRINGS.APPLY_X2}
          </GameButton>
        </div>
      </div>
    </div>
  );
}
