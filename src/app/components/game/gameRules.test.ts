import { describe, expect, it } from "vitest";
import {
  BASE_HARVEST_SCORE,
  getPowerupWeights,
  LIGHTNING_SCORE_PER_HAZARD,
  ORDER_COMPLETE_BONUS,
  resolveComboMultiplier,
  resolveOrderTimeLimitMs,
  resolveWaveConfig,
  selectPowerup,
} from "./gameRules";

describe("resolveWaveConfig", () => {
  it("starts with a guided target-only wave", () => {
    expect(resolveWaveConfig(0)).toEqual({
      targetWeight: 1,
      distractorWeight: 0,
      hazardWeight: 0,
      spawnIntervalMs: 1200,
      maxActive: 1,
      fallDurationMultiplier: 1,
      required: 3,
    });
  });

  it("introduces distractors before hazards", () => {
    expect(resolveWaveConfig(2)).toMatchObject({
      targetWeight: 0.7,
      distractorWeight: 0.3,
      hazardWeight: 0,
      required: 4,
    });
    expect(resolveWaveConfig(3)).toMatchObject({
      targetWeight: 0.6,
      distractorWeight: 0.25,
      hazardWeight: 0.15,
      required: 5,
    });
  });

  it("caps late-game speed and order size", () => {
    const wave = resolveWaveConfig(100);
    expect(wave.spawnIntervalMs).toBe(700);
    expect(wave.fallDurationMultiplier).toBe(0.65);
    expect(wave.required).toBe(8);
  });
});

describe("score and timer rules", () => {
  it("keeps gameplay scoring on a small-point economy", () => {
    expect(BASE_HARVEST_SCORE).toBe(1);
    expect(ORDER_COMPLETE_BONUS).toBe(3);
    expect(LIGHTNING_SCORE_PER_HAZARD).toBe(1);
  });

  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [10, 3],
    [15, 4],
    [100, 4],
  ])("maps combo %i to multiplier %i", (combo, multiplier) => {
    expect(resolveComboMultiplier(combo)).toBe(multiplier);
  });

  it("scales the order timer with required targets", () => {
    expect(resolveOrderTimeLimitMs(3)).toBe(15_000);
    expect(resolveOrderTimeLimitMs(8)).toBe(20_000);
  });
});

describe("power-up selection", () => {
  const allEligible = {
    missingLives: 2,
    activeHazards: 1,
    slowTimeActive: false,
  };

  it("only includes power-ups that can help the current run", () => {
    expect(getPowerupWeights(allEligible)).toEqual([
      { id: "heart", weight: 3 },
      { id: "lightning", weight: 2 },
      { id: "slowTime", weight: 2 },
    ]);
    expect(
      getPowerupWeights({
        missingLives: 0,
        activeHazards: 0,
        slowTimeActive: true,
      }),
    ).toEqual([]);
  });

  it("uses the configured weighted ranges deterministically", () => {
    expect(selectPowerup(allEligible, 0)).toBe("heart");
    expect(selectPowerup(allEligible, 0.5)).toBe("lightning");
    expect(selectPowerup(allEligible, 0.9)).toBe("slowTime");
  });

  it("returns null when every power-up is ineligible", () => {
    expect(
      selectPowerup(
        { missingLives: 0, activeHazards: 0, slowTimeActive: true },
        0.5,
      ),
    ).toBeNull();
  });
});
