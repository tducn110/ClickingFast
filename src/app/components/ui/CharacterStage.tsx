import pandaAgainUrl from "../../../assets/characters/panda_again.webp";
import pandaGameOverUrl from "../../../assets/characters/panda_game_over.webp";

type CharacterPose = "revive" | "encourage" | "x2" | "defeat" | "newBest";

interface CharacterStageProps {
  pose: CharacterPose;
  className?: string;
}

const POSE_ASSETS: Record<CharacterPose, string> = {
  revive: pandaAgainUrl,
  encourage: pandaAgainUrl,
  x2: pandaGameOverUrl,
  defeat: pandaGameOverUrl,
  newBest: pandaGameOverUrl,
};

export function CharacterStage({
  pose,
  className = "",
}: CharacterStageProps) {
  const imagePath = POSE_ASSETS[pose];

  return (
    <div
      className={`characterStage characterStage--${pose} ${className}`}
      aria-hidden="true"
    >
      <div className="characterStageFallback">🐼</div>
      <img
        className="characterStageImage"
        src={imagePath}
        alt=""
        draggable={false}
        loading="eager"
        onError={(event) => {
          if (event.currentTarget.dataset.fallback !== "true") {
            event.currentTarget.dataset.fallback = "true";
            event.currentTarget.src =
              imagePath === pandaAgainUrl ? pandaGameOverUrl : pandaAgainUrl;
            return;
          }

          event.currentTarget.hidden = true;
        }}
      />
    </div>
  );
}
