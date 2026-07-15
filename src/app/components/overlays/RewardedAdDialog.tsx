import { GAME_STRINGS } from "../../lib/constants";
import rewardVideoUrl from "../../../assets/ui/reward_video.png";
import { GameButton } from "../ui/GameButton";

interface RewardedAdDialogProps {
  progress: number;
  status: "idle" | "playing" | "completed" | "cancelled";
  onCancel: () => void;
}

export function RewardedAdDialog({
  progress,
  status,
  onCancel,
}: RewardedAdDialogProps) {
  const statusLabel =
    status === "idle"
      ? "Sẵn sàng"
      : status === "playing"
      ? "Đang phát"
      : status === "completed"
      ? "Hoàn tất"
      : "Đã hủy";

  return (
    <div className="gameOverOverlay" style={{ zIndex: "var(--z-rewarded-ad)" }}>
      <div className="gameOverCard">
        <img
          className="rewardVideoDialogIcon"
          src={rewardVideoUrl}
          alt=""
          draggable={false}
        />
        <div className="gameOverKicker">{statusLabel}</div>
        <div className="text-[24px] font-extrabold text-[#4A4D4E]">{GAME_STRINGS.AD_TITLE}</div>
        <p className="text-[14px] font-medium leading-6 text-[#7A7D7E]">{GAME_STRINGS.AD_MESSAGE}</p>
        <div className="mt-2 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-3 rounded-full bg-[#CC7069] transition-[width] duration-200"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#7A7D7E]">
          {Math.round(progress * 100)}%
        </div>
        <GameButton
          variant="ghost"
          size="md"
          fullWidth
          onClick={onCancel}
          disabled={status === "completed"}
        >
          {GAME_STRINGS.SKIP}
        </GameButton>
      </div>
    </div>
  );
}
