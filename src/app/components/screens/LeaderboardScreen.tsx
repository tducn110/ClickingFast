import { useMemo } from "react";
import { ArrowLeft, Crown, Gift, Target, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "../../types";
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
import { useTranslation } from "react-i18next";

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  onBack: () => void;
  playerName?: string;
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
  { id: "farmer-nong-dan-pro", name: "Nông Dân Pro", score: 2870, isCurrentPlayer: false, date: "2026-07-01T00:00:00.000Z" },
  { id: "farmer-thu-hoach-vui", name: "Thu Hoạch Vui", score: 2380, isCurrentPlayer: false, date: "2026-07-02T00:00:00.000Z" },
  { id: "farmer-hai-la-me", name: "Hái Là Mê", score: 1960, isCurrentPlayer: false, date: "2026-07-03T00:00:00.000Z" },
  { id: "farmer-vuon-xanh", name: "Vườn Xanh", score: 1650, isCurrentPlayer: false, date: "2026-07-04T00:00:00.000Z" },
  { id: "farmer-trai-cay-ngon", name: "Trái Cây Ngon", score: 1390, isCurrentPlayer: false, date: "2026-07-05T00:00:00.000Z" },
  { id: "farmer-tay-nhanh-hai", name: "Tay Nhanh Hái", score: 1160, isCurrentPlayer: false, date: "2026-07-06T00:00:00.000Z" },
  { id: "farmer-mua-qua-ngot", name: "Mùa Quả Ngọt", score: 980, isCurrentPlayer: false, date: "2026-07-07T00:00:00.000Z" },
  { id: "farmer-la-non", name: "Lá Non", score: 760, isCurrentPlayer: false, date: "2026-07-08T00:00:00.000Z" },
  { id: "farmer-gio-day", name: "Giỏ Đầy", score: 590, isCurrentPlayer: false, date: "2026-07-09T00:00:00.000Z" },
  { id: "farmer-mam-xanh", name: "Mầm Xanh", score: 420, isCurrentPlayer: false, date: "2026-07-10T00:00:00.000Z" },
];

function normalizePlayerName(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function buildFullRanking(entries: LeaderboardEntry[]) {
  const bestByPlayer = new Map<string, LeaderboardEntry>();
  const baseEntries = entries.length > 0 ? entries : demoLeaderboardEntries;

  for (const entry of baseEntries) {
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
  onBack,
  playerName,
}: LeaderboardScreenProps) {
  const { t, i18n } = useTranslation();
  const displayPlayerName = playerName || t("leaderboard.currentPlayer");
  const playerKey = normalizePlayerName(displayPlayerName);
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage === "en" ? "en-US" : "vi-VN"),
    [i18n.resolvedLanguage],
  );

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

  const hasExplicitCurrentPlayer = entries.some(e => e.isCurrentPlayer);
  const playerEntry = entries.find((entry) => 
    hasExplicitCurrentPlayer 
      ? entry.isCurrentPlayer 
      : normalizePlayerName(entry.name) === playerKey
  );
  const best = playerEntry?.score ?? 0;
  const playerRank = playerEntry
    ? fullRanking.findIndex((entry) => entry.id === playerEntry.id) + 1
    : null;
  const topScore = visibleRanking[0]?.score ?? 0;
  const goalScore = playerRank === 1 ? Math.max(best, 1) : Math.max(topScore + 1, 1);
  const goalProgress = Math.min(100, Math.round((best / goalScore) * 100));
  const playerAvatar = playerEntry
    ? avatarByEntryId.get(playerEntry.id) ?? avatarForPlayer(displayPlayerName)
    : avatarForPlayer(displayPlayerName);

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
          <h1 id="leaderboard-title">{t("leaderboard.title")}</h1>
        </header>

        <section className="leaderboardStats" aria-label={t("leaderboard.yourPosition")}>
          <div className="leaderboardBestCard">
            <p>{t("leaderboard.best")}</p>
            <strong>{numberFormatter.format(best)}</strong>
            <span>{t("leaderboard.score")}</span>
          </div>

          <div className="leaderboardGoalCard">
            <div className="leaderboardGoalHeading">
              <span className="leaderboardGoalIcon" aria-hidden="true">
                <Target />
              </span>
              <div>
                <p>{t("leaderboard.goal")}</p>
                <strong>{playerRank === 1 ? t("leaderboard.goalWin") : t("leaderboard.goalCatchup")}</strong>
              </div>
              <Gift className="leaderboardGoalGift" aria-hidden="true" />
            </div>
            <p className="leaderboardGoalHint">{t("leaderboard.hint")}</p>
            <div
              className="leaderboardGoalProgress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={goalProgress}
              aria-valuetext={`${numberFormatter.format(best)} / ${numberFormatter.format(goalScore)} ${t("leaderboard.score")}`}
            >
              <span style={{ width: `${goalProgress}%` }} />
            </div>
            <small>
              {numberFormatter.format(best)} / {numberFormatter.format(goalScore)}
            </small>
          </div>
        </section>

        <section className="leaderboardBoard" aria-label={t("leaderboard.top10")}>
          <div className="leaderboardColumns" aria-hidden="true">
            <span className="leaderboardColumnRank">{t("leaderboard.rank")}</span>
            <span className="leaderboardColumnPlayer">{t("leaderboard.player")}</span>
            <span>{t("leaderboard.score")}</span>
          </div>

          <div
            className="leaderboardRankList"
            role="list"
            tabIndex={0}
            aria-label={t("leaderboard.top10")}
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
                  aria-label={`${t("leaderboard.rank")} ${rank}, ${entry.name}, ${numberFormatter.format(entry.score)} ${t("leaderboard.score")}`}
                >
                  <div className="leaderboardRankBadge" aria-hidden="true">
                    {rank === 1 ? <Crown /> : null}
                    <span>{rank}</span>
                  </div>
                  <img
                    className="leaderboardAvatar"
                    src={avatar}
                    alt={`${entry.name}`}
                    width={52}
                    height={52}
                    loading={index < 4 ? "eager" : "lazy"}
                    draggable={false}
                  />
                  <div className="leaderboardRankName">
                    <strong>{entry.name}</strong>
                    {isCurrentPlayer ? <span>{t("leaderboard.currentPlayer")}</span> : null}
                  </div>
                  <strong className="leaderboardRankScore">
                    {numberFormatter.format(entry.score)}
                  </strong>
                </article>
              );
            })}
          </div>
        </section>

        <section className="leaderboardPlayerDock" aria-label={t("leaderboard.yourPosition")}>
          <div className="leaderboardPlayerRank" aria-label={playerRank ? `${t("leaderboard.rank")} ${playerRank}` : t("leaderboard.noScore")}>
            {playerRank === 1 ? <Crown aria-hidden="true" /> : null}
            <span>{playerRank ?? "-"}</span>
          </div>
          <img
            className="leaderboardAvatar leaderboardPlayerAvatar"
            src={playerAvatar}
            alt={displayPlayerName}
            width={56}
            height={56}
            draggable={false}
          />
          <div className="leaderboardPlayerName">
            <strong>{displayPlayerName}</strong>
            <span>{t("leaderboard.currentPlayer")}</span>
          </div>
          <strong className="leaderboardPlayerScore">
            {best > 0 ? numberFormatter.format(best) : t("leaderboard.noScore")}
          </strong>
        </section>

        <GameButton
          variant="primary"
          size="lg"
          className="leaderboardBackBtn"
          onClick={onBack}
          aria-label={t("leaderboard.back")}
        >
          <ArrowLeft aria-hidden="true" />
          {t("leaderboard.back")}
        </GameButton>
      </main>
    </div>
  );
}
