import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Globe, Music2, Sparkles, Volume2 } from "lucide-react";
import { AudioManager } from "../../lib/audioManager";
import { useSettings } from "../../lib/SettingsContext";
import { useTranslation } from "react-i18next";

interface SettingsScreenProps {
  onBack: () => void;
  onSelectLanguage: (locale: "vi" | "en") => void;
}

interface SettingRowProps {
  label: string;
  enabled: boolean;
  icon: LucideIcon;
  onClick: () => void;
  stateOnLabel: string;
  stateOffLabel: string;
}

function SettingRow({
  label,
  enabled,
  icon: Icon,
  onClick,
  stateOnLabel,
  stateOffLabel,
}: SettingRowProps) {
  const stateLabel = enabled ? stateOnLabel : stateOffLabel;

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

export function SettingsScreen({ onBack, onSelectLanguage }: SettingsScreenProps) {
  const { soundEffects, setSoundEffects, music, setMusic } = useSettings();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "vi";
  const nextLanguage = language === "vi" ? "en" : "vi";
  const languageLabel = t(`settings.languageNames.${language}`);
  const soundLabel = t("settings.sfx");
  const musicLabel = t("settings.music");
  const stateOnLabel = t("settings.on");
  const stateOffLabel = t("settings.off");

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
            {t("settings.title")}
          </h1>
          <Sparkles aria-hidden="true" />
        </header>

        <section className="settingsPanelRows" aria-label={t("settings.soundOptions")}>
          <div className="settingsOptionRow">
            <span className="settingsOptionIcon" aria-hidden="true">
              <Globe aria-hidden="true" />
            </span>
            <span className="settingsOptionLabel">{t("settings.language")}</span>
            <button
              type="button"
              className="settingsToggle is-on settingsLanguageToggle"
              aria-label={`${t("settings.language")}: ${languageLabel}`}
              onClick={() => onSelectLanguage(nextLanguage)}
            >
              <span className="settingsToggleText">{languageLabel}</span>
            </button>
          </div>
          <SettingRow
            label={soundLabel}
            enabled={soundEffects}
            icon={Volume2}
            stateOnLabel={stateOnLabel}
            stateOffLabel={stateOffLabel}
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
            label={musicLabel}
            enabled={music}
            icon={Music2}
            stateOnLabel={stateOnLabel}
            stateOffLabel={stateOffLabel}
            onClick={() => setMusic(!music)}
          />
        </section>

        <button
          type="button"
          className="settingsBackButton"
          onClick={onBack}
          aria-label={t("common.back")}
        >
          <ArrowLeft aria-hidden="true" />
          <span>{t("common.back")}</span>
        </button>
      </main>
    </div>
  );
}
