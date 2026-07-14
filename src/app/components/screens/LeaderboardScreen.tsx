import { ArrowLeft, Medal, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "../../hooks/useLocalLeaderboard";
import { GAME_STRINGS } from "../../lib/constants";
import { GameButton } from "../GameButton";

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  nickname: string;
  onBack: () => void;
}

export function LeaderboardScreen({
  entries,
  nickname,
  onBack,
}: LeaderboardScreenProps) {
  const best = entries.find((entry) => entry.name === (nickname || "Khách"))?.score ?? 0;

  return (
    <div className="leaderboardScreen game-shell-background" style={{ zIndex: 120 }}>
      <div className="leaderboardCard">
        <div className="leaderboardTitle">
          <Medal size={22} />
          <span>{GAME_STRINGS.LEADERBOARD_TITLE}</span>
        </div>

        <div className="leaderboardBestCard">
          <p className="leaderboardEyebrow">Kỷ lục của bạn</p>
          <h1>{best.toLocaleString("vi-VN")}</h1>
        </div>

        <section className="leaderboardBoard">
          <div className="dashboardRankHeader">
            <span className="rankTitle">
              <Trophy size={16} />
              Ranking
            </span>
            <span className="rankColName">TOP ĐIỂM</span>
          </div>

          <div className="dashboardRankList leaderboardRankList">
            {entries.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--pencil-gray)", fontSize: 14 }}>
                {GAME_STRINGS.LEADERBOARD_EMPTY}
              </p>
            ) : null}
            {entries.map((entry, index) => {
              const rank = index + 1;
              let badgeBg = "rgba(42,36,24,0.08)";
              let badgeBorder = "rgba(42,36,24,0.25)";
              let rowBorder = "transparent";

              if (rank === 1) {
                badgeBg = "#EDB338";
                badgeBorder = "#C49021";
                rowBorder = "#EDB338";
              } else if (rank === 2) {
                badgeBg = "#B4B598";
                badgeBorder = "#8C8E76";
                rowBorder = "#B4B598";
              } else if (rank === 3) {
                badgeBg = "#CE8654";
                badgeBorder = "#A46538";
                rowBorder = "#CE8654";
              }

              return (
                <div
                  key={entry.id}
                  className="dashboardRankRow"
                  style={{
                    background:
                      entry.name === (nickname || "Khách")
                        ? "rgba(232,116,50,0.16)"
                        : "rgba(138,125,101,0.1)",
                    borderColor:
                      entry.name === (nickname || "Khách")
                        ? "rgba(232,116,50,0.45)"
                        : rowBorder,
                  }}
                >
                  <div
                    className="dashboardRankBadge"
                    style={{ background: badgeBg, borderColor: badgeBorder, color: "var(--ink-dark)" }}
                  >
                    #{rank}
                  </div>
                  <div className="dashboardRankName">
                    <span>{entry.name}</span>
                  </div>
                  <div className="dashboardRankScore">
                    {entry.score.toLocaleString("vi-VN")}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="leaderboardPlayerRow">
          <div
            className="dashboardRankRow"
            style={{
              background: "rgba(232,116,50,0.16)",
              borderColor: "rgba(232,116,50,0.45)",
            }}
          >
            <div
              className="dashboardRankBadge"
              style={{
                background: "rgba(42,36,24,0.08)",
                borderColor: "rgba(42,36,24,0.25)",
                color: "var(--pencil-gray)",
              }}
            >
              Bạn
            </div>
            <div className="dashboardRankName">
              <span>{nickname || "Khách"}</span>
            </div>
            <div className="dashboardRankScore">
              {best > 0 ? best.toLocaleString("vi-VN") : "Chưa có"}
            </div>
          </div>
        </div>

        <GameButton variant="primary" size="lg" className="leaderboardBackBtn" onClick={onBack}>
          <ArrowLeft size={16} />
          Quay lại
        </GameButton>
      </div>
    </div>
  );
}
