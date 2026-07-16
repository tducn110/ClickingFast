import { useMemo } from "react";
import { ArrowLeft, Crown, Gift, Target, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "../../hooks/useLocalLeaderboard";
import { GAME_STRINGS } from "../../lib/constants";
import avatar01 from "../../../assets/leaderboard/avatar-01.webp";
import avatar02 from "../../../assets/leaderboard/avatar-02.webp";
import avatar03 from "../../../assets/leaderboard/avatar-03.webp";
import avatar04 from "../../../assets/leaderboard/avatar-04.webp";
import avatar05 from "../../../assets/leaderboard/avatar-05.webp";
import avatar06 from "../../../assets/leaderboard/avatar-06.webp";
import avatar07 from "../../../assets/leaderboard/avatar-07.webp";
import avatar08 from "../../../assets/leaderboard/avatar-08.webp";
import avatar09 from "../../../assets/leaderboard/avatar-09.webp";
import avatar10 from "../../../assets/leaderboard/avatar-10.webp";
import { GameButton } from "../ui/GameButton";

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  nickname: string;
  onBack: () => void;
}

const LEADERBOARD_SIZE = 10;

const leaderboardAvatars = [
  avatar01,
  avatar02,
  avatar03,
  avatar04,
  avatar05,
  avatar06,
  avatar07,
  avatar08,
  avatar09,
  avatar10,
];

const demoLeaderboardEntries: LeaderboardEntry[] = [
  { id: "farmer-nong-dan-pro", name: "Nông Dân Pro", score: 28740, date: "2026-07-01T00:00:00.000Z" },
  { id: "farmer-thu-hoach-vui", name: "Thu Hoạch Vui", score: 23850, date: "2026-07-02T00:00:00.000Z" },
  { id: "farmer-hai-la-me", name: "Hái Là Mê", score: 19620, date: "2026-07-03T00:00:00.000Z" },
  { id: "farmer-vuon-xanh", name: "Vườn Xanh", score: 16490, date: "2026-07-04T00:00:00.000Z" },
  { id: "farmer-trai-cay-ngon", name: "Trái Cây Ngon", score: 13870, date: "2026-07-05T00:00:00.000Z" },
  { id: "farmer-tay-nhanh-hai", name: "Tay Nhanh Hái", score: 11640, date: "2026-07-06T00:00:00.000Z" },
  { id: "farmer-mua-qua-ngot", name: "Mùa Quả Ngọt", score: 9840, date: "2026-07-07T00:00:00.000Z" },
  { id: "farmer-la-non", name: "Lá Non", score: 7630, date: "2026-07-08T00:00:00.000Z" },
  { id: "farmer-gio-day", name: "Giỏ Đầy", score: 5920, date: "2026-07-09T00:00:00.000Z" },
  { id: "farmer-mam-xanh", name: "Mầm Xanh", score: 4180, date: "2026-07-10T00:00:00.000Z" },
];

function normalizePlayerName(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function buildFullRanking(entries: LeaderboardEntry[]) {
  const bestByPlayer = new Map<string, LeaderboardEntry>();

  for (const entry of [...demoLeaderboardEntries, ...entries]) {
    const playerKey = normalizePlayerName(entry.name);
    const currentBest = bestByPlayer.get(playerKey);

    if (
      !currentBest ||
      entry.score > currentBest.score ||
      (entry.score === currentBest.score && entry.date < currentBest.date)
    ) {
      bestByPlayer.set(playerKey, entry);
    }
  }

  return [...bestByPlayer.values()].sort(
    (left, right) => right.score - left.score || left.date.localeCompare(right.date),
  );
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffledAvatars(seed: string) {
  const avatars = [...leaderboardAvatars];
  let state = hashText(seed) || 1;

  for (let index = avatars.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [avatars[index], avatars[swapIndex]] = [avatars[swapIndex], avatars[index]];
  }

  return avatars;
}

function avatarForPlayer(name: string) {
  return leaderboardAvatars[hashText(normalizePlayerName(name)) % leaderboardAvatars.length];
}

function rankClassName(rank: number) {
  if (rank === 1) return " is-rank-one";
  if (rank === 2) return " is-rank-two";
  if (rank === 3) return " is-rank-three";
  return "";
}

export function LeaderboardScreen({
  entries,
  nickname,
  onBack,
}: LeaderboardScreenProps) {
  const playerName = nickname || "Khách";
  const playerKey = normalizePlayerName(playerName);

  const { fullRanking, visibleRanking, avatarByEntryId } = useMemo(() => {
    const ranking = buildFullRanking(entries);
    const visible = ranking.slice(0, LEADERBOARD_SIZE);
    const randomizedAvatars = shuffledAvatars(visible.map((entry) => entry.id).join("|"));

    return {
      fullRanking: ranking,
      visibleRanking: visible,
      avatarByEntryId: new Map(
        visible.map((entry, index) => [entry.id, randomizedAvatars[index]]),
      ),
    };
  }, [entries]);

  const playerEntry = entries.find(
    (entry) => normalizePlayerName(entry.name) === playerKey,
  );
  const best = playerEntry?.score ?? 0;
  const playerRank = playerEntry
    ? fullRanking.findIndex((entry) => normalizePlayerName(entry.name) === playerKey) + 1
    : null;
  const topScore = visibleRanking[0]?.score ?? 0;
  const goalScore = playerRank === 1 ? Math.max(best, 1) : Math.max(topScore + 1, 1);
  const goalProgress = Math.min(100, Math.round((best / goalScore) * 100));
  const playerAvatar = playerEntry
    ? avatarByEntryId.get(playerEntry.id) ?? avatarForPlayer(playerName)
    : avatarForPlayer(playerName);

  return (
    <div className="leaderboardScreen game-shell-background" style={{ zIndex: 120 }}>
      <main
        className="leaderboardCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
      >
        <header className="leaderboardTitle">
          <span className="leaderboardTitleIcon" aria-hidden="true">
            <Trophy />
          </span>
          <h1 id="leaderboard-title">{GAME_STRINGS.LEADERBOARD_TITLE}</h1>
        </header>

        <section className="leaderboardStats" aria-label="Thành tích và mục tiêu của bạn">
          <div className="leaderboardBestCard">
            <p>Kỷ lục của bạn</p>
            <strong>{best.toLocaleString("vi-VN")}</strong>
            <span>Điểm</span>
          </div>

          <div className="leaderboardGoalCard">
            <div className="leaderboardGoalHeading">
              <span className="leaderboardGoalIcon" aria-hidden="true">
                <Target />
              </span>
              <div>
                <p>Mục tiêu</p>
                <strong>{playerRank === 1 ? "Giữ vững top 1" : "Vượt top 1"}</strong>
              </div>
              <Gift className="leaderboardGoalGift" aria-hidden="true" />
            </div>
            <p className="leaderboardGoalHint">Bạn có thể làm được!</p>
            <div
              className="leaderboardGoalProgress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={goalProgress}
              aria-valuetext={`${best.toLocaleString("vi-VN")} trên ${goalScore.toLocaleString("vi-VN")} điểm`}
            >
              <span style={{ width: `${goalProgress}%` }} />
            </div>
            <small>
              {best.toLocaleString("vi-VN")} / {goalScore.toLocaleString("vi-VN")}
            </small>
          </div>
        </section>

        <section className="leaderboardBoard" aria-label="Bảng xếp hạng top 10">
          <div className="leaderboardColumns" aria-hidden="true">
            <span className="leaderboardColumnRank">Hạng</span>
            <span className="leaderboardColumnPlayer">Người chơi</span>
            <span>Điểm</span>
          </div>

          <div
            className="leaderboardRankList"
            role="list"
            tabIndex={0}
            aria-label="Top 10 người chơi, có thể cuộn"
          >
            {visibleRanking.map((entry, index) => {
              const rank = index + 1;
              const isCurrentPlayer = normalizePlayerName(entry.name) === playerKey;
              const avatar = avatarByEntryId.get(entry.id) ?? avatarForPlayer(entry.name);

              return (
                <article
                  key={entry.id}
                  className={`leaderboardRankRow${rankClassName(rank)}${isCurrentPlayer ? " is-player" : ""}`}
                  role="listitem"
                  aria-label={`Hạng ${rank}, ${entry.name}, ${entry.score.toLocaleString("vi-VN")} điểm`}
                >
                  <div className="leaderboardRankBadge" aria-hidden="true">
                    {rank === 1 ? <Crown /> : null}
                    <span>{rank}</span>
                  </div>
                  <img
                    className="leaderboardAvatar"
                    src={avatar}
                    alt={`Ảnh đại diện AI của ${entry.name}`}
                    width={52}
                    height={52}
                    loading={index < 4 ? "eager" : "lazy"}
                    draggable={false}
                  />
                  <div className="leaderboardRankName">
                    <strong>{entry.name}</strong>
                    {isCurrentPlayer ? <span>Bạn</span> : null}
                  </div>
                  <strong className="leaderboardRankScore">
                    {entry.score.toLocaleString("vi-VN")}
                  </strong>
                </article>
              );
            })}
          </div>
        </section>

        <section className="leaderboardPlayerDock" aria-label="Vị trí của bạn">
          <div className="leaderboardPlayerRank" aria-label={playerRank ? `Hạng ${playerRank}` : "Chưa xếp hạng"}>
            {playerRank === 1 ? <Crown aria-hidden="true" /> : null}
            <span>{playerRank ?? "-"}</span>
          </div>
          <img
            className="leaderboardAvatar leaderboardPlayerAvatar"
            src={playerAvatar}
            alt={`Ảnh đại diện AI của ${playerName}`}
            width={56}
            height={56}
            draggable={false}
          />
          <div className="leaderboardPlayerName">
            <strong>{playerName}</strong>
            <span>Bạn</span>
          </div>
          <strong className="leaderboardPlayerScore">
            {best > 0 ? best.toLocaleString("vi-VN") : "Chưa có"}
          </strong>
        </section>

        <GameButton
          variant="primary"
          size="lg"
          className="leaderboardBackBtn"
          onClick={onBack}
          aria-label="Quay lại menu"
        >
          <ArrowLeft aria-hidden="true" />
          Quay lại
        </GameButton>
      </main>
    </div>
  );
}
