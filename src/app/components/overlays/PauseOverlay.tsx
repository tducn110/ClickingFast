import { useEffect, type ReactNode } from "react";
import { House, Music2, Play, Volume2, type LucideIcon } from "lucide-react";
import { AudioManager } from "../../lib/audioManager";
import { useSettings } from "../../lib/SettingsContext";
import { useTranslation } from "react-i18next";

interface PauseOverlayProps {
  onExit: () => void;
  onResume: () => void;
}

interface PauseSettingButtonProps {
  enabled: boolean;
  icon: LucideIcon;
  label: string;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
}

function PauseSettingButton({
  enabled,
  icon: Icon,
  label,
  onLabel,
  offLabel,
  onClick,
}: PauseSettingButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label}: ${enabled ? onLabel : offLabel}`}
      className={`pauseSettingButton ${enabled ? "is-on" : "is-off"}`}
      onClick={onClick}
      data-ui-sfx="off"
    >
      <span className="pauseSettingIcon" aria-hidden="true">
        <Icon />
      </span>
      <span className="pauseSettingCopy">
        <span className="pauseSettingState">{enabled ? onLabel : offLabel}</span>
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
  const { t } = useTranslation();
  const onLabel = t("common.on");
  const offLabel = t("common.off");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      AudioManager.unlockAudio();
      AudioManager.playButton();
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
              {t("pause.title")}
            </h2>
            <p id="pause-dialog-message" className="pauseDialogMessage">
              {t("pause.message")}
            </p>
          </header>

          <button
            type="button"
            className="pauseActionButton pauseResumeButton"
            onClick={onResume}
          >
            <Play aria-hidden="true" />
            <span>{t("pause.resume")}</span>
          </button>

          <PauseDivider />

          <section className="pauseSettingsRow" aria-label={t("pause.soundSettings")}>
            <PauseSettingButton
              label={t("settings.sfx")}
              enabled={soundEffects}
              icon={Volume2}
              onLabel={onLabel}
              offLabel={offLabel}
              onClick={toggleSound}
            />
            <PauseSettingButton
              label={t("settings.music")}
              enabled={music}
              icon={Music2}
              onLabel={onLabel}
              offLabel={offLabel}
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
            <span>{t("pause.exit")}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
