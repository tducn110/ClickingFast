import { Trophy, Settings, Play } from "lucide-react";
import { GameButton } from "../ui/GameButton";
import { GAME_STRINGS } from "../../lib/constants";

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
    <div className="game-shell-background relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-[max(16px,env(safe-area-inset-left))] py-[max(16px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,11,6,0.28),rgba(16,11,6,0.58))]" />

      <div className="relative z-10 flex w-full max-w-5xl items-end justify-center md:justify-start">
        <div className="w-full max-w-[560px] rounded-[22px] border border-white/18 bg-[rgba(255,248,238,0.90)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur md:p-6">
          <div className="rounded-[18px] bg-[rgba(255,255,255,0.72)] p-4 md:p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7A7D7E]">
              PapaStudio 2026
            </div>
            <h1 className="mt-2 text-[clamp(34px,7vw,68px)] font-extrabold leading-[0.95] text-[#4A4D4E]">
              {GAME_STRINGS.APP_NAME}
            </h1>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-[rgba(138,125,101,0.1)] p-4 text-center">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A7D7E]">
                  <Trophy className="h-4 w-4 text-[#EED05E]" />
                  Điểm cao nhất
                </div>
                <div className="mt-2 text-[clamp(24px,5vw,34px)] font-extrabold leading-none text-[#EED05E]">
                  {bestScore.toLocaleString("vi-VN")}
                </div>
              </div>
            </div>

            <div className="mt-4 text-[15px] font-medium text-[#5F6162]">
              Xin chào bà {nickname || "Khách"} nhen
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <GameButton variant="primary" size="lg" fullWidth onClick={onStartGame} icon={<Play className="h-5 w-5" />}>
                Chơi
              </GameButton>
              <div className="grid grid-cols-2 gap-3">
                <GameButton variant="ghost" size="md" fullWidth onClick={onLeaderboard} icon={<Trophy className="h-5 w-5" />} />
                <GameButton variant="ghost" size="md" fullWidth onClick={onSettings} icon={<Settings className="h-5 w-5" />} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
