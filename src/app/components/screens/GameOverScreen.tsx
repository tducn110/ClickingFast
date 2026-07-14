import { GAME_STRINGS } from "../../lib/constants";
import { CharacterStage } from "../ui/CharacterStage";
import { GameButton } from "../ui/GameButton";

interface FinalizedRun {
  runScore: number;
  multiplier: 1 | 2;
  finalScore: number;
  isNewBest: boolean;
}

interface GameOverScreenProps {
  finalizedRun: FinalizedRun;
  ordersCompleted: number;
  totalHarvested: number;
  highestCombo: number;
  newBest: boolean;
  bestScore: number;
  playerName: string;
  onBackToMenu: () => void;
  onPlayAgain: () => void;
}

export function GameOverScreen({
  finalizedRun,
  ordersCompleted,
  totalHarvested,
  highestCombo,
  newBest,
  bestScore,
  playerName,
  onBackToMenu,
  onPlayAgain,
}: GameOverScreenProps) {
  return (
    <div className="gameOverOverlay">
      <div className="gameOverPresentation">
        <CharacterStage pose={newBest ? "newBest" : "defeat"} />
        <div className="gameOverCard">
          <div className="gameOverKicker">Tổng kết mùa vụ</div>
          <h2 className="gameOverTitle">Game Over</h2>

          <div className="gameOverScoreBlock">
            <span>{GAME_STRINGS.FINAL_SCORE}</span>
            <strong>{finalizedRun.finalScore.toLocaleString("vi-VN")}</strong>
          </div>

          <div className="gameOverStats">
            <div>
              <span>Mục tiêu</span>
              <strong>{ordersCompleted}</strong>
            </div>
            <div>
              <span>Đã thu hoạch</span>
              <strong>{totalHarvested}</strong>
            </div>
            <div>
              <span>Combo</span>
              <strong>x{highestCombo}</strong>
            </div>
          </div>

          <div className="text-center">
          {newBest ? (
            <div className="text-[14px] font-bold text-[#CC7069]">
              {GAME_STRINGS.NEW_BEST}
            </div>
          ) : (
            <div className="text-[13px] text-[#7A7D7E]">Kỷ lục điểm: {bestScore}</div>
          )}
          <div className="mt-2 text-[13px] font-medium text-[#4A4D4E]">
            {GAME_STRINGS.LEADERBOARD_SAVED}
          </div>
          <div className="mt-1 text-[12px] text-[#7A7D7E]">{playerName}</div>
          </div>

          <GameButton variant="primary" size="md" fullWidth onClick={onPlayAgain}>
            {GAME_STRINGS.PLAY_AGAIN}
          </GameButton>
          <GameButton variant="ghost" size="md" fullWidth onClick={onBackToMenu}>
            {GAME_STRINGS.BACK_TO_MENU}
          </GameButton>
        </div>
      </div>
    </div>
  );
}
