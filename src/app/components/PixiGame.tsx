import { CREATURES } from "./game/constants";
import { useAuth, loginWithGoogle, logout } from "../../lib/firebase/auth";

interface PixiGameProps {
  onStartGame: () => void;
  onSettings: () => void;
}

export function PixiGame({ onStartGame, onSettings }: PixiGameProps) {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4">
      {/* Title section */}
      <div className="text-center mb-4 md:mb-6">
        <h1 className="text-foreground text-[36px] md:text-[44px] leading-[1.1] font-display font-extrabold tracking-tight">
          Ocean Tap
        </h1>
      </div>

      {/* Hero image card */}
      <div className="bg-card rounded-2xl border border-border p-4 md:p-6 w-full max-w-2xl">
        <div className="rounded-2xl overflow-hidden relative">
          <img
            src="/magnific__upload__50109.png"
            alt="Ocean fishing illustration — two fishers on a dock with calm pastel waters"
            className="w-full h-auto object-cover"
            draggable={false}
          />
          {/* How to play overlay */}
          <div className="absolute bottom-0 left-0 w-full p-3 bg-border/95 backdrop-blur-sm">
            <p className="text-foreground font-bold text-center" style={{ fontSize: "14px", lineHeight: "1.5" }}>
              How to play: Tap the sea creatures as they swim across the screen. Build combos for bonus points — but miss too many and it's game over!
            </p>
          </div>
        </div>

        {/* Creature preview chips */}
        <div className="mt-5 hidden md:flex gap-2 flex-wrap justify-center">
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
        <div className="mt-4 md:mt-6 flex flex-row justify-center gap-2 md:gap-3">
          <button
            id="start-mission-btn"
            onClick={onStartGame}
            className="flex-1 max-w-[200px] bg-primary hover:bg-[#D6B847] active:scale-[0.97] text-primary-foreground font-semibold py-3 px-2 md:px-6 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap"
            style={{ fontSize: "14px", lineHeight: "1" }}
          >
            🎣 Start Fishing
          </button>
          
          {user ? (
            <button
              onClick={() => logout().catch(console.error)}
              className="flex-1 max-w-[200px] bg-secondary/20 hover:bg-secondary/40 active:scale-[0.97] border border-secondary/30 text-foreground font-semibold py-3 px-2 md:px-6 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap"
              style={{ fontSize: "14px", lineHeight: "1" }}
            >
              🚪 Logout
            </button>
          ) : (
            <button
              onClick={() => loginWithGoogle().catch(console.error)}
              className="flex-1 max-w-[200px] bg-card hover:bg-foreground/5 active:scale-[0.97] border border-[rgba(74,77,78,0.2)] text-foreground font-semibold py-3 px-2 md:px-6 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap"
              style={{ fontSize: "14px", lineHeight: "1" }}
            >
              🔑 Login with google
            </button>
          )}

          <button
            id="settings-btn"
            onClick={onSettings}
            className="bg-transparent hover:bg-foreground/5 active:scale-[0.97] border border-[rgba(74,77,78,0.2)] text-foreground font-semibold py-3 px-4 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0"
            style={{ fontSize: "14px", lineHeight: "1" }}
          >
            ⚙️
          </button>
        </div>
      </div>


    </div>
  );
}
