import { GAME_STRINGS } from "../../lib/constants";

interface PauseOverlayProps {
  onExit: () => void;
  onResume: () => void;
}

export function PauseOverlay({ onExit, onResume }: PauseOverlayProps) {
  return (
    <div className="pauseOverlay">
      <section
        className="pauseDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-dialog-title"
        aria-describedby="pause-dialog-message"
      >
        <h2 id="pause-dialog-title" className="pauseDialogTitle">
          {GAME_STRINGS.PAUSE_TITLE}
        </h2>
        <p id="pause-dialog-message" className="pauseDialogMessage">
          {GAME_STRINGS.PAUSE_MESSAGE}
        </p>

        <div className="pauseDialogActions">
          <button
            type="button"
            className="pauseDialogButton pauseDialogExitButton"
            onClick={onExit}
          >
            {GAME_STRINGS.YES}
          </button>
          <button
            type="button"
            className="pauseDialogButton pauseDialogResumeButton"
            onClick={onResume}
            autoFocus
          >
            {GAME_STRINGS.NO_RESUME}
          </button>
        </div>
      </section>
    </div>
  );
}
