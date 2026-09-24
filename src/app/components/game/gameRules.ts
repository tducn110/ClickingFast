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

export const BASE_HARVEST_SCORE = 1;
export const ORDER_COMPLETE_BONUS = 3;
export const ORDER_FAST_BONUS_MAX = 2;
export const LIGHTNING_SCORE_PER_HAZARD = 1;
export const FULL_HEART_SCORE = 1;
export const COMBO_WINDOW_MS = 2500;
export const MISTAKE_STREAK_WINDOW_MS = 4000;
export const TARGET_RESCUE_WAIT_MS = 1400;
export const TARGET_RESCUE_TIME_RATIO = 0.3;
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
  targetAbsentMs: number;
  timeRemainingRatio: number;
}

// Anti-starvation is a rescue rule, not the normal spawn policy. A completely
// empty target set gets rescued after a bounded observation window. Missing
// kinds in a mixed order are guaranteed only near the deadline, so the player
// still has to scan and react without RNG making the order impossible.
export function shouldPrioritizeOrderTarget({
  remainingTargets,
  activeTargetCount,
  missingTargetCount,
  targetAbsentMs,
  timeRemainingRatio,
}: OrderTargetPresence) {
  if (remainingTargets <= 0) return false;
  const deadlineRescue = timeRemainingRatio <= TARGET_RESCUE_TIME_RATIO;
  if (activeTargetCount === 0) {
    return targetAbsentMs >= TARGET_RESCUE_WAIT_MS || deadlineRescue;
  }
  return (missingTargetCount ?? 0) > 0 && deadlineRescue;
}

export interface ComboPressure {
  spawnIntervalScale: number;
  hazardWeightBonus: number;
}

// Combo is both reward and risk: higher tiers retain their score multiplier but
// demand faster decisions and slightly increase hazard pressure. Values are
// capped so mobile play never accelerates without bound.
export function resolveComboPressure(combo: number): ComboPressure {
  if (combo >= 15) return { spawnIntervalScale: 0.78, hazardWeightBonus: 0.1 };
  if (combo >= 10) return { spawnIntervalScale: 0.85, hazardWeightBonus: 0.06 };
  if (combo >= 5) return { spawnIntervalScale: 0.92, hazardWeightBonus: 0.03 };
  return { spawnIntervalScale: 1, hazardWeightBonus: 0 };
}

export function resolveComboWindowMs(completedOrders: number) {
  if (completedOrders >= 9) return 1900;
  if (completedOrders >= 4) return 2200;
  return COMBO_WINDOW_MS;
}

export interface MistakePressure {
  streak: number;
  loseLife: boolean;
}

export function resolveMistakePressure(
  currentStreak: number,
  previousMistakeAtMs: number,
  nowMs: number,
): MistakePressure {
  const withinWindow =
    currentStreak > 0 &&
    nowMs >= previousMistakeAtMs &&
    nowMs - previousMistakeAtMs <= MISTAKE_STREAK_WINDOW_MS;
  const streak = withinWindow ? currentStreak + 1 : 1;
  return {
    streak: streak >= 3 ? 0 : streak,
    loseLife: streak >= 3,
  };
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
  // Orders 1-2 share one short onboarding pace with targets only. Difficulty
  // starts after order 2, rather than ramping inside the tutorial itself.
  if (completedOrders < 2) {
    return {
      targetWeight: 1,
      distractorWeight: 0,
      hazardWeight: 0,
      spawnIntervalMs: 850,
      maxActive: 2,
      fallDurationMultiplier: 0.88,
      required: 3,
    };
  }

  // From order 3 onward, every completed order pushes the player: new produce
  // enters through multi-kind orders, spawn gaps and fall time shrink on every
  // step, and distractor/hazard pressure rises toward bounded mobile-safe caps.
  const pressureStep = completedOrders - 2;
  return {
    targetWeight: Math.max(0.35, 0.6 - pressureStep * 0.018),
    distractorWeight: Math.min(0.48, 0.3 + pressureStep * 0.012),
    hazardWeight: Math.min(0.3, 0.1 + pressureStep * 0.012),
    spawnIntervalMs: Math.max(520, 720 - pressureStep * 28),
    maxActive: Math.min(7, 4 + Math.floor(pressureStep / 2)),
    fallDurationMultiplier: Math.max(0.55, 0.82 - pressureStep * 0.025),
    required: Math.min(10, 5 + Math.floor(pressureStep / 2)),
  };
}


export function resolveOrderTimeLimitMs(required: number) {
  return 12_000 + required * 1000;
}

export function resolveComboMultiplier(combo: number) {
  return Math.max(1, Math.floor(combo));
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
