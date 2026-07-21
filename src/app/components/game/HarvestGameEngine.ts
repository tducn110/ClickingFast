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
  hitTestCreatures,
  destroyCreatureSystemResources,
  preloadCreatureTextures,
  recycleCreatureVisual,
  remapCreaturesToBounds,
  spawnCreature,
  updateCreatures,
  type ActiveCreature,
  type GameplayBounds,
} from "./systems/CreatureSystem";
import { MAX_MISSES, ORDERABLE_TARGETS, type TargetDef } from "./constants";
import {
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
  BASE_HARVEST_SCORE,
  COMBO_WINDOW_MS,
  DAMAGE_GRACE_MS,
  LIGHTNING_SCORE_PER_HAZARD,
  ORDER_COMPLETE_BONUS,
  ORDER_TRANSITION_MS,
  POWERUP_COOLDOWN_MS,
  POWERUP_PITY_MS,
  POWERUP_SPAWN_CHANCE,
  SLOW_TIME_DURATION_MS,
  SLOW_TIME_FALL_MULTIPLIER,
  resolveComboMultiplier,
  resolveDifficultyLevel,
  resolveOrderTimeLimitMs,
  resolveWaveConfig,
  selectPowerup,
} from "./gameRules";
import { AudioManager } from "../../lib/audioManager";

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

export interface OrderState {
  target: TargetDef;
  required: number;
  collected: number;
  timeLimitMs: number;
  timeRemainingMs: number;
}

export interface HudSnapshot {
  score: number;
  combo: number;
  comboMultiplier: number;
  misses: number;
  ordersCompleted: number;
  currentOrder: OrderState | null;
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
}

export interface EngineCallbacks {
  onHudChange: (snapshot: HudSnapshot) => void;
  onGameStateChange: (state: GameState) => void;
  onReady: () => void;
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

  public gameTime = 0;
  public score = 0;
  public misses = 0;
  public combo = 0;
  public ordersCompleted = 0;
  public currentOrder: OrderState | null = null;
  public gameState: GameState = "loading";
  public highestCombo = 0;
  public totalHarvested = 0;
  public harvestedCounts: Partial<Record<ItemId, number>> = {};

  private gameplayBounds: GameplayBounds | null = null;
  private lastTargetId: TargetDef["id"] | null = null;
  private lastSpawnAtMs = Number.NEGATIVE_INFINITY;
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
        antialias: false,
        resolution: this.mobilePerformanceMode
          ? 1
          : Math.min(window.devicePixelRatio || 1, 1.5),
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

    if (this.destroyed || this.app !== app || !this.initialized) return;
    app.ticker.add(this.tickerCallback);
    this.callbacks.onReady();
  }

  private tick(deltaMs: number) {
    if (!this.app || !this.initialized || this.destroyed) return;
    this.updateStageEffects(deltaMs);
    if (this.gameState !== "playing") return;

    this.gameTime += deltaMs;
    this.updateComboWindow();
    this.updatePendingOrder();
    this.updateOrderTimer(deltaMs);
    if (this.gameState !== "playing") return;
    this.updateSpawner();

    updateCreatures(
      this.creatures,
      this.gameTime,
      deltaMs,
      this.slowTimeActiveUntilMs > this.gameTime
        ? SLOW_TIME_FALL_MULTIPLIER
        : 1,
      (creature) => this.onCreatureExpire(creature),
    );
    updatePopLabels(this.popLabels, deltaMs);
    updateDots(this.dotParticles, deltaMs);
    this.updateCenterLabels(deltaMs);
    this.emitHud();
  }

  public startGame() {
    this.score = 0;
    this.misses = 0;
    this.combo = 0;
    this.ordersCompleted = 0;
    this.currentOrder = null;
    this.lastTargetId = null;
    this.highestCombo = 0;
    this.totalHarvested = 0;
    this.harvestedCounts = {};
    this.gameTime = 0;
    this.lastSpawnAtMs = Number.NEGATIVE_INFINITY;
    this.comboExpiresAtMs = 0;
    this.pendingOrderStartAtMs = null;
    this.damageGraceUntilMs = 0;
    this.slowTimeActiveUntilMs = 0;
    this.nextPowerupEligibleAtMs = Number.POSITIVE_INFINITY;
    this.lastPowerupSpawnAtMs = 0;
    this.lastHudEmitAtMs = Number.NEGATIVE_INFINITY;
    this.comboRevision += 1;
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
      currentOrder: this.currentOrder ? { ...this.currentOrder } : null,
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
    };
  }

  public setGameState(state: GameState) {
    if (this.gameState === state) return;
    this.gameState = state;
    if (state !== "playing") this.resetStageTransform();
    this.syncTickerState();
    this.callbacks.onGameStateChange(state);
    this.emitHud(true);
  }

  public handleTap(clientX: number, clientY: number) {
    if (this.gameState !== "playing" || !this.app || !this.initialized || !this.layers) return;
    const metrics = this.viewportMetrics;
    let targetX: number;
    let targetY: number;

    if (metrics) {
      targetX =
        (clientX - metrics.left) *
        (metrics.rendererWidth / Math.max(1, metrics.cssWidth));
      targetY =
        (clientY - metrics.top) *
        (metrics.rendererHeight / Math.max(1, metrics.cssHeight));
    } else {
      const rect = this.wrap.getBoundingClientRect();
      targetX = (clientX - rect.left) * (this.app.screen.width / rect.width);
      targetY = (clientY - rect.top) * (this.app.screen.height / rect.height);
    }

    this.tapPoint.set(targetX, targetY);
    this.layers.worldRoot.toLocal(this.tapPoint, undefined, this.localTapPoint);
    const creature = hitTestCreatures(
      this.creatures,
      this.localTapPoint.x,
      this.localTapPoint.y,
    );
    if (creature) this.tapCreature(creature);
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
    if (
      this.combo > 0 &&
      this.comboExpiresAtMs > 0 &&
      this.gameTime >= this.comboExpiresAtMs
    ) {
      this.resetCombo();
    }
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
    if (!this.currentOrder) return;
    this.currentOrder.timeRemainingMs -= deltaMs;
    if (this.currentOrder.timeRemainingMs <= 0) this.handleOrderTimeout();
  }

  private startNewOrder() {
    let available = ORDERABLE_TARGETS.filter(
      (target) => target.id !== this.lastTargetId,
    );
    if (available.length === 0) available = [...ORDERABLE_TARGETS];
    const target = pickOne(available, this.random) ?? ORDERABLE_TARGETS[0];
    if (!target) return;

    const wave = resolveWaveConfig(this.ordersCompleted);
    const timeLimitMs = resolveOrderTimeLimitMs(wave.required);
    this.lastTargetId = target.id;
    this.currentOrder = {
      target,
      required: wave.required,
      collected: 0,
      timeLimitMs,
      timeRemainingMs: timeLimitMs,
    };
    this.lastSpawnAtMs = Number.NEGATIVE_INFINITY;
    this.emitHud(true);
  }

  private handleOrderTimeout() {
    if (!this.currentOrder) return;
    this.resetCombo(false);
    this.clearProduceEntities();
    if (this.app) {
      this.spawnCenterText("HẾT GIỜ!", 0xff745f, 900, 18);
    }
    this.applyDamage(true);

    if (this.gameState !== "playing") {
      this.emitHud(true);
      return;
    }

    this.currentOrder = null;
    this.pendingOrderStartAtMs = this.gameTime + ORDER_TRANSITION_MS;
    this.emitHud(true);
  }

  private completeOrder() {
    const previousDifficultyLevel = resolveDifficultyLevel(this.ordersCompleted);
    this.score += ORDER_COMPLETE_BONUS;
    this.ordersCompleted += 1;
    const nextDifficultyLevel = resolveDifficultyLevel(this.ordersCompleted);
    this.clearProduceEntities();
    this.currentOrder = null;
    this.pendingOrderStartAtMs = this.gameTime + ORDER_TRANSITION_MS;
    if (this.ordersCompleted === 1) {
      this.nextPowerupEligibleAtMs = this.gameTime + POWERUP_COOLDOWN_MS;
      this.lastPowerupSpawnAtMs = this.gameTime;
    }
    this.spawnCenterText(`HOÀN THÀNH · +${ORDER_COMPLETE_BONUS}`, 0x7ed957, 950, 34);
    if (nextDifficultyLevel > previousDifficultyLevel) {
      this.spawnCenterText(
        `ĐỘ KHÓ ${nextDifficultyLevel} · NHANH HƠN!`,
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
        creature.guideHalo.visible = false;
        creature.tapped = false;
        creature.phase = "popout";
        creature.popoutElapsedMs = 0;
      }
    }
  }

  private updateSpawner() {
    if (!this.app || !this.currentOrder || !this.layers) return;
    const wave = resolveWaveConfig(this.ordersCompleted);
    const active = this.creatures.filter(
      (creature) => creature.phase === "alive" || creature.phase === "popin",
    );
    if (
      this.gameTime - this.lastSpawnAtMs < wave.spawnIntervalMs ||
      active.length >= wave.maxActive
    ) {
      return;
    }

    const activeHazards = active.filter((creature) => creature.def.type === "bad");
    const activePickup = active.some((creature) => creature.def.type === "pickup");
    let definition: ItemDefinition | null = !activePickup
      ? this.selectPowerupForSpawn(activeHazards.length)
      : null;

    if (!definition) {
      const roll = this.random();
      if (roll < wave.targetWeight) {
        definition = this.currentOrder.target;
      } else if (roll < wave.targetWeight + wave.distractorWeight) {
        definition =
          pickOne(
            PRODUCE_ITEMS.filter((item) => item.id !== this.currentOrder?.target.id),
            this.random,
          ) ?? this.currentOrder.target;
      } else if (activeHazards.length < 2) {
        definition = pickOne(HAZARD_ITEMS, this.random) ?? this.currentOrder.target;
      } else {
        definition = this.currentOrder.target;
      }
    }

    if (!definition) return;

    const creature = spawnCreature(this.app, this.layers.gameplay, {
      gameTimeMs: this.gameTime,
      gameplayBounds: this.gameplayBounds ?? undefined,
      worldScale: this.getWorldScale(),
      activeCreatures: this.creatures,
      forcedDef: definition,
      fallDurationMultiplier: wave.fallDurationMultiplier,
      guided: this.ordersCompleted === 0 && definition.id === this.currentOrder.target.id,
      random: this.random,
    });

    if (!creature) return;
    this.creatures.push(creature);
    this.lastSpawnAtMs = this.gameTime;
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
    creature.tapped = true;
    creature.guided = false;
    creature.guideHalo.visible = false;
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
    if (!this.currentOrder || definition.id !== this.currentOrder.target.id) {
      const wrongCurrentOrder =
        this.currentOrder !== null && definition.id !== this.currentOrder.target.id;
      this.resetCombo();
      if (wrongCurrentOrder) this.applyDamage(true);
      if (this.app) {
        spawnPopLabel(
          this.app,
          this.popLabels,
          wrongCurrentOrder ? "SAI ĐƠN · -1 TIM" : "SAI ĐƠN!",
          x,
          y - 24,
          0xff745f,
          this.layers?.worldFeedback,
        );
      }
      AudioManager.playWrong();
      return;
    }

    this.totalHarvested += 1;
    this.harvestedCounts[definition.id] =
      (this.harvestedCounts[definition.id] ?? 0) + 1;
    this.currentOrder.collected += 1;
    this.combo += 1;
    this.comboRevision += 1;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    this.comboExpiresAtMs = this.gameTime + COMBO_WINDOW_MS;

    const multiplier = resolveComboMultiplier(this.combo);
    const points = BASE_HARVEST_SCORE * multiplier;
    const milestone = this.combo > 0 && this.combo % 5 === 0;
    AudioManager.playHarvest(this.combo, milestone);
    this.score += points;

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

    if (milestone) {
      this.spawnCenterText(`COMBO x${this.combo}`, 0xffe36f, 850, 8);
      this.triggerShake(this.combo >= 10 ? 4 : 2, this.combo >= 10 ? 130 : 90);
    }

    if (this.currentOrder.collected >= this.currentOrder.required) {
      this.completeOrder();
    } else {
      this.emitHud(true);
    }
  }

  private tapHazard(definition: HazardDefinition, x: number, y: number) {
    this.resetCombo(false);
    if (this.app) {
      spawnPopLabel(
        this.app,
        this.popLabels,
        "MẤT TIM!",
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
    this.applyDamage(true);
  }

  private applyPowerup(id: PowerupId, x: number, y: number) {
    if (id === "heart") {
      if (this.misses > 0) {
        this.misses -= 1;
        this.spawnPowerupLabel("+1 TIM", x, y, 0xff8fa0);
      } else {
        this.spawnPowerupLabel("TIM ĐẦY", x, y, 0xff8fa0);
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
      this.spawnPowerupLabel(
        cleared > 0 ? `SÉT x${cleared} · +${bonus}` : "SÉT!",
        x,
        y,
        0xffe36f,
      );
      this.flashRemainingMs = 180;
      this.triggerShake(8, 180);
    } else {
      this.slowTimeActiveUntilMs = this.gameTime + SLOW_TIME_DURATION_MS;
      this.spawnPowerupLabel("LÀM CHẬM 5s", x, y, 0x9de7ff);
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
    creature.guideHalo.visible = false;
    if (creature.def.type === "pickup") {
      this.nextPowerupEligibleAtMs = this.gameTime + POWERUP_COOLDOWN_MS;
      return;
    }
    if (
      creature.def.type === "good" &&
      this.currentOrder &&
      creature.def.id === this.currentOrder.target.id
    ) {
      this.resetCombo(false);
      const lostLife = this.applyDamage();
      if (this.app) {
        const feedbackY = Math.min(
          creature.container.y,
          (this.gameplayBounds?.bottom ?? this.app.screen.height * 0.78) - 26,
        );
        spawnPopLabel(
          this.app,
          this.popLabels,
          lostLife ? "RƠI MẤT · -1 TIM" : "RƠI MẤT",
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

  private applyDamage(force = false) {
    if (!force && this.gameTime < this.damageGraceUntilMs) return false;
    this.damageGraceUntilMs = this.gameTime + DAMAGE_GRACE_MS;
    this.misses += 1;
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
    const key = `${color}`;
    let style = this.centerStyleCache.get(key);
    if (!style) {
      style = new TextStyle({
        fill: color,
        fontFamily: "Be Vietnam Pro, system-ui, sans-serif",
        fontSize: 32,
        fontWeight: "900",
        stroke: { color: 0x55320f, width: 5 },
        dropShadow: { alpha: 0.5, color: 0x000000, distance: 2, blur: 4 },
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
    text.x = this.app.screen.width / 2;
    text.y = this.app.screen.height / 2 + offsetY;
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
    if (!this.gameplayBounds || !this.app) return 1;
    const playableHeight = Math.max(1, this.gameplayBounds.bottom - this.gameplayBounds.top);
    const referenceHeight = Math.max(1, this.app.screen.height * 0.62);
    return clamp(playableHeight / referenceHeight, 0.68, 1);
  }

  private resolveEffectParticleCount(desktopCount: number, reducedCount = 4) {
    if (this.reducedMotion) return Math.min(desktopCount, reducedCount);
    if (this.mobilePerformanceMode) {
      return Math.max(3, Math.ceil(desktopCount * 0.55));
    }
    return desktopCount;
  }
}
