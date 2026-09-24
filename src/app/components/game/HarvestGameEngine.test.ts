import { beforeEach, describe, expect, it, vi } from "vitest";
import { Container, type Application, type Graphics, type Sprite } from "pixi.js";
import { HarvestGameEngine, type GameplayEvent } from "./HarvestGameEngine";
import { ActiveOrder } from "./gameRules";
import {
  HAZARD_ITEMS,
  POWERUP_ITEMS,
  PRODUCE_ITEMS,
  type ItemDefinition,
  type ProduceDefinition,
} from "./itemRegistry";
import type { ActiveCreature } from "./systems/CreatureSystem";
import { AudioManager } from "../../lib/audioManager";
import {
  BASE_HARVEST_SCORE,
  ORDER_COMPLETE_BONUS,
  resolveHarvestScore,
  resolveOrderCompletionBonus,
  resolveWaveConfig,
} from "./gameRules";

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
  targetWaitStartedAtMs: number | null;
  tick(deltaMs: number): void;
  updateSpawner(): void;
  updateOrderTimer(deltaMs: number): void;
  onCreatureExpire(creature: ActiveCreature): void;
  tapProduce(definition: ProduceDefinition, x: number, y: number): void;
  applyPowerup(id: "heart" | "lightning" | "slowTime", x: number, y: number): void;
  metrics: HarvestGameEngine["metrics"];
}

function internals(engine: HarvestGameEngine) {
  return engine as unknown as EngineInternals;
}

function makeOrder(target = PRODUCE_ITEMS[1]!, overrides: Partial<ActiveOrder> = {}): ActiveOrder {
  return {
    requirements: [{ kind: target.id, required: overrides.requirements ? overrides.requirements[0].required : 5, collected: 0 }],
    timeLimitMs: 15000,
    timeRemainingMs: 15000,
    ...overrides,
  };
}

function makeCreature(
  def: ItemDefinition,
  overrides: Partial<ActiveCreature> = {},
): ActiveCreature {
  const scale = { x: 1, y: 1, set: vi.fn() };
  const container = {
    x: 100,
    y: 100,
    alpha: 1,
    rotation: 0,
    visible: true,
    scale,
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

function makeEngine(random?: () => number, onGameplayEvent?: (event: GameplayEvent) => void) {
  const wrap = {
    clientWidth: 800,
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as unknown as HTMLElement;
  return new HarvestGameEngine(wrap, {
    onHudChange: vi.fn(),
    onGameStateChange: vi.fn(),
    onReady: vi.fn(),
    onGameplayEvent,
  }, random ? { random } : undefined);
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function attachRuntime(engine: HarvestGameEngine) {
  const position = { set: vi.fn() };
  const scale = { x: 1, y: 1, set: vi.fn() };
  const layer = {} as Container;
  const state = internals(engine);
  state.app = {
    screen: { width: 800, height: 600 },
    start: vi.fn(),
    stop: vi.fn(),
    render: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn() },
  } as unknown as Application;
  state.initialized = true;
  state.destroyed = false;
  state.layers = {
    worldRoot: {
      position,
      scale,
      toLocal: (point: { x: number; y: number }, _from?: unknown, out?: { x: number; y: number }) => {
        const result = out ?? { x: 0, y: 0 };
        result.x = point.x;
        result.y = point.y;
        return result;
      },
    } as unknown as Container,
    gameplay: layer,
    worldFeedback: layer,
    effects: layer,
    debug: layer,
  };
  engine.gameState = "playing";
  return state;
}

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
});

describe("spawn fairness integration", () => {
  it("reserves the next free slot after the target rescue wait", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);
    engine.ordersCompleted = 2;
    engine.gameTime = 1500;
    state.targetWaitStartedAtMs = 0;
    state.simulationTime = 2000;
    state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    state.creatures = [
      makeCreature(PRODUCE_ITEMS[0]!, { id: 10 }),
      makeCreature(PRODUCE_ITEMS[2]!, { id: 11 }),
      makeCreature(PRODUCE_ITEMS[3]!, { id: 13 }),
    ];
    const spawned = makeCreature(target, { id: 12 });
    spawnCreatureMock.mockReturnValue(spawned);

    state.updateSpawner();

    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
    expect(spawnCreatureMock.mock.calls[0]?.[2]).toMatchObject({ forcedDef: target });
    expect(state.creatures).toContain(spawned);
    expect(state.lastSpawnAtSimulationMs).toBe(2000);
  });

  it("retries a failed required-target admission on the next tick without looping", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);
    engine.ordersCompleted = 1;
    engine.gameTime = 1500;
    state.targetWaitStartedAtMs = 0;
    state.simulationTime = 2000;
    state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    state.creatures = [makeCreature(PRODUCE_ITEMS[0]!, { id: 10 })];
    spawnCreatureMock.mockReturnValue(null);

    state.updateSpawner();
    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
    expect(state.lastSpawnAtSimulationMs).toBe(Number.NEGATIVE_INFINITY);

    state.updateSpawner();
    expect(spawnCreatureMock).toHaveBeenCalledTimes(2);
    expect(spawnCreatureMock.mock.calls[1]?.[2]).toMatchObject({ forcedDef: target });
    expect(state.lastSpawnAtSimulationMs).toBe(Number.NEGATIVE_INFINITY);
  });

  it("admits a missing target within a bounded retry window across 1,000 seeds", () => {
    let worstRetryFrames = 0;

    for (let seed = 1; seed <= 1000; seed += 1) {
      const random = seededRandom(seed);
      const engine = makeEngine(random);
      const state = attachRuntime(engine);
      const target = PRODUCE_ITEMS[seed % PRODUCE_ITEMS.length]!;
      engine.orderPhase = "active";
      engine.currentOrder = makeOrder(target);
      engine.ordersCompleted = seed % 12;
      engine.gameTime = 2000;
      state.targetWaitStartedAtMs = 0;
      state.simulationTime = 10_000;
      state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;

      // Exercise the fairness guarantee with exactly one free slot, derived
      // from the authoritative difficulty curve rather than stale thresholds.
      const activeCapacity = Math.max(0, resolveWaveConfig(engine.ordersCompleted).maxActive - 1);
      const distractor = PRODUCE_ITEMS.find(({ id }) => id !== target.id)!;
      state.creatures = Array.from({ length: activeCapacity }, (_, index) =>
        makeCreature(distractor, { id: index + 1 }),
      );

      let retryFrames = 0;
      spawnCreatureMock.mockImplementation(() => {
        if (random() < 0.25) return null;
        return makeCreature(target, { id: 100 + retryFrames });
      });

      while (
        retryFrames < 32 &&
        !state.creatures.some(({ def, phase }) =>
          def.id === target.id && (phase === "alive" || phase === "popin"),
        )
      ) {
        const callsBeforeFrame = spawnCreatureMock.mock.calls.length;
        state.updateSpawner();
        retryFrames += 1;
        expect(spawnCreatureMock.mock.calls.length - callsBeforeFrame).toBeLessThanOrEqual(1);
      }

      expect(state.creatures.some(({ def }) => def.id === target.id)).toBe(true);
      worstRetryFrames = Math.max(worstRetryFrames, retryFrames);
      spawnCreatureMock.mockReset();
    }

    expect(worstRetryFrames).toBeLessThanOrEqual(8);
  });

  it("keeps a reachable hazard branch during late game", () => {
    const engine = makeEngine(() => 0.95);
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.ordersCompleted = 5;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);
    state.simulationTime = 2_000;
    state.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    state.creatures = [makeCreature(target, { id: 21 })];
    const hazard = makeCreature(HAZARD_ITEMS[0]!, { id: 22 });
    spawnCreatureMock.mockReturnValue(hazard);

    state.updateSpawner();

    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
    expect(spawnCreatureMock.mock.calls[0]?.[2]?.forcedDef).toMatchObject({ type: "bad" });
    expect(state.creatures).toContain(hazard);
    expect(state.metrics.lastSpawnDecision).toMatch(/^hazard:/);
  });

  it("lets a high combo open the next spawn sooner", () => {
    const engine = makeEngine(() => 0.95);
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.ordersCompleted = 4;
    engine.combo = 10;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);
    state.simulationTime = 700;
    state.lastSpawnAtSimulationMs = 0;
    state.creatures = [makeCreature(target, { id: 31 })];
    spawnCreatureMock.mockReturnValue(makeCreature(HAZARD_ITEMS[0]!, { id: 32 }));

    state.updateSpawner();

    expect(spawnCreatureMock).toHaveBeenCalledTimes(1);
  });
});

describe("clock semantics integration", () => {
  it("wires a partial Slow Time expiry frame through order, creature, and spawn clocks", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS[1]!;
    const creature = makeCreature(target);
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, { timeRemainingMs: 1000 });
    engine.gameTime = 4990;
    state.simulationTime = 4990;
    state.lastSpawnAtSimulationMs = 4990;
    state.slowTimeActiveUntilMs = 5000;
    state.creatures = [creature];

    state.tick(50);

    expect(engine.gameTime).toBe(5040);
    expect(state.simulationTime).toBe(5035.5);
    expect(engine.currentOrder?.timeRemainingMs).toBe(954.5);
    expect(creature.fallProgressNormalized).toBeCloseTo(0.0455, 6);
    expect(state.simulationTime - state.lastSpawnAtSimulationMs).toBe(45.5);
  });

  it("keeps the combo window on real active-play time during Slow Time", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder();
    engine.combo = 3;
    state.comboExpiresAtMs = 2500;
    state.slowTimeActiveUntilMs = 5000;
    state.lastSpawnAtSimulationMs = 0;

    for (let frame = 0; frame < 49; frame += 1) state.tick(50);
    expect(engine.gameTime).toBe(2450);
    expect(engine.combo).toBe(3);

    state.tick(50);
    expect(engine.gameTime).toBe(2500);
    expect(state.simulationTime).toBeCloseTo(1375, 8);
    expect(engine.combo).toBe(0);
  });
});

describe("swipe interaction integration", () => {
  it("resolves one entity only once in a gesture", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 2, collected: 0 }],
    });
    state.creatures = [makeCreature(target)];

    engine.handlePointerDown(100, 100, 42);
    engine.handlePointerMove(110, 100);

    expect(engine.currentOrder.requirements[0]?.collected).toBe(1);
    expect(engine.combo).toBe(1);
    expect(engine.metrics.swipeSegmentsProcessed).toBe(2);
    expect(engine.metrics.correctHitsPerMinute).toBe(0);
  });

  it("processes a pickup only once in a multi-segment swipe gesture", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 2, collected: 0 }],
    });
    engine.misses = 2;
    const heartCreature = makeCreature(POWERUP_ITEMS[0]!, { id: 77 });
    state.creatures = [heartCreature];

    engine.handlePointerDown(100, 100, 50);
    engine.handlePointerMove(110, 100);

    expect(engine.misses).toBe(1);
    expect(engine.metrics.powerupUsage).toBe(1);
  });

  it("stops a completed-order swipe before processing remaining overlap candidates", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    state.layers!.worldFeedback = { addChild: vi.fn() } as unknown as Container;
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 1, collected: 0 }],
      timeLimitMs: 10_000,
      timeRemainingMs: 10_000,
    });
    const targetCreature = makeCreature(target, { id: 11 });
    const hazardCreature = makeCreature(HAZARD_ITEMS[0]!, { id: 12 });
    state.creatures = [targetCreature, hazardCreature];

    engine.handlePointerDown(100, 100, 7);

    expect(engine.ordersCompleted).toBe(1);
    expect(engine.orderPhase).toBe("transition");
    expect(engine.misses).toBe(0);
    expect(hazardCreature.phase).toBe("alive");
  });

  it("records the hazard source in the shared failure telemetry", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 2, collected: 0 }],
    });
    state.creatures = [makeCreature(HAZARD_ITEMS[0]!)];

    engine.handlePointerDown(100, 100, 8);

    expect(engine.misses).toBe(1);
    expect(engine.failureReason).toBe("hazard");
    expect(engine.metrics.deathCause).toBe("hazard");
  });
});

describe("order transition isolation", () => {
  it("keeps HUD order snapshots immutable when engine progress mutates", () => {
    const engine = makeEngine();
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 2, collected: 0 }],
    });
    engine.orderPhase = "active";

    const snapshot = engine.getHudSnapshot();
    engine.currentOrder.requirements[0]!.collected = 1;

    expect(snapshot.currentOrder?.requirements[0]?.collected).toBe(0);
  });

  it("ignores taps for target, distractor, hazard, and pickup entities", () => {
    const engine = makeEngine();
    const state = internals(engine);
    const creatures = [
      makeCreature(PRODUCE_ITEMS[0]!, { id: 1 }),
      makeCreature(PRODUCE_ITEMS[1]!, { id: 2 }),
      makeCreature(HAZARD_ITEMS[0]!, { id: 3 }),
      makeCreature(POWERUP_ITEMS[0]!, { id: 4 }),
    ];
    state.creatures = creatures;
    engine.gameState = "playing";
    engine.orderPhase = "transition";
    engine.currentOrder = null;
    engine.score = 7;
    engine.combo = 2;
    engine.misses = 1;
    state.slowTimeActiveUntilMs = 99;
    state.nextPowerupEligibleAtMs = 123;

    for (const creature of creatures) engine.handleTap(creature.x, creature.y);

    expect(creatures.map(({ phase, tapped }) => ({ phase, tapped }))).toEqual(
      creatures.map(() => ({ phase: "alive", tapped: false })),
    );
    expect(engine.score).toBe(7);
    expect(engine.combo).toBe(2);
    expect(engine.misses).toBe(1);
    expect(state.slowTimeActiveUntilMs).toBe(99);
    expect(state.nextPowerupEligibleAtMs).toBe(123);
  });

  it("suppresses passive expiry consequences for every item type during transition", () => {
    const engine = makeEngine();
    const state = internals(engine);
    engine.orderPhase = "transition";
    engine.gameTime = 5000;
    engine.combo = 4;
    engine.misses = 1;
    state.nextPowerupEligibleAtMs = 123;

    for (const definition of [
      PRODUCE_ITEMS[0]!,
      PRODUCE_ITEMS[1]!,
      HAZARD_ITEMS[0]!,
      POWERUP_ITEMS[0]!,
    ]) {
      state.onCreatureExpire(makeCreature(definition));
    }

    expect(state.nextPowerupEligibleAtMs).toBe(123);
    expect(engine.combo).toBe(4);
    expect(engine.misses).toBe(1);
  });
});

describe("coordinate and overlap integration", () => {
  it("resolves a visual overlap using the current order target role", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    const target = PRODUCE_ITEMS[1]!;
    const worldRoot = new Container();
    state.layers!.worldRoot = worldRoot;
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);
    state.creatures = [
      makeCreature(target, {
        id: 1,
        x: 100,
        y: 100,
        container: Object.assign(makeCreature(target).container, { x: 100, y: 100 }),
      }),
      makeCreature(HAZARD_ITEMS[0]!, {
        id: 2,
        x: 104,
        y: 100,
        container: Object.assign(makeCreature(HAZARD_ITEMS[0]!).container, { x: 104, y: 100 }),
      }),
    ];

    engine.handleTap(103, 100);

    expect(engine.currentOrder!.requirements[0].collected).toBe(1);
    expect(engine.misses).toBe(0);
  });
});

describe("core action consequences", () => {
  it("emits semantic events for a correct target action", () => {
    const events: GameplayEvent[] = [];
    const engine = makeEngine(undefined, (event) => events.push(event));
    const state = internals(engine);
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);

    state.tapProduce(target, 0, 0);

    expect(events.map(({ type }) => type)).toEqual(["HARVEST", "COMBO"]);
  });


  it("charges one life immediately for tapping a distractor", () => {
    const events: GameplayEvent[] = [];
    const engine = makeEngine(undefined, (event) => events.push(event));
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    const distractor = PRODUCE_ITEMS[0]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);

    engine.gameTime = 1000;
    state.tapProduce(distractor, 0, 0);

    expect(engine.misses).toBe(1);
    expect(engine.failureReason).toBe("mistake-streak");
    expect(events.filter(({ type }) => type === "WRONG")).toHaveLength(1);
    expect(events[events.length - 1]).toMatchObject({
      type: "DAMAGE",
      source: "mistake-streak",
      misses: 1,
    });
  });

  it("awards integer harvest points from the combo score formula", () => {
    const engine = makeEngine();
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target);
    engine.combo = 2;

    state.tapProduce(target, 0, 0);

    expect(engine.combo).toBe(3);
    expect(engine.score).toBe(resolveHarvestScore(3));
    expect(Number.isInteger(engine.score)).toBe(true);
  });

  it("scores consecutive target hits as +1, +2, +3", () => {
    const events: GameplayEvent[] = [];
    const engine = makeEngine(undefined, (event) => events.push(event));
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: target.id, required: 5, collected: 0 }],
    });

    state.tapProduce(target, 0, 0);
    state.tapProduce(target, 0, 0);
    state.tapProduce(target, 0, 0);

    expect(engine.score).toBe(6);
    expect(
      events
        .filter((event): event is Extract<GameplayEvent, { type: "HARVEST" }> => event.type === "HARVEST")
        .map(({ points }) => points),
    ).toEqual([1, 2, 3]);
  });

  it("adds a visible fast-completion bonus based on remaining order time", () => {
    const engine = makeEngine();
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 1, collected: 0 }],
      
      timeLimitMs: 10_000,
      timeRemainingMs: 5000,
    });

    state.tapProduce(target, 0, 0);

    expect(engine.score).toBe(
      resolveHarvestScore(1) + resolveOrderCompletionBonus(5000, 10_000),
    );
  });

  it("applies the shorter combo window immediately at a difficulty boundary", () => {
    const engine = makeEngine();
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.ordersCompleted = 3;
    engine.gameTime = 1000;
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: target.id, required: 1, collected: 0 }],
    });

    state.tapProduce(target, 0, 0);

    expect(engine.ordersCompleted).toBe(4);
    expect(state.comboExpiresAtMs).toBe(3200);
    expect(engine.getHudSnapshot().comboWindow.durationMs).toBe(2200);
  });
});

describe("powerup consequence integration", () => {
  it("restores a missing life and converts a full-life Heart to score", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    engine.misses = 2;

    state.applyPowerup("heart", 0, 0);
    expect(engine.misses).toBe(1);
    expect(engine.score).toBe(0);

    engine.misses = 0;
    state.applyPowerup("heart", 0, 0);
    expect(engine.misses).toBe(0);
    expect(engine.score).toBe(1);
    expect(engine.metrics.powerupUsage).toBe(2);
  });

  it("clears every active hazard with Lightning while preserving combo", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    engine.combo = 6;
    const hazards = [
      makeCreature(HAZARD_ITEMS[0]!, { id: 31 }),
      makeCreature(HAZARD_ITEMS[1]!, { id: 32 }),
    ];
    state.creatures = hazards;

    state.applyPowerup("lightning", 0, 0);

    expect(engine.combo).toBe(6);
    expect(engine.score).toBe(hazards.length);
    expect(engine.misses).toBe(0);
    expect(hazards.every(({ phase }) => phase === "popout")).toBe(true);
  });

  it("applies Slow Time on the gameplay clock without changing combo timing", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    engine.gameTime = 1_000;
    engine.combo = 2;
    state.comboExpiresAtMs = 3_500;

    state.applyPowerup("slowTime", 0, 0);

    expect(state.slowTimeActiveUntilMs).toBe(6_000);
    expect(state.comboExpiresAtMs).toBe(3_500);
    expect(engine.metrics.powerupUsage).toBe(1);
  });
});

describe("order completion race", () => {
  it("clamps a terminal order timeout and closes the dead order", () => {
    const engine = makeEngine();
    const state = attachRuntime(engine);
    state.layers!.worldFeedback = { addChild: vi.fn() } as unknown as Container;
    const target = PRODUCE_ITEMS.find((item) => item.id === "apple")!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.misses = 4;
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 1, collected: 0 }],
      timeRemainingMs: 5,
    });

    state.updateOrderTimer(50);

    expect(engine.gameState).toBe("dead");
    expect(engine.currentOrder).toBeNull();
    expect(engine.orderPhase).toBe("transition");
  });

  it("lets a final hit already processed at the deadline win over timeout", () => {
    const engine = makeEngine();
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 1, collected: 0 }],
      
      timeRemainingMs: 0,
    });

    state.tapProduce(target, 0, 0);
    state.updateOrderTimer(50);

    expect(engine.ordersCompleted).toBe(1);
    expect(engine.score).toBe(BASE_HARVEST_SCORE + ORDER_COMPLETE_BONUS);
    expect(engine.misses).toBe(0);
    expect(engine.currentOrder).toBeNull();
    expect(engine.orderPhase).toBe("transition");
  });

  it("keeps timeout authoritative when it is processed before the final hit", () => {
    const engine = makeEngine();
    const state = internals(engine);
    const target = PRODUCE_ITEMS[1]!;
    engine.gameState = "playing";
    engine.orderPhase = "active";
    engine.currentOrder = makeOrder(target, {
      requirements: [{ kind: "apple", required: 1, collected: 0 }],
      
      timeRemainingMs: 0,
    });

    state.updateOrderTimer(50);
    state.tapProduce(target, 0, 0);

    expect(engine.ordersCompleted).toBe(0);
    expect(engine.score).toBe(0);
    expect(engine.misses).toBe(1);
    expect(engine.currentOrder).toBeNull();
    expect(engine.orderPhase).toBe("transition");
  });
});
