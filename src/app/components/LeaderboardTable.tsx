import { useState } from "react";
import type { ScoreRecord } from "../../lib/firebase/db";
import { GAME_STRINGS, LEADERBOARD_PREVIEW_LIMIT } from "../lib/constants";
import { GameButton } from "./GameButton";

interface LeaderboardTableProps {
  data: ScoreRecord[];
  loading: boolean;
  error: string | null;
  currentUserId?: string | null;
  previewLimit?: number;
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

  // Shared ocean-blue card wrapper
  const wrapper = (children: React.ReactNode) => (
    <div
      className="w-full rounded-2xl p-4 shadow-xl"
      style={{
        background: "linear-gradient(145deg, #0c2340 0%, #0a3d62 60%, #0e6090 100%)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
      }}
    >
      {children}
    </div>
  );

  if (loading) {
    return wrapper(
      <>
        <div className="text-center font-bold mb-3 uppercase tracking-widest text-[11px] text-sky-300">
          {GAME_STRINGS.LEADERBOARD_TITLE}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: previewLimit }).map((_, i) => (
            <div key={i} className="h-6 rounded-lg animate-pulse" style={{ background: "rgba(56,189,248,0.12)" }} />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return wrapper(
      <p className="text-center text-[13px] text-sky-300/70">{error}</p>
    );
  }

  if (!data.length) {
    return wrapper(
      <p className="text-center text-[13px] text-sky-300/70">
        {GAME_STRINGS.LEADERBOARD_EMPTY}
      </p>
    );
  }

  return wrapper(
    <>
      {/* Header */}
      <div className="text-center font-extrabold mb-3 uppercase tracking-widest text-[12px] text-sky-300">
        {GAME_STRINGS.LEADERBOARD_TITLE} 🏆
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5">
        {displayed.map((record, i) => {
          const isCurrentUser = currentUserId && record.userId === currentUserId;
          const globalRank = i + 1;

          return (
            <div
              key={record.userId}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-[13px] transition-all"
              style={
                isCurrentUser
                  ? {
                      background: "rgba(56, 189, 248, 0.18)",
                      border: "1px solid rgba(56, 189, 248, 0.45)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                    }
              }
            >
              {/* Rank */}
              <span className="w-6 text-center flex-shrink-0 font-bold text-sky-400/80 text-[13px]">
                {globalRank <= 3 ? RANK_EMOJI[globalRank - 1] : `#${globalRank}`}
              </span>

              {/* Avatar Initial */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(56,189,248,0.22)" }}
              >
                <span className="text-[10px] font-bold text-sky-300 uppercase">
                  {record.displayName?.charAt(0) || "?"}
                </span>
              </div>

              {/* Name */}
              <span
                className="flex-1 font-medium truncate"
                style={{ color: isCurrentUser ? "#38bdf8" : "rgba(255,255,255,0.88)" }}
              >
                {record.displayName || GAME_STRINGS.LEADERBOARD_ANONYMOUS}
                {isCurrentUser && (
                  <span className="text-[10px] ml-1" style={{ color: "rgba(56,189,248,0.6)" }}>
                    {GAME_STRINGS.LEADERBOARD_YOU}
                  </span>
                )}
              </span>

              {/* Score */}
              <span className="font-bold text-[14px] text-cyan-300">
                {record.score.toLocaleString()}
              </span>

              {/* Playtime */}
              {record.playtime !== undefined && (
                <span className="text-[10px] w-8 text-right flex-shrink-0 text-sky-400/50">
                  {record.playtime}s
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* View Top 10 / Thu gọn toggle */}
      {data.length > previewLimit && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: "1px solid rgba(56,189,248,0.18)" }}
        >
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full text-[13px] font-semibold text-sky-300 hover:text-cyan-200 transition-colors py-1 rounded-lg"
            style={{ background: "rgba(56,189,248,0.08)" }}
          >
            {expanded ? GAME_STRINGS.LEADERBOARD_COLLAPSE : GAME_STRINGS.LEADERBOARD_VIEW_TOP}
          </button>
        </div>
      )}
    </>
  );
};
