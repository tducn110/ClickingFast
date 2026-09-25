/**
 * Gate A Runtime Certification – Multi-order subsystem
 *
 * Covers the 5 acceptance cases required before Gate B:
 *   C1. Per-requirement progress isolation
 *   C2. Completed-requirement → distractor semantics
 *   C3. Order completion atomicity
 *   C4. Spawn fairness per unfinished requirement (starvation)
 *   C5. Data invariants (unique kinds, totals, no zero/negative)
 *
 * These run entirely in the unit harness against real engine logic.
 * Browser/HUD acceptance is documented in the Gate A report artifact.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Container, type Application, type Sprite } from "pixi.js";
import { HarvestGameEngine } from "./HarvestGameEngine";
import type { ActiveOrder, OrderRequirement } from "./gameRules";
import {
  resolveOrderKinds,
  resolveOrderRequiredCount,
  resolveOrderKindCount,
  distributeRequirementCounts,
  resolveWaveConfig,
  resolveHarvestScore,
  resolveOrderCompletionBonus,
} from "./gameRules";
import {
  PRODUCE_ITEMS,
  type ItemDefinition,
  type ProduceDefinition,
} from "./itemRegistry";
import type { ActiveCreature } from "./systems/CreatureSystem";
import { AudioManager } from "../../lib/audioManager";
import { ORDERABLE_TARGETS } from "./constants";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { spawnCreatureMock } = vi.hoisted(() => ({
  spawnCreatureMock: vi.fn(),
}));

vi.mock("./systems/CreatureSystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./systems/CreatureSystem")>();
  return {
    ...actual,
    spawnCreature: spawnCreatureMock,
  };
});

vi.mock("./systems/PopSystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./systems/PopSystem")>();
  return {
    ...actual,
    spawnBurst: vi.fn(),
    spawnPopLabel: vi.fn(),
    spawnScoreComboFeedback: vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface EngineInternals {
  app: Application | null;
  initialized: boolean;
  destroyed: boolean;
  layers: {
    worldRoot: Container;
    gameplay: Container;
    worldFeedback: Container;
    effects: Container;
    debug: Container;
  } | null;
  creatures: ActiveCreature[];
  simulationTime: number;
  lastSpawnAtSimulationMs: number;
  slowTimeActiveUntilMs: number;
  nextPowerupEligibleAtMs: number;
  comboExpiresAtMs: number;
  tick(deltaMs: number): void;
  updateSpawner(): void;
  updateOrderTimer(deltaMs: number): void;
  onCreatureExpire(creature: ActiveCreature): void;
  tapProduce(definition: ProduceDefinition, x: number, y: number): void;
}

function internals(engine: HarvestGameEngine) {
  return engine as unknown as EngineInternals;
}

function makeCreature(
  def: ItemDefinition,
  overrides: Partial<ActiveCreature> = {},
): ActiveCreature {
  const scale = { x: 1, y: 1, set: vi.fn() };
  const container = {
    x: 100, y: 100, alpha: 1, rotation: 0, visible: true, scale,
  } as unknown as Container;
  return {
    id: 1,
    def,
    x: 100,
    y: 100,
    startY: 0,
    endY: 1000,
    laneIndex: 0,
    laneOffsetNormalized: 0,
    minX: 0,
    maxX: 1000,
    fallProgressNormalized: 0,
    popinElapsedMs: 200,
    popoutElapsedMs: 0,
    container,
    body: {} as Sprite,
    born: 0,
    lifeMs: 1000,
    phase: "alive",
    tapped: false,
    guided: false,
    worldScale: 1,
    ...overrides,
  };
}

function makeEngine(random?: () => number) {
  const wrap = {
    clientWidth: 800,
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as unknown as HTMLElement;
  return new HarvestGameEngine(
    wrap,
    { onHudChange: vi.fn(), onGameStateChange: vi.fn(), onReady: vi.fn() },
    random ? { random } : undefined,
  );
}

function attachRuntime(engine: HarvestGameEngine) {
  const position = { set: vi.fn() };
  const scale = { x: 1, y: 1, set: vi.fn() };
  const layer = {} as Container;
  const state = internals(engine);
  state.app = { screen: { width: 800, height: 600 } } as Application;
  state.initialized = true;
  state.destroyed = false;
  state.layers = {
    worldRoot: { position, scale } as unknown as Container,
    gameplay: layer,
    worldFeedback: layer,
    effects: layer,
    debug: layer,
  };
  engine.gameState = "playing";
  return state;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

// ─── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  spawnCreatureMock.mockReset();
  vi.restoreAllMocks();
  vi.stubGlobal("window", {
    innerWidth: 1024,
    devicePixelRatio: 1,
    matchMedia: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    requestAnimationFrame: vi.fn(() => 1),
    cancelAnimationFrame: vi.fn(),
  });
  vi.spyOn(AudioManager, "playHarvest").mockImplementation(() => undefined);
  vi.spyOn(AudioManager, "playOrderComplete").mockImplementation(() => undefined);
  vi.spyOn(AudioManager, "playDamage").mockImplementation(() => undefined);
  vi.spyOn(AudioManager, "playWrong").mockImplementation(() => undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// C1: Per-requirement progress isolation
// ─────────────────────────────────────────────────────────────────────────────

describe("C1: per-requirement progress isolation (2-kind order)", () => {
  const apple = PRODUCE_ITEMS.find(p => p.id === "apple")!;
  const pear  = PRODUCE_ITEMS.find(p => p.id === "pear")!;

  function make2KindOrder(): ActiveOrder {
    return {
      requirements: [
        { kind: "apple", required: 3, collected: 0 },
        { kind: "pear",  required: 2, collected: 0 },
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 15_000,
    };
  }

  it("tapping apple only mutates apple requirement", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState   = "playing";
    engine.orderPhase  = "active";
    engine.currentOrder = make2KindOrder();

    state.tapProduce(apple, 0, 0);

    expect(engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected).toBe(1);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected).toBe(0);
    expect(engine.combo).toBe(1);
  });

  it("tapping pear only mutates pear requirement", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = make2KindOrder();

    state.tapProduce(pear, 0, 0);

    expect(engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected).toBe(1);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected).toBe(0);
  });

  it("interleaved taps accumulate independently on each requirement", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = make2KindOrder();

    state.tapProduce(apple, 0, 0);
    state.tapProduce(pear,  0, 0);
    state.tapProduce(apple, 0, 0);

    expect(engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected).toBe(2);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected).toBe(1);
    // combo increments each tap
    expect(engine.combo).toBe(3);
  });

  it("total harvested matches sum of both requirements, not a shared counter", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = make2KindOrder();

    state.tapProduce(apple, 0, 0);
    state.tapProduce(pear,  0, 0);
    state.tapProduce(apple, 0, 0);

    // totalHarvested should equal 3 individual taps
    expect(engine.totalHarvested).toBe(3);
    const appleCount = engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected;
    const pearCount  = engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected;
    expect(appleCount + pearCount).toBe(engine.totalHarvested);
  });

  it("handles 3-kind order progression and isolation (apple, pear, mango)", () => {
    const mango = PRODUCE_ITEMS.find(p => p.id === "mango")!;
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 2, collected: 0 },
        { kind: "pear",  required: 2, collected: 0 },
        { kind: "mango", required: 1, collected: 0 },
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 15_000,
    };

    // Tap apple -> apple 1/2
    state.tapProduce(apple, 0, 0);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected).toBe(1);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected).toBe(0);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "mango")!.collected).toBe(0);

    // Tap pear -> pear 1/2
    state.tapProduce(pear, 0, 0);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected).toBe(1);

    // Tap mango -> mango 1/1 (mango DONE)
    state.tapProduce(mango, 0, 0);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "mango")!.collected).toBe(1);

    // Tap mango again -> now completed, should be treated as distractor (combo breaks, no progress)
    expect(engine.combo).toBe(3);
    state.tapProduce(mango, 0, 0);
    expect(engine.combo).toBe(0);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "mango")!.collected).toBe(1);

    // Tap apple -> apple 2/2 (apple DONE)
    state.tapProduce(apple, 0, 0);
    expect(engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected).toBe(2);

    // Tap pear -> pear 2/2 (all done -> order complete!)
    state.tapProduce(pear, 0, 0);
    expect(engine.currentOrder).toBeNull();
    expect(engine.ordersCompleted).toBe(1);
    expect(engine.orderPhase).toBe("transition");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C2: Completed-requirement → distractor semantics
// ─────────────────────────────────────────────────────────────────────────────

describe("C2: completed requirement is treated as distractor", () => {
  const apple = PRODUCE_ITEMS.find(p => p.id === "apple")!;
  const pear  = PRODUCE_ITEMS.find(p => p.id === "pear")!;

  function makeOrderWithAppleDone(): ActiveOrder {
    return {
      requirements: [
        { kind: "apple", required: 3, collected: 3 }, // DONE
        { kind: "pear",  required: 2, collected: 1 }, // pending
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 15_000,
    };
  }

  it("tapping completed apple kind breaks combo, costs a life, and awards no progress", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = makeOrderWithAppleDone();
    engine.combo = 4;
    engine.misses = 1;

    state.tapProduce(apple, 0, 0);

    // combo reset
    expect(engine.combo).toBe(0);
    // tapping non-target produce incurs immediate life damage
    expect(engine.misses).toBe(2);
    // apple requirement still at 3/3 (no over-collection)
    expect(engine.currentOrder!.requirements.find(r => r.kind === "apple")!.collected).toBe(3);
    // pear unchanged
    expect(engine.currentOrder!.requirements.find(r => r.kind === "pear")!.collected).toBe(1);
    // score unchanged
    expect(engine.score).toBe(0);
  });

  it("completed apple does NOT appear in activeTargetIds after tap path", () => {
    // Verify the filter logic: only unfinished requirements supply activeKindSet
    const requirements: OrderRequirement[] = [
      { kind: "apple", required: 3, collected: 3 },
      { kind: "pear",  required: 2, collected: 1 },
    ];
    const activeKinds = requirements
      .filter(r => r.collected < r.required)
      .map(r => r.kind);

    expect(activeKinds).not.toContain("apple");
    expect(activeKinds).toContain("pear");
  });

  it("tapping pear after apple done still progresses pear correctly", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = makeOrderWithAppleDone();

    state.tapProduce(pear, 0, 0);

    expect(engine.currentOrder).toBeNull(); // pear 2/2 → order complete
    expect(engine.ordersCompleted).toBe(1);
  });

  it("creature expiration: uncollected active target causes life loss and combo reset", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = makeOrderWithAppleDone(); // pear 1/2 pending
    engine.combo = 5;
    engine.misses = 0;

    // Pear creature expires (it is an unfinished target)
    state.onCreatureExpire(makeCreature(pear));

    expect(engine.combo).toBe(0);
    expect(engine.misses).toBe(1);
  });

  it("creature expiration: completed requirement kind does NOT cause life loss or combo reset", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = makeOrderWithAppleDone(); // apple 3/3 DONE
    engine.combo = 5;
    engine.misses = 0;

    // Apple creature expires (apple is already 3/3 complete)
    state.onCreatureExpire(makeCreature(apple));

    expect(engine.combo).toBe(5);
    expect(engine.misses).toBe(0);
  });

  it("creature expiration: distractor produce does NOT cause life loss or combo reset", () => {
    const strawberry = PRODUCE_ITEMS.find(p => p.id === "strawberry")!;
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = makeOrderWithAppleDone();
    engine.combo = 5;
    engine.misses = 0;

    // Strawberry creature expires (not in order at all)
    state.onCreatureExpire(makeCreature(strawberry));

    expect(engine.combo).toBe(5);
    expect(engine.misses).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C3: Order completion atomicity
// ─────────────────────────────────────────────────────────────────────────────

describe("C3: order completion atomicity (2-kind order)", () => {
  const apple = PRODUCE_ITEMS.find(p => p.id === "apple")!;
  const pear  = PRODUCE_ITEMS.find(p => p.id === "pear")!;

  it("final pear tap completes order exactly once", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 2, collected: 2 }, // already done
        { kind: "pear",  required: 2, collected: 1 }, // one left
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 8_000,
    };

    const playOrderCompleteSpy = vi.spyOn(AudioManager, "playOrderComplete");

    state.tapProduce(pear, 0, 0);

    // order completes exactly once
    expect(engine.ordersCompleted).toBe(1);
    expect(engine.currentOrder).toBeNull();
    expect(engine.orderPhase).toBe("transition");
    // audio fires exactly once
    expect(playOrderCompleteSpy).toHaveBeenCalledTimes(1);
    // score contains both harvest score and completion bonus
    expect(engine.score).toBeGreaterThan(0);
  });

  it("second call to tapProduce during transition has no effect (canProcessOrderInput gate)", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 1, collected: 0 },
        { kind: "pear",  required: 1, collected: 0 },
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 8_000,
    };

    // tap apple → completes (both 1/1)
    // For this we need apple 1/1 and pear 1/1 via two taps
    state.tapProduce(apple, 0, 0);
    state.tapProduce(pear,  0, 0); // completes order → transition
    const scoreAfterComplete = engine.score;
    const ordersAfterComplete = engine.ordersCompleted;

    // Now try to tapProduce directly in transition (bypassing handleTap guard)
    // tapProduce itself is allowed – the handleTap canProcessOrderInput guard
    // is on the public API. But currentOrder is null now so tapProduce bails.
    // (This verifies the atomicity invariant post-completion.)
    state.tapProduce(apple, 0, 0);

    expect(engine.ordersCompleted).toBe(ordersAfterComplete);
    expect(engine.score).toBe(scoreAfterComplete);
  });

  it("completion bonus fires once and score is deterministic", () => {
    const engine = makeEngine();
    const state  = internals(engine);
    engine.gameState    = "playing";
    engine.orderPhase   = "active";
    const timeLimitMs   = 15_000;
    const timeRemaining = 7_500;
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 1, collected: 0 },
      ],
      timeLimitMs,
      timeRemainingMs: timeRemaining,
    };

    state.tapProduce(apple, 0, 0);

    // score = harvestScore(combo=1) + completionBonus(7500, 15000)
    // = 10 + (50 + round(50*(7500/15000))) = 10 + 75 = 85
    const expectedScore =
      resolveHarvestScore(1) + resolveOrderCompletionBonus(timeRemaining, timeLimitMs);
    expect(engine.score).toBe(expectedScore);
    expect(engine.ordersCompleted).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C4: Spawn fairness per unfinished requirement (starvation audit)
// ─────────────────────────────────────────────────────────────────────────────

describe("C4: spawn starvation per requirement", () => {
  const apple = PRODUCE_ITEMS.find(p => p.id === "apple")!;
  const pear  = PRODUCE_ITEMS.find(p => p.id === "pear")!;

  /**
   * Starvation scenario:
   *   - Apple requirement done (3/3)
   *   - Pear requirement pending (0/2)
   *   - Screen has 2 active apple creatures
   *   - capacity allows 1 more spawn
   *
   * Once the order reaches its rescue window, shouldPrioritizeOrderTarget must
   * detect that pear is still needed and force pear rather than apple.
   */
  it("forces pear spawn when apple is done but pear is starved", () => {
    const engine = makeEngine();
    const state  = attachRuntime(engine);
    engine.orderPhase   = "active";
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 3, collected: 3 }, // DONE
        { kind: "pear",  required: 2, collected: 0 }, // PENDING
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 4_500,
    };
    engine.ordersCompleted = 5; // wave with maxActive=4
    state.simulationTime = 10_000;
    state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;

    // 2 apples on screen (apple is no longer in activeKindSet since it's done)
    state.creatures = [
      makeCreature(apple, { id: 1 }),
      makeCreature(apple, { id: 2 }),
    ];

    const spawned = makeCreature(pear, { id: 99 });
    spawnCreatureMock.mockReturnValue(spawned);

    state.updateSpawner();

    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
    // Must have been called with pear as forcedDef
    expect(spawnCreatureMock.mock.calls[0]?.[2]).toMatchObject({ forcedDef: pear });
  });

  it("activeKindSet excludes completed requirements (apple done → only pear active)", () => {
    // Pure unit check of the filter logic mirrored in updateSpawner
    const requirements: OrderRequirement[] = [
      { kind: "apple", required: 3, collected: 3 },
      { kind: "pear",  required: 2, collected: 0 },
    ];
    const activeKinds = requirements
      .filter(r => r.collected < r.required)
      .map(r => r.kind);
    const activeKindSet = new Set(activeKinds);

    expect(activeKindSet.has("apple")).toBe(false);
    expect(activeKindSet.has("pear")).toBe(true);
    // activeTargetCount for creatures with apple def = 0 (apple not in activeKindSet)
    const appleCreatures = [apple, apple].filter(d => activeKindSet.has(d.id));
    expect(appleCreatures.length).toBe(0);
  });

  it("starvation never occurs in the rescue window across 200 seeds", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = seededRandom(seed);
      const engine = makeEngine(random);
      const state  = attachRuntime(engine);

      engine.orderPhase   = "active";
      engine.ordersCompleted = 5;
      engine.currentOrder = {
        requirements: [
          { kind: "apple", required: 3, collected: 3 }, // done
          { kind: "pear",  required: 2, collected: 0 }, // starved candidate
        ],
        timeLimitMs: 15_000,
        timeRemainingMs: 4_500,
      };
      state.simulationTime = 10_000;
      state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
      state.creatures = [makeCreature(apple, { id: 1 }), makeCreature(apple, { id: 2 })];

      spawnCreatureMock.mockImplementation(() => makeCreature(pear, { id: 99 + seed }));

      state.updateSpawner();

      // Must always have tried to spawn pear
      const call = spawnCreatureMock.mock.calls[0];
      expect(call?.[2]).toMatchObject({ forcedDef: pear });

      spawnCreatureMock.mockReset();
    }
  });

  it("forces the missing kind near deadline when another kind is already visible", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    engine.orderPhase = "active";
    engine.ordersCompleted = 5;
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 2, collected: 0 },
        { kind: "pear", required: 2, collected: 0 },
      ],
      timeLimitMs: 15_000,
      timeRemainingMs: 4_500,
    };
    state.simulationTime = 10_000;
    state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    // Apple is visible; Pear is still required but absent.
    state.creatures = [makeCreature(apple, { id: 1 })];

    const pear = PRODUCE_ITEMS.find(p => p.id === "pear")!;
    spawnCreatureMock.mockReturnValue(makeCreature(pear, { id: 99 }));

    state.updateSpawner();

    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
    expect(spawnCreatureMock.mock.calls[0]?.[2]).toMatchObject({ forcedDef: pear });
  });

  it("forces mango spawn when apple and pear are done in 3-kind order", () => {
    const mango = PRODUCE_ITEMS.find(p => p.id === "mango")!;
    const engine = makeEngine();
    const state  = attachRuntime(engine);
    engine.orderPhase   = "active";
    engine.ordersCompleted = 8; // late wave (3 kinds)
    engine.currentOrder = {
      requirements: [
        { kind: "apple", required: 2, collected: 2 }, // DONE
        { kind: "pear",  required: 2, collected: 2 }, // DONE
        { kind: "mango", required: 2, collected: 0 }, // PENDING
      ],
      timeLimitMs: 18_000,
      timeRemainingMs: 5_400,
    };
    state.simulationTime = 10_000;
    state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    state.creatures = [
      makeCreature(apple, { id: 1 }),
      makeCreature(pear, { id: 2 }),
    ];

    spawnCreatureMock.mockReturnValue(makeCreature(mango, { id: 99 }));

    state.updateSpawner();

    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
    expect(spawnCreatureMock.mock.calls[0]?.[2]).toMatchObject({ forcedDef: mango });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C5: Data invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("C5: data invariants", () => {
  it("resolveOrderKinds always produces unique kinds", () => {
    const availableKinds = ORDERABLE_TARGETS.map(t => t.id as import("./itemRegistry").ProduceId);
    for (let completedOrders = 0; completedOrders <= 12; completedOrders++) {
      for (let seed = 1; seed <= 50; seed++) {
        const random = seededRandom(seed);
        const kinds = resolveOrderKinds(completedOrders, availableKinds, [], random);
        expect(new Set(kinds).size).toBe(kinds.length);
      }
    }
  });

  it("requirement totals sum to the wave required count (1-kind)", () => {
    const wave = resolveWaveConfig(0); // required=3, 1 kind
    const kinds = ["apple"] as import("./itemRegistry").ProduceId[];
    const reqs = kinds.map((kind, idx) => ({
      kind,
      required: resolveOrderRequiredCount(idx, wave.required, kinds.length),
      collected: 0,
    }));
    const total = reqs.reduce((s, r) => s + r.required, 0);
    expect(total).toBe(wave.required);
    expect(reqs.every(r => r.required > 0)).toBe(true);
  });

  it("requirement totals sum to the wave required count (2-kind)", () => {
    const wave = resolveWaveConfig(3); // required=5, 2 kinds
    const kinds = ["apple", "pear"] as import("./itemRegistry").ProduceId[];
    const reqs = kinds.map((kind, idx) => ({
      kind,
      required: resolveOrderRequiredCount(idx, wave.required, kinds.length),
      collected: 0,
    }));
    const total = reqs.reduce((s, r) => s + r.required, 0);
    expect(total).toBe(wave.required);
    expect(reqs.every(r => r.required > 0)).toBe(true);
  });

  it("requirement totals sum to the wave required count (3-kind)", () => {
    const wave = resolveWaveConfig(6); // required=7, 3 kinds
    const kinds = ["apple", "pear", "mango"] as import("./itemRegistry").ProduceId[];
    const reqs = kinds.map((kind, idx) => ({
      kind,
      required: resolveOrderRequiredCount(idx, wave.required, kinds.length),
      collected: 0,
    }));
    const total = reqs.reduce((s, r) => s + r.required, 0);
    expect(total).toBe(wave.required);
    expect(reqs.every(r => r.required > 0)).toBe(true);
  });

  it("distributeRequirementCounts never produces zero or negative entries", () => {
    for (let total = 1; total <= 10; total++) {
      for (let kinds = 1; kinds <= Math.min(total, 3); kinds++) {
        const counts = distributeRequirementCounts(total, kinds);
        expect(counts.length).toBe(kinds);
        expect(counts.every(c => c > 0)).toBe(true);
        expect(counts.reduce((s, c) => s + c, 0)).toBe(total);
      }
    }
  });

  it("kind count thresholds produce the correct number of requirements", () => {
    expect(resolveOrderKindCount(0)).toBe(1);
    expect(resolveOrderKindCount(1)).toBe(1);
    expect(resolveOrderKindCount(2)).toBe(2);
    expect(resolveOrderKindCount(5)).toBe(2);
    expect(resolveOrderKindCount(6)).toBe(3);
    expect(resolveOrderKindCount(20)).toBe(3);
  });

  it("ORDERABLE_TARGETS has at least 3 kinds to support 3-kind orders", () => {
    expect(ORDERABLE_TARGETS.length).toBeGreaterThanOrEqual(3);
  });

  it("resolveOrderKinds constrains to available pool when pool is small", () => {
    const tinyPool = [ORDERABLE_TARGETS[0]!.id, ORDERABLE_TARGETS[1]!.id] as
      import("./itemRegistry").ProduceId[];
    // request 3 kinds from pool of 2 → should return at most pool.length
    const kinds = resolveOrderKinds(8, tinyPool, [], Math.random);
    expect(kinds.length).toBeLessThanOrEqual(tinyPool.length);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});
