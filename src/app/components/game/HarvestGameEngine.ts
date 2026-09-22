import "pixi.js/prepare";
import {
  Application,
  Container,
  Graphics,
  Point,
  Text,
  TextStyle,
  Texture,
  type Ticker,
} from "pixi.js";
import {
  destroyPopSystem,
  destroyPopPools,
  spawnBurst,
  spawnPopLabel,
  spawnScoreComboFeedback,
  updateDots,
  updatePopLabels,
  type DotParticle,
  type PopLabel,
} from "./systems/PopSystem";
import {
  collectHitCandidates,
  collectSwipeHitCandidates,
  destroyCreatureSystemResources,
  preloadCreatureTextures,
  recycleCreatureVisual,
  remapCreaturesToBounds,
  spawnCreature,
  updateCreatures,
  type ActiveCreature,
  type GameplayBounds,
} from "./systems/CreatureSystem";
import { MAX_MISSES, ORDERABLE_TARGETS } from "./constants";
import {
  ProduceId,
  HAZARD_ITEMS,
  POWERUP_ITEMS,
  PRODUCE_ITEMS,
  type HazardDefinition,
  type ItemDefinition,
  type ItemId,
  type PowerupId,
  type ProduceDefinition,
} from "./itemRegistry";
import {
  ActiveOrder,
  BASE_HARVEST_SCORE,
  addFeverMeter,
  FEVER_DURATION_MS,
  FEVER_ENTERING_MS,
  FEVER_EXITING_MS,
  FEVER_MAX_METER,
  FEVER_SPAWN_INTERVAL_SCALE,
  isComboMilestone,
  resolveOrderKinds,
  resolveOrderRequiredCount,
  canProcessOrderInput,
  COMBO_WINDOW_MS,
  DAMAGE_GRACE_MS,
  LIGHTNING_SCORE_PER_HAZARD,
  ORDER_COMPLETE_BONUS,
  ORDER_TRANSITION_MS,
  POWERUP_COOLDOWN_MS,
  POWERUP_PITY_MS,
  POWERUP_SPAWN_CHANCE,
  SLOW_TIME_DURATION_MS,
  resolveComboMultiplier,
  resolveDifficultyLevel,
  resolveGameplayDeltaMs,
  resolveHarvestScore,
  resolveFeverScore,
  resolveInteractionBias,
  resolveOrderCompletionBonus,
  resolveOrderTimeLimitMs,
  resolveWaveConfig,
  resolveInteractionCandidate,
  selectPowerup,
  shouldPrioritizeOrderTarget,
  type OrderPhase,
  type FeverState,
} from "./gameRules";

import { AudioManager } from "../../lib/audioManager";
import i18n from "../../../i18n";
import { screenToGameplayPoint } from "./coordinateAdapter";

function isEnglishUi() {
  return i18n.resolvedLanguage === "en";
}

function uiText(vietnamese: string, english: string) {
  return isEnglishUi() ? english : vietnamese;
}

interface StageLayers {
  worldRoot: Container;
  gameplay: Container;
  worldFeedback: Container;
  effects: Container;
  debug: Container;
}

interface PrepareCapableRenderer {
  prepare?: { upload: (resources: Texture[]) => Promise<void> };
}

interface CenterLabel {
  text: Text;
  ageMs: number;
  lifetimeMs: number;
  startY: number;
}

export interface GameplayViewportMetrics {
  left: number;
  top: number;
  cssWidth: number;
  cssHeight: number;
  rendererWidth: number;
  rendererHeight: number;
  gameplayBounds: GameplayBounds;
}

export type GameState =
  | "login"
  | "loading"
  | "idle"
  | "playing"
  | "dead"
  | "paused"
  | "countdown";

export type FailureReason = "hazard" | "order-timeout" | "missed-target";

export type GameplayEvent =
  | { type: "HARVEST"; kind: ProduceId; points: number; combo: number; fever: boolean }
  | { type: "WRONG"; kind: ItemId; fever: boolean }
  | { type: "DAMAGE"; source: "hazard" | "order-timeout" | "missed-target"; misses: number }
  | { type: "COMBO"; combo: number; multiplier: number }
  | { type: "COMBO_MILESTONE"; combo: number }
  | { type: "ORDER_COMPLETE"; ordersCompleted: number; bonus: number }
  | { type: "POWERUP"; id: PowerupId; value: number }
  | { type: "FEVER_START" }
  | { type: "FEVER_END" }
  | { type: "SWIPE_START"; id: number }
  | { type: "SWIPE_END"; id: number; hits: number };

export interface GameplayMetrics {
  orderId: number;
  targetWaitMs: number[];
  targetWaitP50Ms: number;
  targetWaitP95Ms: number;
  orderCompletionMs: number[];
  actions: number;
  correctHits: number;
  correctHitsPerMinute: number;
  wrongTaps: number;
  hazardHits: number;
  orderCompletions: number;
  orderFailures: number;
  comboSamples: number[];
  powerupUsage: number;
  lastInteraction: string;
  activeCreatures: number;
  activeTargets: number;
  activeDistractors: number;
  activeHazards: number;
  activePickups: number;
  gameTime: number;
  simulationTime: number;
  lastSpawnDecision: string;
  targetGuaranteeTriggered: number;
  actionsPerSecond: number;
  wrongTapRate: number;
  hazardHitsPerMinute: number;
  orderFailureRate: number;
  comboAverage: number;
  comboP95: number;
  deathCause: FailureReason | null;
  feverActivations: number;
  targetPresenceRatio: number;
  screenOccupancy: number;
  hitCandidatesChecked: number;
  swipeSegmentsProcessed: number;
}


export interface HudSnapshot {
  score: number;
  combo: number;
  comboMultiplier: number;
  misses: number;
  ordersCompleted: number;
  orderPhase: OrderPhase;
  currentOrder: ActiveOrder | null;
  slowTime: {
    active: boolean;
    remainingMs: number;
  };
  comboWindow: {
    active: boolean;
    remainingMs: number;
    durationMs: number;
    revision: number;
  };
  shakeTrigger: number;
  fever: {
    state: FeverState;
    meter: number;
    remainingMs: number;
  };
  failureReason: FailureReason | null;
  metrics: GameplayMetrics;
}

export interface EngineCallbacks {
  onHudChange: (snapshot: HudSnapshot) => void;
  onGameStateChange: (state: GameState) => void;
  onReady: () => void;
  onGameplayEvent?: (event: GameplayEvent) => void;
}

const HUD_EMIT_INTERVAL_MS = 220;
const MOBILE_HUD_EMIT_INTERVAL_MS = 300;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickOne<T>(items: T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)];
}

export class HarvestGameEngine {
  private readonly wrap: HTMLElement;
  private readonly callbacks: EngineCallbacks;
  private readonly random: () => number;
  private readonly mobilePerformanceMode: boolean;
  private readonly hudEmitIntervalMs: number;
  private reducedMotion = false;
  private mediaQuery: MediaQueryList | null = null;
  private handleMotionChange = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
  };

  public app: Application | null = null;
  private destroyed = false;
  private initialized = false;
  private layers: StageLayers | null = null;
  private flashGraphics: Graphics | null = null;

  private creatures: ActiveCreature[] = [];
  private popLabels: PopLabel[] = [];
  private dotParticles: DotParticle[] = [];
  private centerLabels: CenterLabel[] = [];
  private centerLabelPool: Text[] = [];
  private centerStyleCache = new Map<string, TextStyle>();
  private viewportMetrics: GameplayViewportMetrics | null = null;
  private tapPoint = new Point();
  private localTapPoint = new Point();
  private activeTargetIds = new Set<ItemId>();
  private swipePoints: Array<{ x: number; y: number }> = [];
  private swipeHitEntityIds = new Set<number>();
  private swipeId = 0;
  private swipeScoringTerminated = false;
  private readonly maxSwipePoints = 12;

  public gameTime = 0;
  public score = 0;
  public misses = 0;
  public combo = 0;
  public ordersCompleted = 0;
  public currentOrder: ActiveOrder | null = null;
  public orderPhase: OrderPhase = "transition";
  public gameState: GameState = "loading";
  public highestCombo = 0;
  public totalHarvested = 0;
  public harvestedCounts: Partial<Record<ItemId, number>> = {};
  public feverState: FeverState = "normal";
  public feverMeter = 0;
  public failureReason: FailureReason | null = null;
  public readonly metrics: GameplayMetrics = {
    orderId: 0,
    targetWaitMs: [],
    targetWaitP50Ms: 0,
    targetWaitP95Ms: 0,
    orderCompletionMs: [],
    actions: 0,
    correctHits: 0,
    correctHitsPerMinute: 0,
    wrongTaps: 0,
    hazardHits: 0,
    orderCompletions: 0,
    orderFailures: 0,
    comboSamples: [],
    powerupUsage: 0,
    lastInteraction: "none",
    activeCreatures: 0,
    activeTargets: 0,
    activeDistractors: 0,
    activeHazards: 0,
    activePickups: 0,
    gameTime: 0,
    simulationTime: 0,
    lastSpawnDecision: "none",
    targetGuaranteeTriggered: 0,
    actionsPerSecond: 0,
    wrongTapRate: 0,
    hazardHitsPerMinute: 0,
    orderFailureRate: 0,
    comboAverage: 0,
    comboP95: 0,
    deathCause: null,
    feverActivations: 0,
    targetPresenceRatio: 0,
    screenOccupancy: 0,
    hitCandidatesChecked: 0,
    swipeSegmentsProcessed: 0,
  };

  private gameplayBounds: GameplayBounds | null = null;
  private simulationTime = 0;
  private lastKinds: ProduceId[] = [];
  private lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
  private comboExpiresAtMs = 0;
  private pendingOrderStartAtMs: number | null = null;
  private damageGraceUntilMs = 0;
  private slowTimeActiveUntilMs = 0;
  private nextPowerupEligibleAtMs = Number.POSITIVE_INFINITY;
  private lastPowerupSpawnAtMs = 0;
  private lastHudEmitAtMs = Number.NEGATIVE_INFINITY;
  private hudFrameId = 0;
  private comboRevision = 0;
  private tickerCallback = (ticker: Ticker) => this.tick(Math.min(50, ticker.deltaMS));

  private shakeRemainingMs = 0;
  private shakeDurationMs = 0;
  private shakeIntensity = 0;
  private shakeTriggerCounter = 0;
  private feverStateUntilMs = 0;
  private comboFrozenRemainingMs: number | null = null;
  private targetWaitStartedAtMs: number | null = null;
  private orderStartedAtMs = 0;
  private orderId = 0;
  private metricsLastGameTime = 0;
  private targetPresentMs = 0;
  private targetWaitSampleRevision = 0;
  private targetWaitPercentileRevision = -1;
  private comboPercentileRevision = -1;
  // Tracks when each completed requirement kind becomes eligible to spawn as a
  // distractor again. Without this, a fruit whose requirement just filled can
  // immediately appear as a distractor, which feels like an unfair "bait-and-switch".
  private completedKindCooldownUntilMs = new Map<ProduceId, number>();

  private stageEffectClockMs = 0;
  private stageTransformActive = false;
  private flashRemainingMs = 0;

  constructor(
    wrap: HTMLElement,
    callbacks: EngineCallbacks,
    options?: { random?: () => number },
  ) {
    this.wrap = wrap;
    this.callbacks = callbacks;
    this.random = options?.random ?? Math.random;
    this.mobilePerformanceMode =
      window.innerWidth <= 768 ||
      Boolean(window.matchMedia?.("(pointer: coarse)").matches);
    this.hudEmitIntervalMs = this.mobilePerformanceMode
      ? MOBILE_HUD_EMIT_INTERVAL_MS
      : HUD_EMIT_INTERVAL_MS;
    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.reducedMotion = this.mediaQuery.matches;
      this.mediaQuery.addEventListener("change", this.handleMotionChange);
    }
  }

  public async init() {
    this.app = new Application();
    const app = this.app;
    const initialWidth = this.wrap.clientWidth || 800;
    const initialHeight = this.wrap.clientHeight || 600;

    try {
      await app.init({
        width: initialWidth,
        height: initialHeight,
        background: 0x000000,
        backgroundAlpha: 0,
        antialias: !this.mobilePerformanceMode,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        powerPreference: "high-performance",
        autoStart: false,
        gcMaxUnusedTime: 60_000,
        gcFrequency: 30_000,
      });
    } catch (error) {
      if (this.app === app) this.app = null;
      try {
        app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
      } catch {
        // Pixi can fail before the renderer exists; cleanup must stay best-effort.
      }
      throw error;
    }

    if (this.destroyed || this.app !== app) {
      app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
      return;
    }

    this.initialized = true;
    app.ticker.maxFPS = 60;
    app.ticker.minFPS = 20;
    app.stop();
    this.wrap.appendChild(app.canvas);
    app.stage.eventMode = "none";
    app.stage.interactiveChildren = false;

    const worldRoot = new Container({ label: "worldRoot" });
    this.layers = {
      worldRoot,
      gameplay: new Container({ label: "gameplayLayer" }),
      worldFeedback: new Container({ label: "worldFeedbackLayer" }),
      effects: new Container({ label: "effectsLayer" }),
      debug: new Container({ label: "debugLayer" }),
    };
    worldRoot.addChild(
      this.layers.gameplay,
      this.layers.worldFeedback,
      this.layers.effects,
    );
    app.stage.addChild(
      worldRoot,
      this.layers.debug,
    );
    this.createReusableStageObjects();
    this.layoutEffects(app.screen.width, app.screen.height);

    try {
      const creatureTextures = await preloadCreatureTextures([
        ...PRODUCE_ITEMS,
        ...HAZARD_ITEMS,
        ...POWERUP_ITEMS,
      ]);
      if (this.destroyed || this.app !== app || !this.initialized) return;

      const renderer = app.renderer as typeof app.renderer & PrepareCapableRenderer;
      if (renderer.prepare) {
        await renderer.prepare.upload(creatureTextures);
      }
    } catch (error) {
      this.disposeFailedInit(app);
      throw error;
    }

    if (this.destroyed || this.app !== app || !this.initialized) return;
    app.ticker.add(this.tickerCallback);
    this.callbacks.onReady();
  }

  private disposeFailedInit(app: Application) {
    if (this.app === app) {
      this.app = null;
      this.initialized = false;
      this.layers = null;
    }
    try {
      // Keep global Pixi resources (Assets.cache) so a retry reuses any
      // texture that already loaded; GPU buffers are freed with the app.
      app.destroy({ removeView: true });
    } catch {
      // Pixi can fail before the renderer exists; cleanup must stay best-effort.
    }
  }

  private tick(deltaMs: number) {
    if (!this.app || !this.initialized || this.destroyed) return;
    this.updateStageEffects(deltaMs);
    if (this.gameState !== "playing") return;

    const gameplayDeltaMs = resolveGameplayDeltaMs(
      this.gameTime,
      deltaMs,
      this.slowTimeActiveUntilMs,
    );
    this.gameTime += deltaMs;
    this.simulationTime += gameplayDeltaMs;
    // Combo intentionally follows real active-play time, even while Slow Time
    // scales the order, creature, and spawn simulation clocks.
    this.updateComboWindow();
    this.updateFever();
    this.updatePendingOrder();
    this.updateOrderTimer(gameplayDeltaMs);
    if (this.gameState !== "playing") return;
    this.updateSpawner();

    updateCreatures(
      this.creatures,
      this.simulationTime,
      gameplayDeltaMs,
      1,
      (creature) => this.onCreatureExpire(creature),
    );
    updatePopLabels(this.popLabels, deltaMs);
    updateDots(this.dotParticles, deltaMs);
    this.updateCenterLabels(deltaMs);
    this.updateMetricsSnapshot();
    this.emitHud();
  }

  public startGame() {
    this.score = 0;
    this.misses = 0;
    this.combo = 0;
    this.ordersCompleted = 0;
    this.currentOrder = null;
    this.orderPhase = "transition";
    this.lastKinds = [];
    this.highestCombo = 0;
    this.totalHarvested = 0;
    this.harvestedCounts = {};
    this.gameTime = 0;
    this.simulationTime = 0;
    this.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    this.comboExpiresAtMs = 0;
    this.pendingOrderStartAtMs = null;
    this.damageGraceUntilMs = 0;
    this.slowTimeActiveUntilMs = 0;
    this.nextPowerupEligibleAtMs = Number.POSITIVE_INFINITY;
    this.lastPowerupSpawnAtMs = 0;
    this.lastHudEmitAtMs = Number.NEGATIVE_INFINITY;
    this.comboRevision += 1;
    this.feverState = "normal";
    this.feverMeter = 0;
    this.feverStateUntilMs = 0;
    this.comboFrozenRemainingMs = null;
    this.failureReason = null;
    this.orderStartedAtMs = 0;
    this.orderId = 0;
    this.swipePoints.length = 0;
    this.swipeHitEntityIds.clear();
    this.swipeScoringTerminated = false;
    this.metrics.targetWaitMs.length = 0;
    this.metrics.targetWaitP50Ms = 0;
    this.metrics.targetWaitP95Ms = 0;
    this.metrics.orderCompletionMs.length = 0;
    this.metrics.comboSamples.length = 0;
    this.metrics.actions = 0;
    this.metrics.correctHits = 0;
    this.metrics.correctHitsPerMinute = 0;
    this.metrics.wrongTaps = 0;
    this.metrics.hazardHits = 0;
    this.metrics.orderCompletions = 0;
    this.metrics.orderFailures = 0;
    this.metrics.powerupUsage = 0;
    this.metrics.lastInteraction = "none";
    this.metrics.orderId = 0;
    this.metrics.lastSpawnDecision = "none";
    this.metrics.targetGuaranteeTriggered = 0;
    this.metrics.actionsPerSecond = 0;
    this.metrics.wrongTapRate = 0;
    this.metrics.hazardHitsPerMinute = 0;
    this.metrics.orderFailureRate = 0;
    this.metrics.comboAverage = 0;
    this.metrics.comboP95 = 0;
    this.metrics.deathCause = null;
    this.metrics.feverActivations = 0;
    this.metrics.targetPresenceRatio = 0;
    this.metrics.screenOccupancy = 0;
    this.metrics.hitCandidatesChecked = 0;
    this.metrics.swipeSegmentsProcessed = 0;
    this.metricsLastGameTime = 0;
    this.targetPresentMs = 0;
    this.targetWaitSampleRevision = 0;
    this.targetWaitPercentileRevision = -1;
    this.comboPercentileRevision = -1;
    this.flashRemainingMs = 0;
    this.resetStageTransform();
    this.clearActiveEntities();
    this.startNewOrder();
    this.setGameState("playing");
  }

  public reviveRun(options?: { restoreLives?: number; minOrderTimeMs?: number }) {
    const restoreLives = options?.restoreLives ?? MAX_MISSES;
    const minOrderTimeMs = options?.minOrderTimeMs ?? 6000;
    this.misses = Math.max(0, MAX_MISSES - restoreLives);
    this.damageGraceUntilMs = this.gameTime + 1500;
    this.pendingOrderStartAtMs = null;
    this.clearActiveEntities();

    if (!this.currentOrder) {
      this.startNewOrder();
    } else {
      this.orderPhase = "active";
      this.currentOrder.timeRemainingMs = Math.max(
        minOrderTimeMs,
        this.currentOrder.timeRemainingMs,
      );
    }
    if (this.ordersCompleted >= 1) {
      this.nextPowerupEligibleAtMs = this.gameTime + POWERUP_COOLDOWN_MS;
      this.lastPowerupSpawnAtMs = this.gameTime;
    }
    this.emitHud(true);
  }

  public clearActiveEntities() {
    for (const creature of this.creatures) recycleCreatureVisual(creature);
    this.creatures.length = 0;
    destroyPopSystem(this.popLabels, this.dotParticles);
    this.releaseAllCenterLabels();
  }

  public getHudSnapshot(): HudSnapshot {
    return {
      score: this.score,
      combo: this.combo,
      comboMultiplier: resolveComboMultiplier(this.combo),
      misses: this.misses,
      ordersCompleted: this.ordersCompleted,
      orderPhase: this.orderPhase,
      currentOrder: this.currentOrder
        ? {
            ...this.currentOrder,
            requirements: this.currentOrder.requirements.map((requirement) => ({ ...requirement })),
          }
        : null,
      slowTime: {
        active: this.slowTimeActiveUntilMs > this.gameTime,
        remainingMs: Math.max(0, this.slowTimeActiveUntilMs - this.gameTime),
      },
      comboWindow: {
        active: this.combo > 0 && this.comboExpiresAtMs > this.gameTime,
        remainingMs:
          this.combo > 0 ? Math.max(0, this.comboExpiresAtMs - this.gameTime) : 0,
        durationMs: COMBO_WINDOW_MS,
        revision: this.comboRevision,
      },
      shakeTrigger: this.shakeTriggerCounter,
      fever: {
        state: this.feverState,
        meter: this.feverMeter,
        remainingMs: this.feverState === "normal"
          ? 0
          : Math.max(0, this.feverStateUntilMs - this.gameTime),
      },
      failureReason: this.failureReason,
      metrics: {
        ...this.metrics,
        targetWaitMs: [...this.metrics.targetWaitMs],
        orderCompletionMs: [...this.metrics.orderCompletionMs],
        comboSamples: [...this.metrics.comboSamples],
      },
    };
  }

  private emitGameplayEvent(event: GameplayEvent) {
    this.callbacks.onGameplayEvent?.(event);
  }

  public setGameState(state: GameState) {
    if (this.gameState === state) return;
    if (state === "dead" && this.feverState !== "normal") {
      this.feverState = "normal";
      this.feverStateUntilMs = 0;
      this.feverMeter = 0;
      this.comboFrozenRemainingMs = null;
      this.emitGameplayEvent({ type: "FEVER_END" });
    }
    this.gameState = state;
    if (state !== "playing") {
      this.resetStageTransform();
      this.handlePointerUp();
    }
    this.syncTickerState();
    this.callbacks.onGameStateChange(state);
    this.emitHud(true);
  }

  public handleTap(clientX: number, clientY: number) {
    if (
      this.gameState !== "playing" ||
      !canProcessOrderInput(this.orderPhase) ||
      !this.currentOrder ||
      !this.app ||
      !this.initialized ||
      !this.layers
    ) {
      return;
    }
    this.mapClientPoint(clientX, clientY);
    this.processTapPoint(this.localTapPoint.x, this.localTapPoint.y);
  }

  private canProcessInteraction() {
    return Boolean(
      this.gameState === "playing" &&
      canProcessOrderInput(this.orderPhase) &&
      this.currentOrder &&
      this.app &&
      this.initialized &&
      this.layers,
    );
  }

  private mapClientPoint(clientX: number, clientY: number) {
    if (!this.app || !this.layers) return false;
    const viewport = this.viewportMetrics ?? (() => {
      const rect = this.wrap.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        cssWidth: rect.width,
        cssHeight: rect.height,
        rendererWidth: this.app!.screen.width,
        rendererHeight: this.app!.screen.height,
      };
    })();
    screenToGameplayPoint(
      { clientX, clientY },
      viewport,
      this.layers.worldRoot,
      this.tapPoint,
      this.localTapPoint,
    );
    return true;
  }

  private refreshActiveTargetIds() {
    this.activeTargetIds.clear();
    this.currentOrder?.requirements
      .filter((requirement) => requirement.collected < requirement.required)
      .forEach((requirement) => this.activeTargetIds.add(requirement.kind));
  }

  private processTapPoint(x: number, y: number) {
    this.refreshActiveTargetIds();
    const candidates = collectHitCandidates(
      this.creatures,
      x,
      y,
      this.activeTargetIds,
    );
    this.metrics.hitCandidatesChecked += this.creatures.length;
    const bias = resolveInteractionBias(this.ordersCompleted);
    const creature = resolveInteractionCandidate(candidates, bias)?.creature ?? null;
    if (creature) this.tapCreature(creature);
  }

  public handlePointerDown(clientX: number, clientY: number, gestureId = this.swipeId + 1) {
    if (!this.canProcessInteraction() || !this.mapClientPoint(clientX, clientY)) return;
    this.swipeId = gestureId;
    this.swipePoints.length = 0;
    this.swipeHitEntityIds.clear();
    this.swipeScoringTerminated = false;
    this.swipePoints.push({ x: this.localTapPoint.x, y: this.localTapPoint.y });
    this.emitGameplayEvent({ type: "SWIPE_START", id: this.swipeId });
    this.processSwipeSegment(this.localTapPoint.x, this.localTapPoint.y, this.localTapPoint.x, this.localTapPoint.y);
  }

  public handlePointerMove(clientX: number, clientY: number) {
    if (!this.canProcessInteraction() || this.swipePoints.length === 0 || !this.mapClientPoint(clientX, clientY)) return;
    const previous = this.swipePoints[this.swipePoints.length - 1];
    const next = { x: this.localTapPoint.x, y: this.localTapPoint.y };
    this.processSwipeSegment(previous.x, previous.y, next.x, next.y);
    this.swipePoints.push(next);

    if (this.swipePoints.length > this.maxSwipePoints) this.swipePoints.shift();
  }

  public handlePointerUp() {
    if (this.swipePoints.length === 0) return;
    this.emitGameplayEvent({ type: "SWIPE_END", id: this.swipeId, hits: this.swipeHitEntityIds.size });
    this.swipePoints.length = 0;
    this.swipeHitEntityIds.clear();
    this.swipeScoringTerminated = false;
  }

  private processSwipeSegment(startX: number, startY: number, endX: number, endY: number) {
    if (!this.canProcessInteraction() || this.swipeScoringTerminated) return;
    this.metrics.swipeSegmentsProcessed += 1;
    this.metrics.hitCandidatesChecked += this.creatures.length;
    this.refreshActiveTargetIds();
    let candidates = collectSwipeHitCandidates(
      this.creatures,
      startX,
      startY,
      endX,
      endY,
      this.activeTargetIds,
    ).filter((candidate) => !this.swipeHitEntityIds.has(candidate.id));
    const bias = resolveInteractionBias(this.ordersCompleted);
    while (
      candidates.length > 0 &&
      !this.swipeScoringTerminated &&
      this.canProcessInteraction()
    ) {
      const selected = resolveInteractionCandidate(candidates, bias);
      if (!selected) break;
      this.swipeHitEntityIds.add(selected.id);
      this.tapCreature(selected.creature);
      if (selected.role === "hazard") this.swipeScoringTerminated = true;
      candidates = candidates.filter((candidate) => candidate.id !== selected.id);
    }
  }


  public updateViewport(metrics: GameplayViewportMetrics) {
    if (!this.app || !this.initialized || this.destroyed) return;
    if (
      metrics.cssWidth < 2 ||
      metrics.cssHeight < 2 ||
      metrics.rendererWidth < 2 ||
      metrics.rendererHeight < 2
    ) {
      return;
    }

    const width = Math.round(metrics.rendererWidth);
    const height = Math.round(metrics.rendererHeight);
    const nextBounds = {
      top: clamp(metrics.gameplayBounds.top, 0, Math.max(0, metrics.gameplayBounds.bottom)),
      right: Math.max(metrics.gameplayBounds.right, metrics.gameplayBounds.left + 1),
      bottom: Math.max(metrics.gameplayBounds.bottom, metrics.gameplayBounds.top + 1),
      left: Math.max(0, metrics.gameplayBounds.left),
    };
    const rendererChanged =
      this.app.screen.width !== width || this.app.screen.height !== height;
    const boundsChanged =
      !this.gameplayBounds ||
      this.gameplayBounds.top !== nextBounds.top ||
      this.gameplayBounds.right !== nextBounds.right ||
      this.gameplayBounds.bottom !== nextBounds.bottom ||
      this.gameplayBounds.left !== nextBounds.left;

    this.viewportMetrics = {
      ...metrics,
      rendererWidth: width,
      rendererHeight: height,
      gameplayBounds: nextBounds,
    };
    this.gameplayBounds = nextBounds;
    if (!rendererChanged && !boundsChanged) return;

    this.resetStageTransform();
    if (rendererChanged) this.app.renderer.resize(width, height);
    this.layoutEffects(width, height);
    if (rendererChanged || boundsChanged) this.remapActiveCreatures();
    for (const label of this.centerLabels) {
      label.text.x = width / 2;
    }
  }

  public destroy() {
    this.destroyed = true;
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener("change", this.handleMotionChange);
    }
    if (this.hudFrameId) window.cancelAnimationFrame(this.hudFrameId);
    this.hudFrameId = 0;
    if (this.app) {
      this.app.stop();
      this.app.ticker.remove(this.tickerCallback);
    }
    this.clearActiveEntities();
    this.swipePoints.length = 0;
    this.swipeHitEntityIds.clear();
    this.swipeScoringTerminated = false;
    for (const text of this.centerLabelPool) text.destroy();
    this.centerLabelPool.length = 0;
    this.centerStyleCache.clear();
    destroyPopPools();
    destroyCreatureSystemResources();
    if (this.app) {
      this.app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    }
    this.app = null;
    this.initialized = false;
  }

  private emitHud(force = false) {
    if (force) {
      if (this.hudFrameId) return;
      this.hudFrameId = window.requestAnimationFrame(() => {
        this.hudFrameId = 0;
        this.lastHudEmitAtMs = this.gameTime;
        this.callbacks.onHudChange(this.getHudSnapshot());
      });
      return;
    }
    if (!force && this.gameTime - this.lastHudEmitAtMs < this.hudEmitIntervalMs) return;
    this.lastHudEmitAtMs = this.gameTime;
    this.callbacks.onHudChange(this.getHudSnapshot());
  }

  private syncTickerState() {
    if (!this.app || !this.initialized || this.destroyed) return;
    if (this.gameState === "playing") {
      this.app.start();
    } else {
      this.app.stop();
      this.app.render();
    }
  }

  private updateComboWindow() {
    if (this.feverState === "active") return;
    if (
      this.combo > 0 &&
      this.comboExpiresAtMs > 0 &&
      this.gameTime >= this.comboExpiresAtMs
    ) {
      this.resetCombo(false);
    }
  }

  private updateFever() {
    if (this.feverState === "entering" && this.gameTime >= this.feverStateUntilMs) {
      this.feverState = "active";
      this.feverStateUntilMs = this.gameTime + FEVER_DURATION_MS;
      this.emitHud(true);
      return;
    }
    if (this.feverState === "active" && this.gameTime >= this.feverStateUntilMs) {
      if (this.comboFrozenRemainingMs !== null && this.combo > 0) {
        this.comboExpiresAtMs = this.gameTime + this.comboFrozenRemainingMs;
      }
      this.comboFrozenRemainingMs = null;
      this.feverState = "exiting";
      this.feverStateUntilMs = this.gameTime + FEVER_EXITING_MS;
      this.emitGameplayEvent({ type: "FEVER_END" });
      this.emitHud(true);
      return;
    }
    if (this.feverState === "exiting" && this.gameTime >= this.feverStateUntilMs) {
      this.feverState = "normal";
      this.feverStateUntilMs = 0;
      this.feverMeter = 0;
      this.emitHud(true);
    }
  }

  private adjustFeverMeter(amount: number) {
    if (this.feverState === "entering" || this.feverState === "exiting") return;
    if (this.feverState === "active") {
      this.feverMeter = addFeverMeter(this.feverMeter, amount);
      return;
    }
    const nextMeter = addFeverMeter(this.feverMeter, amount);
    this.feverMeter = nextMeter;
    if (nextMeter >= FEVER_MAX_METER) {
      this.feverState = "entering";
      this.feverStateUntilMs = this.gameTime + FEVER_ENTERING_MS;
      this.metrics.feverActivations += 1;
      this.comboFrozenRemainingMs = this.combo > 0
        ? Math.max(0, this.comboExpiresAtMs - this.gameTime)
        : null;
      this.emitGameplayEvent({ type: "FEVER_START" });
      this.emitHud(true);
    }
  }

  private updateMetricsSnapshot() {
    let activeTargets = 0;
    let activeDistractors = 0;
    let activeHazards = 0;
    let activePickups = 0;
    const activeKinds = new Set(
      this.currentOrder?.requirements
        .filter((requirement) => requirement.collected < requirement.required)
        .map((requirement) => requirement.kind) ?? [],
    );
    for (const creature of this.creatures) {
      if (creature.phase !== "alive" && creature.phase !== "popin") continue;
      if (creature.def.type === "bad") activeHazards += 1;
      else if (creature.def.type === "pickup") activePickups += 1;
      else if (activeKinds.has(creature.def.id as ProduceId)) activeTargets += 1;
      else activeDistractors += 1;
    }
    this.metrics.activeCreatures = activeTargets + activeDistractors + activeHazards + activePickups;
    this.metrics.activeTargets = activeTargets;
    this.metrics.activeDistractors = activeDistractors;
    this.metrics.activeHazards = activeHazards;
    this.metrics.activePickups = activePickups;
    this.metrics.gameTime = this.gameTime;
    this.metrics.simulationTime = this.simulationTime;
    const elapsedMs = Math.max(0, this.gameTime - this.metricsLastGameTime);
    if (activeTargets > 0) this.targetPresentMs += elapsedMs;
    this.metricsLastGameTime = this.gameTime;
    const activeMinutes = Math.max(1 / 60, this.gameTime / 60_000);
    const actionSeconds = Math.max(1, this.gameTime / 1000);
    this.metrics.actionsPerSecond = this.metrics.actions / actionSeconds;
    this.metrics.correctHitsPerMinute = this.metrics.correctHits / activeMinutes;
    this.metrics.wrongTapRate = this.metrics.actions > 0
      ? this.metrics.wrongTaps / this.metrics.actions
      : 0;
    this.metrics.hazardHitsPerMinute = this.metrics.hazardHits / activeMinutes;
    const orderAttempts = this.metrics.orderCompletions + this.metrics.orderFailures;
    this.metrics.orderFailureRate = orderAttempts > 0
      ? this.metrics.orderFailures / orderAttempts
      : 0;
    this.metrics.comboAverage = this.metrics.comboSamples.length > 0
      ? this.metrics.comboSamples.reduce((sum, combo) => sum + combo, 0) / this.metrics.comboSamples.length
      : 0;
    if (this.comboPercentileRevision !== this.comboRevision) {
      if (this.metrics.comboSamples.length > 0) {
        const sortedCombos = [...this.metrics.comboSamples].sort((a, b) => a - b);
        const p95Index = Math.min(sortedCombos.length - 1, Math.ceil(sortedCombos.length * 0.95) - 1);
        this.metrics.comboP95 = sortedCombos[Math.max(0, p95Index)] ?? 0;
      } else {
        this.metrics.comboP95 = 0;
      }
      this.comboPercentileRevision = this.comboRevision;
    }
    this.metrics.targetPresenceRatio = this.gameTime > 0
      ? Math.min(1, this.targetPresentMs / this.gameTime)
      : 0;

    if (this.orderPhase !== "active" || !this.currentOrder) {
      this.targetWaitStartedAtMs = null;
    } else {
      const remainingTargets = this.currentOrder.requirements.reduce(
        (sum, requirement) => sum + Math.max(0, requirement.required - requirement.collected),
        0,
      );
      if (remainingTargets <= 0 || activeTargets > 0) {
        if (this.targetWaitStartedAtMs !== null) {
          this.metrics.targetWaitMs.push(Math.max(0, this.gameTime - this.targetWaitStartedAtMs));
          if (this.metrics.targetWaitMs.length > 1000) this.metrics.targetWaitMs.shift();
          this.targetWaitSampleRevision += 1;
          this.targetWaitStartedAtMs = null;
        }
      } else if (this.targetWaitStartedAtMs === null) {
        this.targetWaitStartedAtMs = this.gameTime;
      }
    }

    if (this.targetWaitSampleRevision !== this.targetWaitPercentileRevision) {
      if (this.metrics.targetWaitMs.length > 0) {
        const sortedWaits = [...this.metrics.targetWaitMs].sort((a, b) => a - b);
        const p50Index = Math.min(sortedWaits.length - 1, Math.ceil(sortedWaits.length * 0.5) - 1);
        const p95Index = Math.min(sortedWaits.length - 1, Math.ceil(sortedWaits.length * 0.95) - 1);
        this.metrics.targetWaitP50Ms = sortedWaits[Math.max(0, p50Index)] ?? 0;
        this.metrics.targetWaitP95Ms = sortedWaits[Math.max(0, p95Index)] ?? 0;
      } else {
        this.metrics.targetWaitP50Ms = 0;
        this.metrics.targetWaitP95Ms = 0;
      }
      this.targetWaitPercentileRevision = this.targetWaitSampleRevision;
    }
    const wave = resolveWaveConfig(this.ordersCompleted);
    this.metrics.screenOccupancy = wave.maxActive > 0
      ? this.metrics.activeCreatures / wave.maxActive
      : 0;
  }

  private updatePendingOrder() {
    if (
      this.pendingOrderStartAtMs !== null &&
      this.gameTime >= this.pendingOrderStartAtMs
    ) {
      this.pendingOrderStartAtMs = null;
      if (!this.currentOrder && this.gameState === "playing") this.startNewOrder();
    }
  }

  private updateOrderTimer(deltaMs: number) {
    if (this.orderPhase !== "active" || !this.currentOrder) return;
    this.currentOrder.timeRemainingMs = Math.max(
      0,
      this.currentOrder.timeRemainingMs - Math.max(0, deltaMs),
    );
    if (this.currentOrder.timeRemainingMs <= 0) this.handleOrderTimeout();
  }

  private startNewOrder() {
    const wave = resolveWaveConfig(this.ordersCompleted);
    const timeLimitMs = resolveOrderTimeLimitMs(wave.required);

    const availableKinds = ORDERABLE_TARGETS.map(t => t.id as ProduceId);
    const kinds = resolveOrderKinds(this.ordersCompleted, availableKinds, this.lastKinds, this.random);
    this.lastKinds = kinds;

    const requirements = kinds.map((kind, idx) => ({
      kind,
      required: resolveOrderRequiredCount(idx, wave.required, kinds.length),
      collected: 0,
    }));

    this.currentOrder = {
      requirements,
      timeLimitMs,
      timeRemainingMs: timeLimitMs,
    };

    this.orderPhase = "active";
    this.orderId += 1;
    this.metrics.orderId = this.orderId;
    this.orderStartedAtMs = this.gameTime;
    this.targetWaitStartedAtMs = null;
    this.lastSpawnAtSimulationMs = Number.NEGATIVE_INFINITY;
    // Cooldowns from the previous order's completed kinds do not carry over.
    this.completedKindCooldownUntilMs.clear();
    this.emitHud(true);
  }


  private handleOrderTimeout() {
    if (!this.currentOrder) return;
    this.metrics.orderFailures += 1;
    this.failureReason = "order-timeout";
    this.resetCombo(false);
    this.clearProduceEntities();
    if (this.app) {
      this.spawnCenterText(uiText("HẾT GIỜ!", "TIME UP!"), 0xff745f, 900, 18);
    }
    this.applyDamage(true, "order-timeout");

    if (this.gameState !== "playing") {
      this.currentOrder = null;
      this.orderPhase = "transition";
      this.pendingOrderStartAtMs = null;
      this.emitHud(true);
      return;
    }

    this.currentOrder = null;
    this.orderPhase = "transition";
    this.pendingOrderStartAtMs = this.gameTime + ORDER_TRANSITION_MS;
    this.emitHud(true);
  }

  private completeOrder() {
    const previousDifficultyLevel = resolveDifficultyLevel(this.ordersCompleted);
    const completionBonus = this.currentOrder
      ? resolveOrderCompletionBonus(
          this.currentOrder.timeRemainingMs,
          this.currentOrder.timeLimitMs,
        )
      : ORDER_COMPLETE_BONUS;
    this.score += completionBonus;
    this.ordersCompleted += 1;
    this.metrics.orderCompletions += 1;
    this.metrics.orderCompletionMs.push(Math.max(0, this.gameTime - this.orderStartedAtMs));
    if (this.metrics.orderCompletionMs.length > 1000) this.metrics.orderCompletionMs.shift();
    this.adjustFeverMeter(20);
    this.emitGameplayEvent({ type: "ORDER_COMPLETE", ordersCompleted: this.ordersCompleted, bonus: completionBonus });
    const nextDifficultyLevel = resolveDifficultyLevel(this.ordersCompleted);
    this.clearProduceEntities();
    this.currentOrder = null;
    this.orderPhase = "transition";
    this.pendingOrderStartAtMs = this.gameTime + ORDER_TRANSITION_MS;
    if (this.ordersCompleted === 1) {
      this.nextPowerupEligibleAtMs = this.gameTime + POWERUP_COOLDOWN_MS;
      this.lastPowerupSpawnAtMs = this.gameTime;
    }
    if (nextDifficultyLevel > previousDifficultyLevel) {
      this.spawnCenterText(
        uiText(
          `ĐỘ KHÓ ${nextDifficultyLevel}\nNHANH HƠN!`,
          `LEVEL ${nextDifficultyLevel}\nFASTER!`,
        ),
        0xffc247,
        1150,
        78,
      );
    }
    AudioManager.playOrderComplete();
    this.emitHud(true);
  }

  private clearProduceEntities() {
    for (const creature of this.creatures) {
      if (
        creature.def.category === "produce" &&
        (creature.phase === "alive" || creature.phase === "popin")
      ) {
        creature.guided = false;
        creature.tapped = false;
        creature.phase = "popout";
        creature.popoutElapsedMs = 0;
      }
    }
  }

  private updateSpawner() {
    if (
      this.orderPhase !== "active" ||
      !this.app ||
      !this.currentOrder ||
      !this.layers
    ) {
      return;
    }
    const wave = resolveWaveConfig(this.ordersCompleted);
    const spawnIntervalMs = this.feverState === "active"
      ? wave.spawnIntervalMs * FEVER_SPAWN_INTERVAL_SCALE
      : wave.spawnIntervalMs;
    if (
      this.simulationTime - this.lastSpawnAtSimulationMs <
      spawnIntervalMs
    ) {
      return;
    }

    const activeKinds = this.currentOrder.requirements
      .filter(r => r.collected < r.required)
      .map(r => r.kind);
    const activeKindSet = new Set(activeKinds);

    let activeCount = 0;
    let activeHazardCount = 0;
    let activeTargetCount = 0;
    const activeTargetKinds = new Set<ProduceId>();
    let hasActivePickup = false;
    for (const creature of this.creatures) {
      if (creature.phase === "alive" || creature.phase === "popin") {
        activeCount++;
        if (creature.def.type === "bad") activeHazardCount++;
        if (creature.def.type === "pickup") hasActivePickup = true;
        if (activeKindSet.has(creature.def.id as ProduceId)) {
          activeTargetCount++;
          activeTargetKinds.add(creature.def.id as ProduceId);
        }
      }
    }
    if (activeCount >= wave.maxActive) return;

    const remainingTargets = this.currentOrder.requirements.reduce((sum, r) => sum + Math.max(0, r.required - r.collected), 0);
    const activeTargetDefs = PRODUCE_ITEMS.filter(p => activeKindSet.has(p.id));
    const missingTargetDefs = activeTargetDefs.filter((definition) => !activeTargetKinds.has(definition.id));
    // Exclude recently-completed kinds from the distractor pool for a short
    // cooldown period. Without this, a fruit whose requirement just filled can
    // immediately appear as a distractor — which feels like a bait-and-switch,
    // not a difficulty challenge.
    const distractorDefs = PRODUCE_ITEMS.filter(p => {
      if (activeKindSet.has(p.id)) return false; // still a live target kind
      const cooldownUntil = this.completedKindCooldownUntilMs.get(p.id);
      return cooldownUntil === undefined || this.gameTime >= cooldownUntil;
    });
    const fallbackTargetDef = activeTargetDefs[0] ?? PRODUCE_ITEMS[0];

    const guaranteeTarget = shouldPrioritizeOrderTarget({
      remainingTargets,
      activeTargetCount,
      missingTargetCount: missingTargetDefs.length,
    });
    let definition: ItemDefinition | null = guaranteeTarget
      ? pickOne(missingTargetDefs.length > 0 ? missingTargetDefs : activeTargetDefs, this.random) ?? fallbackTargetDef
      : !hasActivePickup
        ? this.selectPowerupForSpawn(activeHazardCount)
        : null;
    if (guaranteeTarget) this.metrics.targetGuaranteeTriggered += 1;


    if (!definition) {
      const roll = this.random();
      const targetWeight = this.feverState === "active"
        ? Math.max(wave.targetWeight, 0.8)
        : wave.targetWeight;
      const hazardWeight = this.feverState === "active" ? wave.hazardWeight * 0.5 : wave.hazardWeight;
      const totalWeight = Math.max(0.000001, targetWeight + wave.distractorWeight + hazardWeight);
      const weightedRoll = roll * totalWeight;
      if (weightedRoll < targetWeight) {
        definition = pickOne(activeTargetDefs, this.random) ?? fallbackTargetDef;
      } else if (weightedRoll < targetWeight + wave.distractorWeight) {
        // Prefer distractor kinds not already visible — keeps the screen visually
        // diverse so players must actually scan for the correct fruit type.
        const activeDistractorKinds = new Set(
          this.creatures
            .filter(c => (c.phase === "alive" || c.phase === "popin") && !activeKindSet.has(c.def.id as ProduceId) && c.def.type === "good")
            .map(c => c.def.id),
        );
        const freshDistractors = distractorDefs.filter(d => !activeDistractorKinds.has(d.id));
        definition = pickOne(freshDistractors.length > 0 ? freshDistractors : distractorDefs, this.random) ?? fallbackTargetDef;
      } else if (weightedRoll < targetWeight + wave.distractorWeight + hazardWeight && activeHazardCount < 2) {
        definition = pickOne(HAZARD_ITEMS, this.random) ?? fallbackTargetDef;
      } else {
        definition = pickOne(activeTargetDefs, this.random) ?? fallbackTargetDef;
      }
    }


    if (!definition) return;

    const creature = spawnCreature(this.app, this.layers.gameplay, {
      gameTimeMs: this.simulationTime,
      gameplayBounds: this.gameplayBounds ?? undefined,
      worldScale: this.getWorldScale(),
      activeCreatures: this.creatures,
      forcedDef: definition,
      fallDurationMultiplier: wave.fallDurationMultiplier,
      guided: this.ordersCompleted === 0 && activeKindSet.has(definition.id as ProduceId),
      random: this.random,
    });

    if (!creature) return;
    this.creatures.push(creature);
    this.metrics.lastSpawnDecision = guaranteeTarget
      ? `guarantee:${definition.id}`
      : definition.type === "bad"
        ? `hazard:${definition.id}`
        : definition.type === "pickup"
          ? `pickup:${definition.id}`
          : activeKindSet.has(definition.id as ProduceId)
            ? `target:${definition.id}`
            : `distractor:${definition.id}`;
    this.lastSpawnAtSimulationMs = this.simulationTime;
    if (definition.type === "pickup") {
      this.lastPowerupSpawnAtMs = this.gameTime;
      this.nextPowerupEligibleAtMs = Number.POSITIVE_INFINITY;
    }
  }

  private selectPowerupForSpawn(activeHazards: number) {
    if (
      this.ordersCompleted < 1 ||
      this.gameTime < this.nextPowerupEligibleAtMs
    ) {
      return null;
    }

    const pityReached =
      this.gameTime - this.lastPowerupSpawnAtMs >= POWERUP_PITY_MS;
    if (!pityReached && this.random() >= POWERUP_SPAWN_CHANCE) return null;

    const id = selectPowerup(
      {
        missingLives: this.misses,
        activeHazards,
        slowTimeActive: this.slowTimeActiveUntilMs > this.gameTime,
      },
      this.random(),
    );
    return id ? POWERUP_ITEMS.find((item) => item.id === id) ?? null : null;
  }

  private tapCreature(creature: ActiveCreature) {
    if (creature.phase !== "alive") return;
    this.metrics.actions += 1;
    this.metrics.lastInteraction = creature.def.type === "bad"
      ? "hazard"
      : creature.def.type === "pickup"
        ? "pickup"
        : this.activeTargetIds.has(creature.def.id)
          ? "target"
          : "distractor";
    creature.tapped = true;
    creature.guided = false;
    creature.phase = "popout";
    creature.popoutElapsedMs = 0;

    if (creature.def.type === "pickup") {
      this.applyPowerup(creature.def.id, creature.x, creature.y);
      return;
    }
    if (creature.def.type === "bad") {
      this.tapHazard(creature.def, creature.x, creature.y);
      return;
    }
    this.tapProduce(creature.def, creature.x, creature.y);
  }

  private tapProduce(definition: ProduceDefinition, x: number, y: number) {
    if (!this.currentOrder) return;

    const activeKinds = this.currentOrder.requirements
      .filter(r => r.collected < r.required)
      .map(r => r.kind);
    const activeKindSet = new Set(activeKinds);

    if (!activeKindSet.has(definition.id)) {
      if (this.feverState === "active") {
        const bonusPoints = Math.round(BASE_HARVEST_SCORE * 0.5);
        this.score += bonusPoints;
        this.combo += 1;
        this.comboRevision += 1;
        this.highestCombo = Math.max(this.highestCombo, this.combo);
        this.comboExpiresAtMs = this.gameTime + COMBO_WINDOW_MS;
        this.metrics.correctHits += 1;
        this.metrics.comboSamples.push(this.combo);
        this.metrics.lastInteraction = "fever-bonus";
        this.emitGameplayEvent({ type: "HARVEST", kind: definition.id, points: bonusPoints, combo: this.combo, fever: true });
        if (this.app) {
          spawnPopLabel(
            this.app,
            this.popLabels,
            uiText("THƯỞNG FEVER", "FEVER BONUS"),
            x,
            y - 24,
            0xffe36f,
            this.layers?.worldFeedback,
          );
        }
        return;
      }
      this.metrics.wrongTaps += 1;
      this.metrics.lastInteraction = "distractor";
      this.adjustFeverMeter(-10);
      this.resetCombo(false);
      if (this.app) {
        spawnPopLabel(
          this.app,
          this.popLabels,
          uiText("NHẦM MÓN", "WRONG ITEM"),
          x,
          y - 24,
          0xff745f,
          this.layers?.worldFeedback,
        );
      }
      AudioManager.playWrong();
      this.emitGameplayEvent({ type: "WRONG", kind: definition.id, fever: false });
      return;
    }

    this.totalHarvested += 1;
    this.harvestedCounts[definition.id] =
      (this.harvestedCounts[definition.id] ?? 0) + 1;

    const req = this.currentOrder.requirements.find(r => r.kind === definition.id);
    if (req) {
      req.collected += 1;
      // When this kind's requirement is just fulfilled, put it on a short distractor
      // cooldown so the same fruit doesn't immediately reappear as a wrong target.
      // 3 s matches the typical fall duration, so players aren't surprised.
      if (req.collected >= req.required) {
        this.completedKindCooldownUntilMs.set(definition.id, this.gameTime + 3_000);
      }
    }

    this.combo += 1;
    this.comboRevision += 1;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    this.comboExpiresAtMs = this.gameTime + COMBO_WINDOW_MS;

    const multiplier = resolveComboMultiplier(this.combo);
    const points = resolveFeverScore(resolveHarvestScore(this.combo), this.feverState);
    this.score += points;
    this.metrics.correctHits += 1;
    this.metrics.comboSamples.push(this.combo);
    if (this.metrics.comboSamples.length > 1000) this.metrics.comboSamples.shift();
    this.adjustFeverMeter(8);
    const milestone = isComboMilestone(this.combo);
    this.emitGameplayEvent({ type: "HARVEST", kind: definition.id, points, combo: this.combo, fever: this.feverState === "active" });
    this.emitGameplayEvent({ type: "COMBO", combo: this.combo, multiplier });

    if (this.app) {
      spawnScoreComboFeedback(
        this.app,
        this.popLabels,
        { points, combo: this.combo, multiplier, milestone },
        x,
        y - 28,
        milestone ? 0xffe36f : definition.glow,
        this.layers?.worldFeedback,
      );
    }
    AudioManager.playHarvest(this.combo, milestone);

    if (milestone) {
      this.adjustFeverMeter(10);
      this.emitGameplayEvent({ type: "COMBO_MILESTONE", combo: this.combo });
      this.spawnCenterText(`COMBO x${this.combo}`, 0xffe36f, 850, 8);
      this.triggerShake(this.combo >= 10 ? 4 : 2, this.combo >= 10 ? 130 : 90);
    }

    const allDone = this.currentOrder.requirements.every(r => r.collected >= r.required);
    if (allDone) {
      this.completeOrder();
    }
  }


  private tapHazard(definition: HazardDefinition, x: number, y: number) {
    this.metrics.hazardHits += 1;
    this.metrics.lastInteraction = "hazard";
    this.adjustFeverMeter(-25);
    this.resetCombo(false);
    if (this.app) {
      spawnPopLabel(
        this.app,
        this.popLabels,
        uiText("MẤT TIM!", "LOSE A LIFE!"),
        x,
        y - 24,
        0xff6257,
        this.layers?.worldFeedback,
      );
      spawnBurst(
        this.app,
        this.dotParticles,
        x,
        y,
        definition.glow,
        this.layers?.effects,
        this.resolveEffectParticleCount(10),
      );
    }
    this.applyDamage(true, "hazard");
  }

  private applyPowerup(id: PowerupId, x: number, y: number) {
    this.metrics.powerupUsage += 1;
    this.metrics.lastInteraction = `powerup:${id}`;
    let value = 0;
    if (id === "heart") {
      if (this.misses > 0) {
        this.misses -= 1;
        value = 1;
        this.spawnPowerupLabel(uiText("+1 TIM", "+1 LIFE"), x, y, 0xff8fa0);
      } else {
        value = 5;
        this.score += value;
        this.spawnPowerupLabel(uiText("TIM ĐẦY · +5", "LIFE FULL · +5"), x, y, 0xff8fa0);
      }
    } else if (id === "lightning") {
      let cleared = 0;
      for (const creature of this.creatures) {
        if (
          creature.def.type === "bad" &&
          (creature.phase === "alive" || creature.phase === "popin")
        ) {
          creature.tapped = true;
          creature.phase = "popout";
          creature.popoutElapsedMs = 0;
          cleared += 1;
        }
      }
      const bonus = cleared * LIGHTNING_SCORE_PER_HAZARD;
      this.score += bonus;
      value = bonus;
      this.spawnPowerupLabel(
        cleared > 0
          ? uiText(`SÉT x${cleared} · +${bonus}`, `LIGHTNING x${cleared} · +${bonus}`)
          : uiText("SÉT!", "LIGHTNING!"),
        x,
        y,
        0xffe36f,
      );
      this.flashRemainingMs = 180;
      this.triggerShake(8, 180);
    } else {
      this.slowTimeActiveUntilMs = this.gameTime + SLOW_TIME_DURATION_MS;
      value = SLOW_TIME_DURATION_MS;
      this.spawnPowerupLabel(uiText("LÀM CHẬM 5s", "SLOW 5s"), x, y, 0x9de7ff);
    }

    if (this.app) {
      const definition = POWERUP_ITEMS.find((item) => item.id === id);
      spawnBurst(
        this.app,
        this.dotParticles,
        x,
        y,
        definition?.glow ?? 0xffffff,
        this.layers?.effects,
        this.resolveEffectParticleCount(12, 5),
      );
    }
    AudioManager.playPowerup(id);
    this.emitGameplayEvent({ type: "POWERUP", id, value });
    this.nextPowerupEligibleAtMs = this.gameTime + POWERUP_COOLDOWN_MS;
    this.emitHud(true);
  }

  private spawnPowerupLabel(value: string, x: number, y: number, color: number) {
    if (!this.app) return;
    spawnPopLabel(
      this.app,
      this.popLabels,
      value,
      x,
      y - 24,
      color,
      this.layers?.worldFeedback,
    );
  }

  private onCreatureExpire(creature: ActiveCreature) {
    creature.tapped = false;
    creature.guided = false;
    if (this.orderPhase !== "active") return;
    if (creature.def.type === "pickup") {
      this.nextPowerupEligibleAtMs = this.gameTime + POWERUP_COOLDOWN_MS;
      return;
    }
    if (
      creature.def.type === "good" &&
      this.currentOrder &&
      this.currentOrder.requirements.some(r => r.kind === creature.def.id && r.collected < r.required)
    ) {
      this.resetCombo(false);
      const lostLife = this.applyDamage(false, "missed-target");
      if (this.app) {
        const feedbackY = Math.min(
          creature.container.y,
          (this.gameplayBounds?.bottom ?? this.app.screen.height * 0.78) - 26,
        );
        spawnPopLabel(
          this.app,
          this.popLabels,
          lostLife
            ? uiText("RƠI MẤT · -1 TIM", "MISSED · -1 LIFE")
            : uiText("RƠI MẤT", "MISSED"),
          creature.container.x,
          feedbackY,
          0xff6257,
          this.layers?.worldFeedback,
        );
        spawnBurst(
          this.app,
          this.dotParticles,
          creature.x,
          creature.y,
          0x7c4220,
          this.layers?.effects,
          this.resolveEffectParticleCount(8),
        );
      }
    }
  }

  private applyDamage(force = false, source: FailureReason = "hazard") {
    if (!force && this.gameTime < this.damageGraceUntilMs) return false;
    this.damageGraceUntilMs = this.gameTime + DAMAGE_GRACE_MS;
    this.misses += 1;
    this.failureReason = source;
    this.metrics.deathCause = source;
    this.emitGameplayEvent({ type: "DAMAGE", source, misses: this.misses });
    this.flashRemainingMs = 150;
    this.triggerShake(6, 150);
    AudioManager.playDamage();
    this.emitHud(true);
    if (this.misses >= MAX_MISSES) this.setGameState("dead");
    return true;
  }

  private resetCombo(emit = true) {
    if (this.combo === 0 && this.comboExpiresAtMs === 0) return;
    this.combo = 0;
    this.comboExpiresAtMs = 0;
    if (emit) this.emitHud(true);
  }

  private createReusableStageObjects() {
    if (!this.layers) return;
    this.flashGraphics = new Graphics();
    this.flashGraphics.alpha = 0;
    this.layers.effects.addChild(this.flashGraphics);
  }

  private layoutEffects(width: number, height: number) {
    if (!this.flashGraphics) return;
    this.flashGraphics.clear().rect(0, 0, width, height).fill({ color: 0xffffff, alpha: 1 });
    this.flashGraphics.alpha = this.flashRemainingMs > 0 ? 0.72 : 0;
  }

  private updateStageEffects(deltaMs: number) {
    if (!this.app) return;
    this.stageEffectClockMs += deltaMs;
    if (this.shakeRemainingMs > 0 && !this.reducedMotion) {
      this.shakeRemainingMs = Math.max(0, this.shakeRemainingMs - deltaMs);
      const strength =
        this.shakeIntensity * (this.shakeRemainingMs / Math.max(1, this.shakeDurationMs));
      const offsetX = Math.sin(this.stageEffectClockMs * 0.095) * strength;
      const offsetY = Math.cos(this.stageEffectClockMs * 0.123) * strength * 0.72;
      this.stageTransformActive = true;
      this.layers?.worldRoot.position.set(offsetX, offsetY);
      this.layers?.worldRoot.scale.set(1.018);
    } else {
      this.resetStageTransform();
    }

    if (this.flashGraphics && this.flashRemainingMs > 0) {
      this.flashRemainingMs = Math.max(0, this.flashRemainingMs - deltaMs);
      this.flashGraphics.alpha = (this.flashRemainingMs / 180) * 0.72;
    } else if (this.flashGraphics) {
      this.flashGraphics.alpha = 0;
    }
  }

  private triggerShake(intensity: number, durationMs: number) {
    if (this.reducedMotion) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDurationMs = Math.max(this.shakeDurationMs, durationMs);
    this.shakeRemainingMs = Math.max(this.shakeRemainingMs, durationMs);
    this.shakeTriggerCounter += 1;
    this.emitHud(true);
  }

  private resetStageTransform() {
    this.shakeRemainingMs = 0;
    this.shakeDurationMs = 0;
    this.shakeIntensity = 0;
    this.layers?.worldRoot.position.set(0, 0);
    this.layers?.worldRoot.scale.set(1);
    if (this.stageTransformActive) {
      this.stageTransformActive = false;
    }
  }

  private spawnCenterText(
    value: string,
    color: number,
    lifetimeMs: number,
    offsetY: number,
  ) {
    if (!this.app) return;
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const compactHeight = screenHeight <= 500;
    const wordWrapWidth = Math.max(160, Math.min(screenWidth * 0.76, screenWidth - 32));
    const fontSize = Math.max(
      16,
      Math.min(
        28,
        Math.round(wordWrapWidth / (compactHeight ? 8.5 : 7.5)),
        Math.round(screenHeight * (compactHeight ? 0.06 : 0.07)),
      ),
    );
    const strokeWidth = Math.max(3, Math.round(fontSize * 0.16));
    const lineHeight = Math.round(fontSize * 1.08);
    const key = `${color}:${fontSize}:${Math.round(wordWrapWidth)}`;
    let style = this.centerStyleCache.get(key);
    if (!style) {
      style = new TextStyle({
        fill: color,
        fontFamily: "Be Vietnam Pro, system-ui, sans-serif",
        fontSize,
        fontWeight: "900",
        stroke: { color: 0x55320f, width: strokeWidth },
        dropShadow: { alpha: 0.5, color: 0x000000, distance: 2, blur: 4 },
        align: "center",
        breakWords: true,
        lineHeight,
        padding: strokeWidth,
        wordWrap: true,
        wordWrapWidth,
      });
      this.centerStyleCache.set(key, style);
    }

    const text = this.centerLabelPool.pop() ?? new Text({ text: value, style });
    text.text = value;
    text.style = style;
    text.visible = true;
    text.alpha = 1;
    text.anchor.set(0.5);
    text.scale.set(this.reducedMotion ? 1 : 0.72);
    text.x = screenWidth / 2;
    text.y = screenHeight / 2 + (compactHeight ? offsetY * 0.82 : offsetY);
    (this.layers?.worldFeedback ?? this.app.stage).addChild(text);
    this.centerLabels.push({ text, ageMs: 0, lifetimeMs, startY: text.y });
  }

  private updateCenterLabels(deltaMs: number) {
    for (let index = this.centerLabels.length - 1; index >= 0; index -= 1) {
      const label = this.centerLabels[index];
      label.ageMs += deltaMs;
      const progress = Math.min(1, label.ageMs / label.lifetimeMs);
      label.text.y = label.startY - progress * 38;
      label.text.alpha = Math.min(1, (1 - progress) * 3);
      if (!this.reducedMotion) {
        label.text.scale.set(Math.min(1.08, 0.72 + progress * 1.4));
      }
      if (progress >= 1) {
        this.releaseCenterLabel(label.text);
        this.centerLabels.splice(index, 1);
      }
    }
  }

  private releaseCenterLabel(text: Text) {
    text.removeFromParent();
    text.visible = false;
    text.alpha = 1;
    text.scale.set(1);
    if (this.centerLabelPool.length < 4) this.centerLabelPool.push(text);
    else text.destroy();
  }

  private releaseAllCenterLabels() {
    for (const label of this.centerLabels) this.releaseCenterLabel(label.text);
    this.centerLabels.length = 0;
  }

  private remapActiveCreatures() {
    if (!this.app) return;
    remapCreaturesToBounds(
      this.creatures,
      this.app,
      this.gameplayBounds ?? undefined,
      this.getWorldScale(),
    );
  }

  private getWorldScale() {
    if (!this.app) return 1;
    // Detach worldScale from React HUD to prevent object jitter
    const referenceHeight = 820;
    return clamp(this.app.screen.height / referenceHeight, 0.68, 1);
  }

  private resolveEffectParticleCount(desktopCount: number, reducedCount = 4) {
    if (this.reducedMotion) return Math.min(desktopCount, reducedCount);
    if (this.mobilePerformanceMode) {
      return Math.max(3, Math.ceil(desktopCount * 0.55));
    }
    return desktopCount;
  }
}
