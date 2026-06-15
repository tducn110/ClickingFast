import { useState } from "react";
import { CREATURES } from "./game/constants";
import { useAuth } from "../lib/AuthContext";
import { saveGameStateForRedirect } from "../../lib/firebase/auth";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { GameButton } from "./GameButton";
import { LeaderboardTable } from "./LeaderboardTable";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { LEADERBOARD_PREVIEW_LIMIT, LEADERBOARD_FULL_LIMIT, GAME_STRINGS } from "../lib/constants";

interface PixiGameProps {
  onStartGame: () => void;
  onSettings: () => void;
}

export function PixiGame({ onStartGame, onSettings }: PixiGameProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboard(LEADERBOARD_FULL_LIMIT);

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
            variant="ghost"
            size="sm"
            onClick={() => {
              saveGameStateForRedirect("menu");
              loginWithGoogle().catch(console.error);
            }}
            className="bg-white hover:bg-gray-50 text-foreground font-bold shadow-sm"
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
      <div className="rounded-[24px] border p-4 md:p-6 w-full max-w-2xl" style={{ background: "rgba(252, 245, 215, 0.7)", borderColor: "rgba(238, 208, 94, 0.25)" }}>
        <div className="rounded-[16px] overflow-hidden relative">
          <img
            src="/magnific__upload__50109.png"
            alt="Ocean fishing illustration — two fishers on a dock with calm pastel waters"
            className="w-full h-auto object-cover"
            draggable={false}
          />
          {/* How to play overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-5 py-4" style={{ background: "rgba(100, 180, 195, 0.94)", backdropFilter: "blur(4px)" }}>
            <p className="text-white font-bold text-center drop-shadow-sm" style={{ fontSize: "14px", lineHeight: "1.6" }}>
              How to play: {GAME_STRINGS.HOW_TO_PLAY}
            </p>
          </div>
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

        {/* Action buttons — 3 nút ngang hàng */}
        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
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
            onClick={() => setShowLeaderboard(true)}
            className="bg-white hover:bg-white/90 text-primary border-primary/30"
          >
            {GAME_STRINGS.LEADERBOARD_BUTTON}
          </GameButton>
          <GameButton
            variant="ghost"
            size="lg"
            onClick={onSettings}
            className="bg-white hover:bg-gray-50 text-foreground font-bold border-border shadow-sm"
          >
            {GAME_STRINGS.SETTINGS}
          </GameButton>
        </div>
      </div>

      {/* Leaderboard Full Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
          <div
            className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground font-display font-extrabold text-[24px]">
                🏆 Bảng Vàng Vinh Danh
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <LeaderboardTable
              data={leaderboardData}
              loading={leaderboardLoading}
              error={leaderboardError}
              currentUserId={user?.uid}
              defaultExpanded={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
