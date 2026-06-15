import { useState } from "react";
import type { ScoreRecord } from "../../lib/firebase/db";
import { GAME_STRINGS } from "../lib/constants";

interface LeaderboardTableProps {
  data: ScoreRecord[];
  loading: boolean;
  error: string | null;
  currentUserId?: string | null;
  previewLimit?: number;
  defaultExpanded?: boolean;
}

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

const RowSkeleton = () => (
  <div className="flex items-center gap-2 px-3 py-2">
    <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
    <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
    <div className="flex-1 h-3 rounded bg-muted animate-pulse" />
    <div className="w-10 h-3 rounded bg-muted animate-pulse" />
  </div>
);

const LeaderRow = ({
  record,
  rank,
  isMe,
}: {
  record: ScoreRecord;
  rank: number;
  isMe: boolean;
}) => (
  <div
    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
      isMe
        ? "bg-primary/15 border border-primary/30"
        : "hover:bg-muted/60"
    }`}
  >
    {/* Rank */}
    <span className="w-6 text-center flex-shrink-0 font-bold text-[13px]">
      {rank <= 3 ? RANK_EMOJI[rank - 1] : (
        <span className="text-muted-foreground">#{rank}</span>
      )}
    </span>

    {/* Avatar */}
    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold uppercase ${
      isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/50"
    }`}>
      {record.displayName?.charAt(0) || "?"}
    </div>

    {/* Name */}
    <span className={`flex-1 font-medium truncate text-[13px] ${
      isMe ? "text-foreground font-bold" : "text-foreground/80"
    }`}>
      {record.displayName || GAME_STRINGS.LEADERBOARD_ANONYMOUS}
      {isMe && (
        <span className="text-[10px] ml-1 text-primary font-semibold">
          {GAME_STRINGS.LEADERBOARD_YOU}
        </span>
      )}
    </span>

    {/* Score */}
    <span className={`font-bold text-[14px] flex-shrink-0 ${isMe ? "text-primary" : "text-foreground/60"}`}>
      {record.score.toLocaleString()}
    </span>
  </div>
);

export const LeaderboardTable = ({
  data,
  loading,
  error,
  currentUserId,
  previewLimit = 5,
  defaultExpanded = false,
}: LeaderboardTableProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const displayed = expanded ? data : data.slice(0, 10);
  const half = Math.ceil(displayed.length / 2);
  const leftCol = displayed.slice(0, half);
  const rightCol = displayed.slice(half, 10);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5">
        <div className="text-center font-display font-bold mb-4 text-[14px] text-foreground/60 uppercase tracking-wider">
          {GAME_STRINGS.LEADERBOARD_TITLE}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i + 5} />)}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-[13px] text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-[13px] text-muted-foreground">{GAME_STRINGS.LEADERBOARD_EMPTY}</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="text-center font-display font-bold mb-4 text-[14px] text-foreground/60 uppercase tracking-wider">
        {GAME_STRINGS.LEADERBOARD_TITLE} 🏆
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {/* Left column */}
        <div className="space-y-0.5">
          {leftCol.map((record, i) => (
            <LeaderRow
              key={record.userId}
              record={record}
              rank={i * 2 + 1}
              isMe={!!currentUserId && record.userId === currentUserId}
            />
          ))}
        </div>

        {/* Right column - even ranks: 2, 4, 6, 8, 10 */}
        <div className="space-y-0.5">
          {rightCol.map((record, i) => (
            <LeaderRow
              key={record.userId}
              record={record}
              rank={i * 2 + 2}
              isMe={!!currentUserId && record.userId === currentUserId}
            />
          ))}
          {/* Fill empty slots so columns stay aligned */}
          {rightCol.length < 5 && Array.from({ length: 5 - rightCol.length }).map((_, i) => (
            <div key={`empty-${i}`} className="px-3 py-2 opacity-0 select-none">.</div>
          ))}
        </div>
      </div>

      {/* View More toggle */}
      {data.length > 10 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-muted/50"
          >
            {expanded ? GAME_STRINGS.LEADERBOARD_COLLAPSE : GAME_STRINGS.LEADERBOARD_VIEW_TOP}
          </button>
        </div>
      )}
    </div>
  );
}
