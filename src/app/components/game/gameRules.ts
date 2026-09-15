import type { PowerupId, ProduceId } from "./itemRegistry";

export interface OrderRequirement {
  kind: ProduceId;
  required: number;
  collected: number;
}

export interface ActiveOrder {
  requirements: OrderRequirement[];
  timeLimitMs: number;
  timeRemainingMs: number;
}

export const COMBO_MILESTONES = [3, 5, 10, 15] as const;
export const FEVER_MAX_METER = 100;
export const FEVER_DURATION_MS = 6_000;
export const FEVER_ENTERING_MS = 300;
export const FEVER_EXITING_MS = 450;
export const FEVER_SPAWN_INTERVAL_SCALE = 0.7;
export const FEVER_SCORE_MULTIPLIER = 2;

export type FeverState = "normal" | "entering" | "active" | "exiting";

export function isComboMilestone(combo: number) {
  return (COMBO_MILESTONES as readonly number[]).includes(combo);
}

export function resolveOrderKinds(
  completedOrders: number,
  availableKinds: ProduceId[],
  lastKinds: ProduceId[],
  random: () => number,
): ProduceId[] {
  const count = resolveOrderKindCount(completedOrders);
  // pick `count` distinct kinds from availableKinds, avoiding repeating all lastKinds when possible
  const shuffled = [...availableKinds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.max(0, Math.min(0.999999, random())) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  // filter out lastKinds if we have enough alternatives
  const preferred = shuffled.filter(k => !lastKinds.includes(k));
  const pool = preferred.length >= count ? preferred : shuffled;
  return pool.slice(0, count);
}

export function resolveOrderRequiredCount(kindIndex: number, totalRequired: number, kindCount: number): number {
  return distributeRequirementCounts(totalRequired, kindCount)[kindIndex] ?? 0;
}

export const BASE_HARVEST_SCORE = 10;
export const ORDER_COMPLETE_BONUS = 50;
export const ORDER_FAST_BONUS_MAX = 50;
export const LIGHTNING_SCORE_PER_HAZARD = 15;
export const COMBO_WINDOW_MS = 2500;
export const DAMAGE_GRACE_MS = 600;
export const ORDER_TRANSITION_MS = 800;
export const POWERUP_COOLDOWN_MS = 10_000;
export const POWERUP_PITY_MS = 20_000;
export const POWERUP_SPAWN_CHANCE = 0.15;
export const SLOW_TIME_DURATION_MS = 5000;
export const SLOW_TIME_GAMEPLAY_SCALE = 0.55;

export type OrderPhase = "active" | "transition";

export function canProcessOrderInput(orderPhase: OrderPhase) {
  return orderPhase === "active";
}

export function resolveOrderKindCount(completedOrders: number) {
  // Two onboarding orders establish the core tap/swipe loop. Mixed orders then
  // arrive early enough to demand target switching, while three kinds remain a
  // late-game pressure mechanic for a phone-sized HUD.
  if (completedOrders >= 6) return 3;
  if (completedOrders >= 2) return 2;
  return 1;
}

export function distributeRequirementCounts(totalRequired: number, kindCount: number) {
  const safeTotal = Math.max(0, Math.floor(totalRequired));
  const safeKindCount = Math.min(safeTotal, Math.max(0, Math.floor(kindCount)));
  if (safeKindCount === 0) return [];
  const base = Math.floor(safeTotal / safeKindCount);
  const remainder = safeTotal % safeKindCount;
  return Array.from(
    { length: safeKindCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

export function resolveGameplayDeltaMs(
  realTimeMs: number,
  realDeltaMs: number,
  slowTimeActiveUntilMs: number,
) {
  const safeDeltaMs = Math.max(0, realDeltaMs);
  const slowDeltaMs = Math.min(
    safeDeltaMs,
    Math.max(0, slowTimeActiveUntilMs - realTimeMs),
  );
  return (
    slowDeltaMs * SLOW_TIME_GAMEPLAY_SCALE +
    (safeDeltaMs - slowDeltaMs)
  );
}

export interface WaveConfig {
  targetWeight: number;
  distractorWeight: number;
  hazardWeight: number;
  spawnIntervalMs: number;
  maxActive: number;
  fallDurationMultiplier: number;
  required: number;
}

export interface OrderTargetPresence {
  remainingTargets: number;
  activeTargetCount: number;
  missingTargetCount?: number;
}

// Industry convention (Fruit Ninja, Food Fantasy, similar harvest/order games):
// Anti-starvation guarantee fires when:
//   a) the screen has NO live targets at all — player would be stuck, or
//   b) at least one required fruit kind is completely absent from screen.
// Without (b), a multi-kind order where one kind was never spawned would be
// unwinnable even though the player is doing everything right.
// We do NOT guarantee on every missing kind when all kinds have at least one
// representative on screen — that would be over-protecting and reduce the search.
export function shouldPrioritizeOrderTarget({
  remainingTargets,
  activeTargetCount,
  missingTargetCount,
}: OrderTargetPresence) {
  return remainingTargets > 0 && (activeTargetCount === 0 || (missingTargetCount ?? 0) > 0);
}

// Target hitbox bias decreases as difficulty rises so players must aim more
// precisely in late game, matching the expectation of games in this genre.
// Difficulty 1-2 (onboarding): generous -0.15 bias (current default)
// Difficulty 3-4 (multi-fruit): moderate -0.08 bias
// Difficulty 5+  (late game):   minimal  -0.04 bias
export function resolveInteractionBias(completedOrders: number): number {
  const level = resolveDifficultyLevel(completedOrders);
  if (level >= 5) return -0.04;
  if (level >= 3) return -0.08;
  return -0.15;
}

export function addFeverMeter(current: number, amount: number) {
  return Math.min(FEVER_MAX_METER, Math.max(0, current + amount));
}

export function resolveFeverScore(score: number, feverState: FeverState) {
  return feverState === "active" ? Math.round(score * FEVER_SCORE_MULTIPLIER) : score;
}

export interface InteractionCandidate {
  role: "target" | "distractor" | "hazard" | "pickup";
  normalizedDistance: number;
  zOrder: number;
}

export function resolveInteractionCandidate<T extends InteractionCandidate>(
  candidates: T[],
  targetBias = -0.15,
): T | null {
  const roleBias: Record<InteractionCandidate["role"], number> = {
    target: targetBias,
    pickup: -0.04,
    distractor: 0,
    hazard: 0,
  };
  let selected: T | null = null;
  let selectedScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const score = candidate.normalizedDistance + roleBias[candidate.role];
    if (
      score < selectedScore ||
      (score === selectedScore && candidate.zOrder > (selected?.zOrder ?? -1))
    ) {
      selected = candidate;
      selectedScore = score;
    }
  }
  return selected;
}


export function resolveDifficultyLevel(completedOrders: number) {
  if (completedOrders < 2) return 1;
  if (completedOrders < 4) return 2;
  if (completedOrders < 6) return 3;
  if (completedOrders < 9) return 4;
  return 5;
}

export function resolveWaveConfig(completedOrders: number): WaveConfig {
  // Tier 0 — pure onboarding: only targets, no distractors or hazards.
  if (completedOrders <= 0) {
    return {
      targetWeight: 1,
      distractorWeight: 0,
      hazardWeight: 0,
      spawnIntervalMs: 1200,
      maxActive: 2,
      fallDurationMultiplier: 1,
      required: 3,
    };
  }

  // Tier 1 — intro distractor: a few different fruits begin appearing.
  if (completedOrders <= 1) {
    return {
      targetWeight: 0.72,
      distractorWeight: 0.28,
      hazardWeight: 0,
      spawnIntervalMs: 1050,
      maxActive: 3,
      fallDurationMultiplier: 0.94,
      required: 4,
    };
  }

  // Tier 2 — multi-fruit starts, distractors more frequent, hazards enter.
  if (completedOrders <= 3) {
    return {
      targetWeight: 0.55,
      distractorWeight: 0.35,
      hazardWeight: 0.1,
      spawnIntervalMs: 880,
      maxActive: 4,
      fallDurationMultiplier: 0.85,
      required: 5,
    };
  }

  // Tier 3 — distractor density rises: screen starts feeling crowded.
  if (completedOrders <= 5) {
    return {
      targetWeight: 0.45,
      distractorWeight: 0.4,
      hazardWeight: 0.15,
      spawnIntervalMs: 760,
      maxActive: 5,
      fallDurationMultiplier: 0.76,
      required: 6,
    };
  }

  // Tier 4+ — late game: distractor and hazard weight keep climbing,
  // spawn interval compresses, more objects on screen simultaneously.
  // extraOrders counts above the tier-4 threshold (completedOrders 6+).
  const extraOrders = completedOrders - 6;
  return {
    // Target weight shrinks slowly; distractor weight grows fast so players
    // must scan harder to find the correct fruit in a chaotic screen.
    targetWeight: Math.max(0.35, 0.48 - extraOrders * 0.015),
    distractorWeight: Math.min(0.5, 0.38 + extraOrders * 0.018),
    hazardWeight: Math.min(0.3, 0.2 + extraOrders * 0.01),
    // Spawn interval compresses quickly: 740 ms → floors at 580 ms.
    spawnIntervalMs: Math.max(580, 740 - extraOrders * 25),
    // More concurrent objects: starts at 5, grows to 7.
    maxActive: Math.min(7, 5 + Math.floor(extraOrders / 3)),
    // Fall speed increases: shorter fall duration = faster drop.
    fallDurationMultiplier: Math.max(0.55, 0.70 - extraOrders * 0.022),
    // Required count grows steadily.
    required: Math.min(10, 7 + Math.floor(extraOrders / 2)),
  };
}


export function resolveOrderTimeLimitMs(required: number) {
  return 12_000 + required * 1000;
}

export function resolveComboMultiplier(combo: number) {
  if (combo >= 15) return 2.5;
  if (combo >= 10) return 2;
  if (combo >= 6) return 1.5;
  if (combo >= 3) return 1.25;
  return 1;
}

export function resolveHarvestScore(combo: number) {
  return Math.round(BASE_HARVEST_SCORE * resolveComboMultiplier(combo));
}

export function resolveOrderCompletionBonus(
  timeRemainingMs: number,
  timeLimitMs: number,
) {
  const remainingRatio = Math.min(
    1,
    Math.max(0, timeRemainingMs) / Math.max(1, timeLimitMs),
  );
  return ORDER_COMPLETE_BONUS + Math.round(ORDER_FAST_BONUS_MAX * remainingRatio);
}

export interface PowerupEligibility {
  missingLives: number;
  activeHazards: number;
  slowTimeActive: boolean;
}

export function getPowerupWeights({
  missingLives,
  activeHazards,
  slowTimeActive,
}: PowerupEligibility): Array<{ id: PowerupId; weight: number }> {
  const weights: Array<{ id: PowerupId; weight: number }> = [];
  if (missingLives > 0) weights.push({ id: "heart", weight: 3 });
  if (activeHazards > 0) weights.push({ id: "lightning", weight: 2 });
  if (!slowTimeActive) weights.push({ id: "slowTime", weight: 2 });
  return weights;
}

export function selectPowerup(
  eligibility: PowerupEligibility,
  randomValue: number,
): PowerupId | null {
  const weights = getPowerupWeights(eligibility);
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;

  let cursor = Math.min(0.999999, Math.max(0, randomValue)) * total;
  for (const entry of weights) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.id;
  }
  return weights[weights.length - 1]?.id ?? null;
}
