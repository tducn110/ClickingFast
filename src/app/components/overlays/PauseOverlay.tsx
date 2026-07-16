import { useEffect, type ReactNode } from "react";
import { House, Music2, Play, Volume2, type LucideIcon } from "lucide-react";
import { AudioManager } from "../../lib/audioManager";
import { GAME_STRINGS } from "../../lib/constants";
import { useSettings } from "../../lib/SettingsContext";

interface PauseOverlayProps {
  onExit: () => void;
  onResume: () => void;
}

interface PauseSettingButtonProps {
  enabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

function PauseSettingButton({
  enabled,
  icon: Icon,
  label,
  onClick,
}: PauseSettingButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label}: ${enabled ? "Bật" : "Tắt"}`}
      className={`pauseSettingButton ${enabled ? "is-on" : "is-off"}`}
      onClick={onClick}
    >
      <span className="pauseSettingIcon" aria-hidden="true">
        <Icon />
      </span>
      <span className="pauseSettingCopy">
        <span className="pauseSettingState">{enabled ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

function PauseFlower({ className = "" }: { className?: string }) {
  return (
    <span className={`pauseFlower ${className}`} aria-hidden="true">
      <i className="pauseFlowerPetal" />
      <i className="pauseFlowerPetal" />
      <i className="pauseFlowerPetal" />
      <i className="pauseFlowerPetal" />
      <i className="pauseFlowerPetal" />
      <i className="pauseFlowerCenter" />
    </span>
  );
}

function PauseDivider({ children }: { children?: ReactNode }) {
  return (
    <div className="pauseDivider" aria-hidden="true">
      <span />
      <span className="pauseDividerMark">
        {children ?? <i className="pauseLeafShape" />}
      </span>
      <span />
    </div>
  );
}

function PauseBotanicals() {
  return (
    <div className="pauseBotanicals" aria-hidden="true">
      <i className="pauseLeafShape pauseTitleLeaf" />

      <span className="pauseTopSprig">
        <i className="pauseLeafShape pauseTopLeafOne" />
        <i className="pauseLeafShape pauseTopLeafTwo" />
        <PauseFlower />
      </span>

      <span className="pauseBottomSprig pauseBottomSprigLeft">
        <i className="pauseLeafShape pauseBottomLeafOne" />
        <i className="pauseLeafShape pauseBottomLeafTwo" />
        <i className="pauseLeafShape pauseBottomLeafThree" />
        <PauseFlower />
      </span>

      <span className="pauseBottomSprig pauseBottomSprigRight">
        <i className="pauseLeafShape pauseBottomLeafOne" />
        <i className="pauseLeafShape pauseBottomLeafTwo" />
        <i className="pauseLeafShape pauseBottomLeafThree" />
      </span>
    </div>
  );
}

export function PauseOverlay({ onExit, onResume }: PauseOverlayProps) {
  const { soundEffects, setSoundEffects, music, setMusic } = useSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onResume();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onResume]);

  const toggleSound = () => {
    const nextValue = !soundEffects;

    if (nextValue) {
      AudioManager.setSoundEnabled(true);
      AudioManager.playButton();
    }

    setSoundEffects(nextValue);
  };

  return (
    <div className="pauseOverlay">
      <section
        className="pauseDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-dialog-title"
        aria-describedby="pause-dialog-message"
      >
        <span className="pauseDialogCrown" aria-hidden="true" />
        <PauseBotanicals />

        <div className="pauseDialogContent">
          <header className="pauseDialogHeader">
            <h2 id="pause-dialog-title" className="pauseDialogTitle">
              {GAME_STRINGS.PAUSE_TITLE}
            </h2>
            <p id="pause-dialog-message" className="pauseDialogMessage">
              {GAME_STRINGS.PAUSE_MESSAGE}
            </p>
          </header>

          <button
            type="button"
            className="pauseActionButton pauseResumeButton"
            onClick={onResume}
          >
            <Play aria-hidden="true" />
            <span>Tiếp Tục</span>
          </button>

          <PauseDivider />

          <section className="pauseSettingsRow" aria-label="Tùy chọn âm thanh">
            <PauseSettingButton
              label={GAME_STRINGS.SETTINGS_SOUND}
              enabled={soundEffects}
              icon={Volume2}
              onClick={toggleSound}
            />
            <PauseSettingButton
              label={GAME_STRINGS.SETTINGS_MUSIC}
              enabled={music}
              icon={Music2}
              onClick={() => setMusic(!music)}
            />
          </section>

          <PauseDivider />

          <button
            type="button"
            className="pauseActionButton pauseExitButton"
            onClick={onExit}
          >
            <House aria-hidden="true" />
            <span>{GAME_STRINGS.BACK_TO_MENU}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
