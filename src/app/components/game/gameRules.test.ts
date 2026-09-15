import {
 describe, expect, it } from "vitest";
import {
  BASE_HARVEST_SCORE,
  canProcessOrderInput,
  getPowerupWeights,
  LIGHTNING_SCORE_PER_HAZARD,
  ORDER_FAST_BONUS_MAX,
  ORDER_COMPLETE_BONUS,
  resolveComboMultiplier,
  resolveDifficultyLevel,
  resolveGameplayDeltaMs,
  resolveHarvestScore,
  resolveInteractionCandidate,
  shouldPrioritizeOrderTarget,
  resolveOrderTimeLimitMs,
  resolveOrderCompletionBonus,
  resolveOrderKindCount,
  distributeRequirementCounts,
  resolveWaveConfig,
  selectPowerup,
  resolveOrderKinds,
  resolveOrderRequiredCount,
  COMBO_MILESTONES,
  FEVER_MAX_METER,
  addFeverMeter,
  isComboMilestone,
  resolveFeverScore,
} from "./gameRules";

describe("resolveWaveConfig", () => {
  it("starts with a guided target-only wave", () => {
    expect(resolveWaveConfig(0)).toEqual({
      targetWeight: 1,
      distractorWeight: 0,
      hazardWeight: 0,
      spawnIntervalMs: 1200,
      maxActive: 2,
      fallDurationMultiplier: 1,
      required: 3,
    });
  });

  it("introduces two-kind pressure before escalating hazards", () => {
    expect(resolveWaveConfig(2)).toMatchObject({
      targetWeight: 0.55,
      distractorWeight: 0.35,
      hazardWeight: 0.1,
      required: 5,
    });
    expect(resolveWaveConfig(4)).toMatchObject({
      targetWeight: 0.45,
      distractorWeight: 0.4,
      hazardWeight: 0.15,
      required: 6,
    });
  });

  it("caps late-game speed and order size", () => {
    const wave = resolveWaveConfig(100);
    expect(wave.spawnIntervalMs).toBe(580);
    expect(wave.fallDurationMultiplier).toBe(0.55);
    expect(wave.maxActive).toBe(7);
    expect(wave.required).toBe(10);
  });


  it("raises spawn pressure and fall speed at completed-order milestones", () => {
    const milestones = [0, 2, 4, 6, 9];
    const waves = milestones.map(resolveWaveConfig);

    expect(milestones.map(resolveDifficultyLevel)).toEqual([1, 2, 3, 4, 5]);
    for (let index = 1; index < waves.length; index += 1) {
      expect(waves[index].spawnIntervalMs).toBeLessThan(waves[index - 1].spawnIntervalMs);
      expect(waves[index].fallDurationMultiplier).toBeLessThan(
        waves[index - 1].fallDurationMultiplier,
      );
      expect(waves[index].maxActive).toBeGreaterThanOrEqual(waves[index - 1].maxActive);
    }
  });
});

describe("spawn fairness", () => {
  it("reserves the next available slot for a missing required target", () => {
    expect(
      shouldPrioritizeOrderTarget({
        remainingTargets: 2,
        activeTargetCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldPrioritizeOrderTarget({
        remainingTargets: 2,
        activeTargetCount: 1,
        missingTargetCount: 1,
      }),
    ).toBe(true);
    expect(
      shouldPrioritizeOrderTarget({
        remainingTargets: 0,
        activeTargetCount: 0,
      }),
    ).toBe(false);
  });
});

describe("combo and fever rules", () => {
  it("uses explicit combo milestones", () => {
    expect(COMBO_MILESTONES).toEqual([3, 5, 10, 15]);
    expect([3, 5, 10, 15].every(isComboMilestone)).toBe(true);
    expect(isComboMilestone(4)).toBe(false);
  });

  it("clamps fever meter and doubles active Fever score", () => {
    expect(addFeverMeter(90, 20)).toBe(FEVER_MAX_METER);
    expect(addFeverMeter(5, -20)).toBe(0);
    expect(resolveFeverScore(13, "normal")).toBe(13);
    expect(resolveFeverScore(13, "active")).toBe(26);
  });
});

describe("order lifecycle", () => {
  it("processes gameplay input only while an order is active", () => {
    expect(canProcessOrderInput("active")).toBe(true);
    expect(canProcessOrderInput("transition")).toBe(false);
  });

  it("unlocks additional order kinds without changing total requirement", () => {
    expect([0, 1, 2, 5, 6, 20].map(resolveOrderKindCount)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(distributeRequirementCounts(5, 2)).toEqual([3, 2]);
    expect(distributeRequirementCounts(8, 3)).toEqual([3, 3, 2]);
    expect(distributeRequirementCounts(3, 9)).toEqual([1, 1, 1]);
  });
});

describe("score and timer rules", () => {
  it("uses a visible action-scale score economy", () => {
    expect(BASE_HARVEST_SCORE).toBe(10);
    expect(ORDER_COMPLETE_BONUS).toBe(50);
    expect(ORDER_FAST_BONUS_MAX).toBe(50);
    expect(LIGHTNING_SCORE_PER_HAZARD).toBe(15);
  });

  it.each([
    [0, 1],
    [2, 1],
    [3, 1.25],
    [5, 1.25],
    [6, 1.5],
    [10, 2],
    [15, 2.5],
    [100, 2.5],
  ])("maps combo %i to multiplier %i", (combo, multiplier) => {
    expect(resolveComboMultiplier(combo)).toBe(multiplier);
  });

  it("derives harvest and fast-order rewards from pure formulas", () => {
    expect(resolveHarvestScore(1)).toBe(10);
    expect(resolveHarvestScore(3)).toBe(13);
    expect(resolveHarvestScore(10)).toBe(20);
    expect(resolveOrderCompletionBonus(0, 10_000)).toBe(50);
    expect(resolveOrderCompletionBonus(5000, 10_000)).toBe(75);
    expect(resolveOrderCompletionBonus(10_000, 10_000)).toBe(100);
  });

  it("scales the order timer with required targets", () => {
    expect(resolveOrderTimeLimitMs(3)).toBe(15_000);
    expect(resolveOrderTimeLimitMs(8)).toBe(20_000);
  });

  it("scales only the part of a frame covered by Slow Time", () => {
    expect(resolveGameplayDeltaMs(0, 5000, 5000)).toBe(2750);
    expect(resolveGameplayDeltaMs(4990, 50, 5000)).toBe(45.5);
    expect(resolveGameplayDeltaMs(5000, 50, 5000)).toBe(50);
  });
});

describe("overlap interaction policy", () => {
  it("prevents a hazard from stealing a valid target tap over a trivial distance", () => {
    const target = { id: "target", role: "target" as const, normalizedDistance: 0.5, zOrder: 0 };
    const hazard = { id: "hazard", role: "hazard" as const, normalizedDistance: 0.46, zOrder: 1 };

    expect(resolveInteractionCandidate([target, hazard])).toBe(target);
  });

  it("selects a centered hazard when a target only barely overlaps", () => {
    const target = { id: "target", role: "target" as const, normalizedDistance: 0.95, zOrder: 1 };
    const hazard = { id: "hazard", role: "hazard" as const, normalizedDistance: 0.1, zOrder: 0 };

    expect(resolveInteractionCandidate([target, hazard])).toBe(hazard);
  });

  it("prefers a valid target over a trivially closer distractor or pickup", () => {
    const target = { id: "target", role: "target" as const, normalizedDistance: 0.48, zOrder: 0 };
    const distractor = { id: "distractor", role: "distractor" as const, normalizedDistance: 0.42, zOrder: 2 };
    const pickup = { id: "pickup", role: "pickup" as const, normalizedDistance: 0.38, zOrder: 1 };

    expect(resolveInteractionCandidate([target, distractor, pickup])).toBe(target);
  });

  it("uses topmost z-order as the deterministic tie breaker", () => {
    const lower = { id: "lower", role: "distractor" as const, normalizedDistance: 0.3, zOrder: 1 };
    const upper = { id: "upper", role: "distractor" as const, normalizedDistance: 0.3, zOrder: 2 };

    expect(resolveInteractionCandidate([lower, upper])).toBe(upper);
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

describe("resolveOrderKinds", () => {
  const allKinds: import("./itemRegistry").ProduceId[] = ["mango", "apple", "pear", "strawberry", "guava"];
  const seededRandom = () => 0.1; // deterministic

  it("returns 1 kind for the two onboarding orders", () => {
    expect(resolveOrderKinds(0, allKinds, [], seededRandom)).toHaveLength(1);
    expect(resolveOrderKinds(1, allKinds, [], seededRandom)).toHaveLength(1);
  });

  it("returns 2 kinds for mid orders (2-5 completed)", () => {
    expect(resolveOrderKinds(2, allKinds, [], seededRandom)).toHaveLength(2);
    expect(resolveOrderKinds(5, allKinds, [], seededRandom)).toHaveLength(2);
  });

  it("returns 3 kinds for late orders (6+ completed)", () => {
    expect(resolveOrderKinds(6, allKinds, [], seededRandom)).toHaveLength(3);
    expect(resolveOrderKinds(100, allKinds, [], seededRandom)).toHaveLength(3);
  });

  it("returns distinct kinds", () => {
    const kinds = resolveOrderKinds(6, allKinds, [], Math.random);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("avoids repeating lastKinds when alternatives exist", () => {
    const last: import("./itemRegistry").ProduceId[] = ["mango"];
    for (let i = 0; i < 20; i++) {
      const kinds = resolveOrderKinds(0, allKinds, last, Math.random);
      expect(kinds).not.toContain("mango");
    }
  });
});

describe("resolveOrderRequiredCount", () => {
  it("single kind gets full required", () => {
    expect(resolveOrderRequiredCount(0, 5, 1)).toBe(5);
  });

  it("distributes required across kinds", () => {
    expect(resolveOrderRequiredCount(0, 5, 2)).toBe(3);
    expect(resolveOrderRequiredCount(1, 5, 2)).toBe(2);
  });

  it("3 kinds: 6 required → 2+2+2", () => {
    expect(resolveOrderRequiredCount(0, 6, 3)).toBe(2);
    expect(resolveOrderRequiredCount(1, 6, 3)).toBe(2);
    expect(resolveOrderRequiredCount(2, 6, 3)).toBe(2);
  });
});

describe("multi-order semantic invariants", () => {
  it("active target set excludes completed requirements", () => {
    const requirements: import("./gameRules").OrderRequirement[] = [
      { kind: "apple", required: 3, collected: 3 },
      { kind: "pear", required: 2, collected: 1 },
    ];
    const activeKinds = requirements
      .filter(r => r.collected < r.required)
      .map(r => r.kind);
    expect(activeKinds).toEqual(["pear"]);
    expect(activeKinds).not.toContain("apple");
  });

  it("order completes when all requirements are satisfied", () => {
    const requirements: import("./gameRules").OrderRequirement[] = [
      { kind: "apple", required: 2, collected: 2 },
      { kind: "pear", required: 2, collected: 2 },
    ];
    const allDone = requirements.every(r => r.collected >= r.required);
    expect(allDone).toBe(true);
  });

  it("keeps a long seeded order run bounded and playable", () => {
    const allKinds: import("./itemRegistry").ProduceId[] = ["mango", "apple", "pear", "strawberry", "guava"];
    let state = 0x51f15e;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    let lastKinds: import("./itemRegistry").ProduceId[] = [];

    for (let completedOrders = 0; completedOrders < 2_000; completedOrders += 1) {
      const wave = resolveWaveConfig(completedOrders);
      const kinds = resolveOrderKinds(completedOrders, allKinds, lastKinds, random);
      const requirements = kinds.map((kind, index) => ({
        kind,
        required: resolveOrderRequiredCount(index, wave.required, kinds.length),
      }));

      expect(kinds.length).toBeGreaterThan(0);
      expect(new Set(kinds).size).toBe(kinds.length);
      expect(requirements.every(({ required }) => required > 0)).toBe(true);
      expect(requirements.reduce((sum, { required }) => sum + required, 0)).toBe(wave.required);
      expect(resolveOrderTimeLimitMs(wave.required)).toBeGreaterThan(wave.required);
      lastKinds = kinds;
    }
  });
});
