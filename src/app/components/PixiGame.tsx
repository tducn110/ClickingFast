import { CREATURES } from "./game/constants";

interface PixiGameProps {
  onStartGame: () => void;
  onSettings: () => void;
}

export function PixiGame({ onStartGame, onSettings }: PixiGameProps) {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4">
      {/* Title section */}
      <div className="text-center mb-8">
        <h1 className="text-foreground text-5xl md:text-6xl font-display font-extrabold mb-3 tracking-tight">
          Ocean Tap
        </h1>
      </div>

      {/* Hero image card */}
      <div className="bg-card rounded-[24px] border border-border p-4 md:p-6 w-full max-w-2xl">
        <div className="rounded-[16px] overflow-hidden">
          <img
            src="/magnific__upload__50109.png"
            alt="Ocean fishing illustration — two fishers on a dock with calm pastel waters"
            className="w-full h-auto object-cover"
            draggable={false}
          />
        </div>

        {/* Creature preview chips */}
        <div className="mt-5 flex gap-2 flex-wrap justify-center">
          {CREATURES.slice(0, 6).map((c) => (
            <div
              key={c.name}
              className="bg-background border border-border rounded-full px-3 py-1 flex items-center gap-1.5"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: `#${c.color.toString(16).padStart(6, "0")}` }}
              />
              <span className="text-foreground font-medium" style={{ fontSize: "13px" }}>
                {c.name}
              </span>
              <span className="text-primary font-bold" style={{ fontSize: "12px" }}>
                +{c.points}
              </span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button
            id="start-mission-btn"
            onClick={onStartGame}
            className="w-full sm:w-auto bg-primary hover:bg-[#D6B847] active:scale-[0.97] text-primary-foreground font-semibold py-3.5 px-10 rounded-full transition-all duration-200 cursor-pointer"
            style={{ fontSize: "16px" }}
          >
            🎣 Start Fishing
          </button>
          <button
            id="settings-btn"
            onClick={onSettings}
            className="w-full sm:w-auto bg-transparent hover:bg-foreground/5 active:scale-[0.97] border border-border text-foreground font-semibold py-3.5 px-10 rounded-full transition-all duration-200 cursor-pointer"
            style={{ fontSize: "16px" }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* How to play */}
      <div className="mt-8 text-center max-w-md">
        <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
          <span className="font-semibold text-foreground">How to play:</span>{" "}
          Tap the sea creatures as they swim across the screen. Build combos for
          bonus points — but miss too many and it's game over!
        </p>
      </div>
    </div>
  );
}
