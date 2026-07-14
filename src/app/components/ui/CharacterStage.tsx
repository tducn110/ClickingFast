type CharacterPose = "revive" | "encourage" | "x2" | "defeat" | "newBest";

interface CharacterStageProps {
  characterId?: string;
  pose: CharacterPose;
  className?: string;
}

const POSE_LABELS: Record<CharacterPose, string> = {
  revive: "CONTINUE",
  encourage: "READY",
  x2: "x2",
  defeat: "OVER",
  newBest: "BEST",
};

export function CharacterStage({
  characterId = "default",
  pose,
  className = "",
}: CharacterStageProps) {
  const imagePath = `/avatars/${characterId}/${pose}.png`;

  return (
    <div className={`characterStage ${className}`} aria-hidden="true">
      <img
        className="characterStageImage"
        src={imagePath}
        alt=""
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
      <div className="characterStageFallback">
        <span>{POSE_LABELS[pose]}</span>
      </div>
    </div>
  );
}
