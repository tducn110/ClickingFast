import { useState } from "react";
import type { ScoreRecord } from "../../lib/firebase/db";
import { GAME_STRINGS } from "../lib/constants";
import { GameButton } from "./GameButton";

interface LeaderboardTableProps {
  data: ScoreRecord[];
  loading: boolean;
  error: string | null;
  currentUserId?: string | null;
  /** Number of rows to show in preview mode */
  previewLimit?: number;
  /** If true, always shows all rows (full mode). If false, has "View Top 10" button */
  defaultExpanded?: boolean;
}

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

export const LeaderboardTable = ({
  data,
  loading,
  error,
  currentUserId,
  previewLimit = 5,
  defaultExpanded = false,
}: LeaderboardTableProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const displayed = expanded ? data : data.slice(0, previewLimit);

  if (loading) {
    return (
      <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-lg">
        <div className="text-center font-bold text-foreground mb-3 uppercase tracking-wider text-[12px]">
          {GAME_STRINGS.LEADERBOARD_TITLE}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: previewLimit }).map((_, i) => (
            <div
              key={i}
              className="h-6 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-lg text-center">
        <p className="text-[13px] text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-lg text-center">
        <p className="text-[13px] text-muted-foreground">
          Chưa có điểm nào. Hãy là người đầu tiên! 🎣
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-lg">
      <div className="text-center font-bold text-foreground mb-3 uppercase tracking-wider text-[12px]">
        {GAME_STRINGS.LEADERBOARD_TITLE} 🏆
      </div>

      <div className="flex flex-col gap-1.5">
        {displayed.map((record, i) => {
          const isCurrentUser = currentUserId && record.userId === currentUserId;
          const globalRank = i + 1;
          return (
            <div
              key={record.userId}
              className={[
                "flex items-center gap-2 px-2 py-1.5 rounded-xl text-[13px] transition-colors",
                isCurrentUser
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/30",
              ].join(" ")}
            >
              {/* Rank */}
              <span className="w-6 text-center flex-shrink-0 font-bold text-muted-foreground">
                {globalRank <= 3 ? RANK_EMOJI[globalRank - 1] : `#${globalRank}`}
              </span>

              {/* Avatar Initial */}
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-primary uppercase">
                  {record.displayName?.charAt(0) || "?"}
                </span>
              </div>

              {/* Name */}
              <span
                className={[
                  "flex-1 font-medium truncate",
                  isCurrentUser ? "text-primary font-bold" : "text-foreground",
                ].join(" ")}
              >
                {record.displayName || "Anonymous"}
                {isCurrentUser && (
                  <span className="text-[10px] text-primary/70 ml-1">(bạn)</span>
                )}
              </span>

              {/* Score */}
              <span className="font-bold text-primary text-[14px]">
                {record.score.toLocaleString()}
              </span>

              {/* Playtime */}
              {record.playtime !== undefined && (
                <span className="text-[10px] text-muted-foreground w-8 text-right flex-shrink-0">
                  {record.playtime}s
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* View Top 10 / Thu gọn toggle */}
      {data.length > previewLimit && (
        <div className="mt-3 border-t border-border pt-3">
          <GameButton
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Thu gọn ↑" : GAME_STRINGS.VIEW_TOP_10}
          </GameButton>
        </div>
      )}
    </div>
  );
};
