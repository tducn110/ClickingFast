import { useSettings, Difficulty } from "../lib/SettingsContext";
import { GameButton } from "./GameButton";
import { GAME_STRINGS } from "../lib/constants";

interface SettingsDialogProps {
  onBack: () => void;
}

export function SettingsDialog({ onBack }: SettingsDialogProps) {
  const { soundEffects, setSoundEffects, music, setMusic, difficulty, setDifficulty } = useSettings();

  const toggleDifficulty = () => {
    const diffs: Difficulty[] = ["Easy", "Normal", "Hard"];
    const idx = diffs.indexOf(difficulty);
    setDifficulty(diffs[(idx + 1) % diffs.length]);
  };

  const ToggleSwitch = ({ enabled }: { enabled: boolean }) => (
    <div className={`w-11 h-6 rounded-full relative transition-colors ${enabled ? "bg-[#e87432]" : "bg-[#e0d8c4]"}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${enabled ? "right-0.5" : "left-0.5"}`} />
    </div>
  );

  const SettingRow = ({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) => (
    <div className="flex items-center justify-between bg-white/70 rounded-xl px-5 py-4 cursor-pointer border border-[rgba(138,125,101,0.2)]" onClick={onClick}>
      <span className="text-[#2b2620] font-semibold text-[15px]">{label}</span>
      <ToggleSwitch enabled={enabled} />
    </div>
  );

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 bg-[#f5ecd7]">
      <div className="bg-[#fdf6ea] rounded-[24px] p-6 sm:p-8 md:p-10 w-full max-w-sm sm:max-w-md text-center shadow-[0_6px_28px_rgba(43,38,32,0.08)] border border-[rgba(138,125,101,0.2)]">
        <h2 className="text-[#2b2620] font-extrabold text-[28px] sm:text-[34px] mb-6" style={{ textShadow: "0 2px 0 rgba(255,255,255,0.6)" }}>{GAME_STRINGS.SETTINGS_TITLE}</h2>
        <div className="space-y-3 text-left mb-8 select-none">
          <SettingRow label={GAME_STRINGS.SETTINGS_SOUND} enabled={soundEffects} onClick={() => setSoundEffects(!soundEffects)} />
          <SettingRow label={GAME_STRINGS.SETTINGS_MUSIC} enabled={music} onClick={() => setMusic(!music)} />
          <div className="flex items-center justify-between bg-white/70 rounded-xl px-5 py-4 cursor-pointer border border-[rgba(138,125,101,0.2)]" onClick={toggleDifficulty}>
            <span className="text-[#2b2620] font-semibold text-[15px]">{GAME_STRINGS.SETTINGS_DIFFICULTY}</span>
            <span className="text-[#e87432] font-extrabold">{difficulty}</span>
          </div>
        </div>
        <GameButton variant="primary" size="lg" fullWidth onClick={onBack}>{GAME_STRINGS.BACK}</GameButton>
      </div>
    </div>
  );
}
