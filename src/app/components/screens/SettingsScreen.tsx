import { GAME_STRINGS } from "../../lib/constants";
import { useSettings } from "../../lib/SettingsContext";
import { GameButton } from "../ui/GameButton";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { soundEffects, setSoundEffects, music, setMusic } = useSettings();

  const SettingRow = ({
    label,
    enabled,
    onClick,
  }: {
    label: string;
    enabled: boolean;
    onClick: () => void;
  }) => (
    <div className="settingsOptionRow">
      <span className="settingsOptionLabel">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={`settingsToggle ${enabled ? "is-on" : "is-off"}`}
      >
        {enabled ? "Bật" : "Tắt"}
      </button>
    </div>
  );

  return (
    <div className="overlay-scrim">
      <div className="settingsPanel">
        <h2 className="settingsPanelTitle">{GAME_STRINGS.SETTINGS_TITLE}</h2>
        <div className="settingsPanelRows">
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
        </div>
        <GameButton variant="primary" size="lg" fullWidth onClick={onBack} style={{ marginTop: 18 }}>
          {GAME_STRINGS.BACK}
        </GameButton>
      </div>
    </div>
  );
}
