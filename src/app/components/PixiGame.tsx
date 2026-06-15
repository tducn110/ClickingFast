import { CREATURES } from "./game/constants";
import { useAuth } from "../lib/AuthContext";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { GameButton } from "./GameButton";
import { LeaderboardTable } from "./LeaderboardTable";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { LEADERBOARD_PREVIEW_LIMIT, GAME_STRINGS } from "../lib/constants";

interface PixiGameProps {
  onStartGame: () => void;
  onSettings: () => void;
}

export function PixiGame({ onStartGame, onSettings }: PixiGameProps) {
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboard(LEADERBOARD_PREVIEW_LIMIT);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4">
      {/* Auth button — top right */}
      <div className="absolute top-4 right-4 z-10">
        {authLoading ? (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2 bg-card border border-border rounded-full pl-1 pr-3 py-1 shadow-sm">
            <Avatar className="w-8 h-8 border border-border">
              <AvatarImage
                src={user.photoURL || undefined}
                alt={user.displayName || "User"}
              />
              <AvatarFallback>
                {user.displayName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] font-semibold text-foreground">
              {user.displayName?.split(" ")[0]}
            </span>
            <button
              onClick={() => logout().catch(console.error)}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors ml-1"
            >
              {GAME_STRINGS.LOGOUT}
            </button>
          </div>
        ) : (
          <GameButton
            variant="secondary"
            size="sm"
            onClick={() => loginWithGoogle().catch(console.error)}
          >
            {GAME_STRINGS.LOGIN}
          </GameButton>
        )}
      </div>

      {/* Title section */}
      <div className="text-center mb-8">
        <h1 className="text-foreground text-5xl md:text-6xl font-display font-extrabold mb-3 tracking-tight">
          {GAME_STRINGS.APP_NAME}
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
          <GameButton
            variant="primary"
            size="lg"
            onClick={onStartGame}
          >
            {GAME_STRINGS.START_FISHING}
          </GameButton>
          <GameButton
            variant="ghost"
            size="lg"
            onClick={onSettings}
          >
            ⚙️ Settings
          </GameButton>
        </div>
      </div>

      {/* Leaderboard preview */}
      {user && (
        <div className="mt-8 w-full max-w-md">
          <LeaderboardTable
            data={leaderboardData}
            loading={leaderboardLoading}
            error={leaderboardError}
            currentUserId={user.uid}
            previewLimit={LEADERBOARD_PREVIEW_LIMIT}
            defaultExpanded={false}
          />
        </div>
      )}

      {/* How to play */}
      <div className="mt-8 text-center max-w-md">
        <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
          <span className="font-semibold text-foreground">How to play:</span>{" "}
          {GAME_STRINGS.HOW_TO_PLAY}
        </p>
      </div>
    </div>
  );
}
