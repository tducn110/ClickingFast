import type { PowerupId } from "./itemRegistry";

export const BASE_HARVEST_SCORE = 1;
export const ORDER_COMPLETE_BONUS = 3;
export const LIGHTNING_SCORE_PER_HAZARD = 1;
export const COMBO_WINDOW_MS = 2500;
export const DAMAGE_GRACE_MS = 600;
export const ORDER_TRANSITION_MS = 800;
export const POWERUP_COOLDOWN_MS = 10_000;
export const POWERUP_PITY_MS = 20_000;
export const POWERUP_SPAWN_CHANCE = 0.15;
export const SLOW_TIME_DURATION_MS = 5000;
export const SLOW_TIME_FALL_MULTIPLIER = 0.55;

export interface WaveConfig {
  targetWeight: number;
  distractorWeight: number;
  hazardWeight: number;
  spawnIntervalMs: number;
  maxActive: number;
  fallDurationMultiplier: number;
  required: number;
}

export function resolveDifficultyLevel(completedOrders: number) {
  if (completedOrders < 3) return 1;
  if (completedOrders < 5) return 2;
  if (completedOrders < 8) return 3;
  if (completedOrders < 10) return 4;
  return 5;
}

export function resolveWaveConfig(completedOrders: number): WaveConfig {
  if (completedOrders <= 0) {
    return {
      targetWeight: 1,
      distractorWeight: 0,
      hazardWeight: 0,
      spawnIntervalMs: 1200,
      maxActive: 1,
      fallDurationMultiplier: 1,
      required: 3,
    };
  }

  if (completedOrders <= 2) {
    return {
      targetWeight: 0.7,
      distractorWeight: 0.3,
      hazardWeight: 0,
      spawnIntervalMs: 1050,
      maxActive: 3,
      fallDurationMultiplier: 0.92,
      required: 4,
    };
  }

  if (completedOrders <= 4) {
    return {
      targetWeight: 0.6,
      distractorWeight: 0.25,
      hazardWeight: 0.15,
      spawnIntervalMs: 900,
      maxActive: 4,
      fallDurationMultiplier: 0.82,
      required: 5,
    };
  }

  const extraOrders = completedOrders - 5;
  return {
    targetWeight: 0.55,
    distractorWeight: 0.25,
    hazardWeight: 0.2,
    spawnIntervalMs: Math.max(700, 800 - extraOrders * 25),
    maxActive: Math.min(5, 4 + Math.floor(extraOrders / 4)),
    fallDurationMultiplier: Math.max(0.65, 0.75 - extraOrders * 0.02),
    required: Math.min(8, 6 + Math.floor(extraOrders / 2)),
  };
}

export function resolveOrderTimeLimitMs(required: number) {
  return 12_000 + required * 1000;
}

export function resolveComboMultiplier(combo: number) {
  return Math.min(4, 1 + Math.floor(Math.max(0, combo) / 5));
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
