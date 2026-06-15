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
    <div className={`w-11 h-6 rounded-full relative transition-colors ${enabled ? "bg-primary" : "bg-gray-300"}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${enabled ? "right-0.5" : "left-0.5"}`} />
    </div>
  );

  const SettingRow = ({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) => (
    <div
      className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-4 border border-[rgba(74,77,78,0.15)] cursor-pointer"
      onClick={onClick}
    >
      <span className="text-foreground font-medium" style={{ fontSize: "16px", lineHeight: "1.5" }}>{label}</span>
      <ToggleSwitch enabled={enabled} />
    </div>
  );

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 md:p-12 w-full max-w-sm sm:max-w-md text-center">
        <h2 className="text-foreground font-display font-extrabold text-[32px] sm:text-[40px] leading-[1.2] mb-6">
          {GAME_STRINGS.SETTINGS_TITLE}
        </h2>

        <div className="space-y-4 text-left mb-8 select-none">
          <SettingRow
            label={GAME_STRINGS.SETTINGS_SOUND}
            enabled={soundEffects}
            onClick={() => setSoundEffects(!soundEffects)}
          />
          <SettingRow
            label={GAME_STRINGS.SETTINGS_MUSIC}
            enabled={music}
            onClick={() => setMusic(!music)}
          />
          <div
            className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-4 border border-[rgba(74,77,78,0.15)] cursor-pointer"
            onClick={toggleDifficulty}
          >
            <span className="text-foreground font-medium" style={{ fontSize: "16px", lineHeight: "1.5" }}>
              {GAME_STRINGS.SETTINGS_DIFFICULTY}
            </span>
            <span className="text-primary font-bold">{difficulty}</span>
          </div>
        </div>

        <GameButton variant="primary" size="lg" fullWidth onClick={onBack}>
          {GAME_STRINGS.BACK}
        </GameButton>
      </div>
    </div>
  );
}
