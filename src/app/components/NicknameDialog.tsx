import { useState } from "react";
import { NICKNAME_CONFIG, GAME_STRINGS } from "../lib/constants";
import { GameButton } from "./GameButton";

interface NicknameDialogProps {
  open: boolean;
  onConfirm: (nickname: string) => void;
}

export const NicknameDialog = ({ open, onConfirm }: NicknameDialogProps) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (
      trimmed.length < NICKNAME_CONFIG.MIN_LENGTH ||
      trimmed.length > NICKNAME_CONFIG.MAX_LENGTH
    ) {
      setError(NICKNAME_CONFIG.VALIDATION_MSG);
      return;
    }
    setError("");
    onConfirm(trimmed);
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-card border border-border rounded-2xl p-7 max-w-sm w-full mx-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] flex flex-col gap-4">
        <div className="text-center">
          <div className="text-2xl mb-1">🎮</div>
          <h2 className="text-foreground font-display font-bold text-[20px]">
            Đặt Nickname
          </h2>
          <p className="text-muted-foreground text-[13px] mt-1">
            Nickname sẽ hiển thị trên Bảng Xếp Hạng
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={NICKNAME_CONFIG.PLACEHOLDER}
            maxLength={NICKNAME_CONFIG.MAX_LENGTH}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
          <div className="flex justify-between items-center h-4">
            <span className="text-[12px] text-destructive">{error}</span>
            <span className="text-[11px] text-muted-foreground">
              {value.trim().length}/{NICKNAME_CONFIG.MAX_LENGTH}
            </span>
          </div>
        </div>

        <GameButton
          variant="primary"
          size="md"
          fullWidth
          onClick={handleSubmit}
          disabled={value.trim().length < NICKNAME_CONFIG.MIN_LENGTH}
        >
          Xác nhận
        </GameButton>
      </div>
    </div>
  );
};
