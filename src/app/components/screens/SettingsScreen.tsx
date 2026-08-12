import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Music2, Sparkles, Volume2 } from "lucide-react";
import { GAME_STRINGS } from "../../lib/constants";
import { AudioManager } from "../../lib/audioManager";
import { useSettings } from "../../lib/SettingsContext";

interface SettingsScreenProps {
  onBack: () => void;
}

interface SettingRowProps {
  label: string;
  enabled: boolean;
  icon: LucideIcon;
  onClick: () => void;
}

function SettingRow({ label, enabled, icon: Icon, onClick }: SettingRowProps) {
  const stateLabel = enabled ? "Bật" : "Tắt";

  return (
    <div className="settingsOptionRow">
      <span className="settingsOptionIcon" aria-hidden="true">
        <Icon />
      </span>
      <span className="settingsOptionLabel">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${label}: ${stateLabel}`}
        onClick={onClick}
        data-ui-sfx="off"
        className={`settingsToggle ${enabled ? "is-on" : "is-off"}`}
      >
        <span className="settingsToggleText">{stateLabel}</span>
        <span className="settingsToggleKnob" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { soundEffects, setSoundEffects, music, setMusic } = useSettings();

  return (
    <div className="settingsScreen game-shell-background">
      <main
        className="settingsPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
      >
        <header className="settingsPanelHeader">
          <Sparkles aria-hidden="true" />
          <h1 id="settings-panel-title" className="settingsPanelTitle">
            {GAME_STRINGS.SETTINGS_TITLE}
          </h1>
          <Sparkles aria-hidden="true" />
        </header>

        <section className="settingsPanelRows" aria-label="Tùy chọn âm thanh">
          <SettingRow
            label={GAME_STRINGS.SETTINGS_SOUND}
            enabled={soundEffects}
            icon={Volume2}
            onClick={() => {
              const nextValue = !soundEffects;
              if (nextValue) {
                AudioManager.setSoundEnabled(true);
                AudioManager.playButton();
              }
              setSoundEffects(nextValue);
            }}
          />
          <SettingRow
            label={GAME_STRINGS.SETTINGS_MUSIC}
            enabled={music}
            icon={Music2}
            onClick={() => setMusic(!music)}
          />
        </section>

        <button
          type="button"
          className="settingsBackButton"
          onClick={onBack}
          aria-label="Quay lại menu"
        >
          <ArrowLeft aria-hidden="true" />
          <span>Quay lại</span>
        </button>
      </main>
    </div>
  );
}
