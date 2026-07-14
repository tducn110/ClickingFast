import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";
import {
  spawnPopLabel,
  spawnBurst,
  updatePopLabels,
  updateDots,
  destroyPopSystem,
} from "./systems/PopSystem";
import {
  spawnCreature,
  updateCreatures,
  hitTestCreatures,
  type ActiveCreature,
} from "./systems/CreatureSystem";
import {
  MAX_MISSES,
  ORDERABLE_TARGETS,
  TARGETS,
  type TargetDef,
} from "./constants";
import {
  ITEM_REGISTRY,
  type CreatureDef,
  type ItemId,
} from "./itemRegistry";
import { AudioManager } from "../../lib/audioManager";

type PopLabel = Parameters<typeof updatePopLabels>[0][number];
type DotParticle = Parameters<typeof updateDots>[0][number];

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

export interface GameplayModifiers {
  fallSpeedMultiplier: number;
  scoreMultiplier: number;
  comboGraceSeconds: number;
  feverSegments: number;
  shieldCharges: number;
  nextOrderExtraRequired: number;
}

export interface HudEffectSnapshot {
  id: string;
  icon: string;
  label: string;
  tone: "buff" | "debuff";
  remainingMs: number;
}

export interface SkillSnapshot {
  active: boolean;
  available: boolean;
  remainingMs: number;
  cooldownRemainingMs: number;
  charges: number;
}

export interface RuntimeSnapshot {
  modifiers: GameplayModifiers;
  effects: HudEffectSnapshot[];
  shield: SkillSnapshot;
  slowTime: SkillSnapshot;
}

interface TimedEffect {
  id: string;
  label: string;
  icon: string;
  tone: "buff" | "debuff";
  kind: "fall" | "score" | "combo" | "slow";
  value: number;
  endsAtMs: number;
}

export interface EngineCallbacks {
  onScoreChange: (score: number) => void;
  onComboChange: (combo: number) => void;
  onMissesChange: (misses: number) => void;
  onGameStateChange: (state: GameState) => void;
  onReady: () => void;
  onOrdersCompletedChange: (count: number) => void;
  onOrderChange: (order: OrderState | null) => void;
  onFeverChange: (meter: number, isFever: boolean) => void;
}

const DEFAULT_MODIFIERS: GameplayModifiers = {
  fallSpeedMultiplier: 1,
  scoreMultiplier: 1,
  comboGraceSeconds: 2,
  feverSegments: 0,
  shieldCharges: 0,
  nextOrderExtraRequired: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lookupItem(itemId: ItemId): CreatureDef {
  const found = ITEM_REGISTRY.find((item) => item.id === itemId);
  if (!found) {
    throw new Error(`Unknown item id: ${itemId}`);
  }
  return found;
}

export class HarvestGameEngine {
  private wrap: HTMLElement;
  private callbacks: EngineCallbacks;
  public app: Application | null = null;
  private destroyed = false;

  private bgContainer: Container | null = null;
  private skyLayer: Graphics | null = null;
  private fieldLayer: Graphics | null = null;
  private bgSprite: Sprite | null = null;
  private bgTexturePC: Texture | null = null;
  private bgTextureMobile: Texture | null = null;
  private flashGraphics: Graphics | null = null;
  private feverOverlay: Graphics | null = null;

  private creatures: ActiveCreature[] = [];
  private popLabels: PopLabel[] = [];
  private dotParticles: DotParticle[] = [];
  private timedEffects: TimedEffect[] = [];

  private spawnInterval = 1200;
  private lastSpawn = 0;
  private elapsedMs = 0;
  public gameTime = 0;

  public score = 0;
  public misses = 0;
  public combo = 0;
  public gameState: GameState = "loading";
  public currentOrder: OrderState | null = null;
  public ordersCompleted = 0;
  public feverMeter = 0;
  public isFever = false;
  public feverTimerMs = 0;
  public highestCombo = 0;
  public totalHarvested = 0;

  private modifiers: GameplayModifiers = { ...DEFAULT_MODIFIERS };
  private comboExpiresAtMs = 0;
  private pendingOrderStartAtMs: number | null = null;

  private shakeTime = 0;
  private shakeIntensity = 0;
  private flashTime = 0;

  private shieldCharges = 0;
  private shieldActiveUntilMs = 0;
  private shieldCooldownUntilMs = 0;
  private slowTimeActiveUntilMs = 0;
  private slowTimeCooldownUntilMs = 0;

  constructor(wrap: HTMLElement, callbacks: EngineCallbacks) {
    this.wrap = wrap;
    this.callbacks = callbacks;
  }

  public async init() {
    this.app = new Application();

    await this.app.init({
      width: this.wrap.clientWidth || 800,
      height: this.wrap.clientHeight || 600,
      backgroundColor: 0xdcecf0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed || !this.app) return;

    this.wrap.appendChild(this.app.canvas);
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    this.bgContainer = new Container();
    this.app.stage.addChild(this.bgContainer);

    try {
      this.bgTexturePC = await Assets.load("/bg_game.png");
      this.bgTextureMobile = await Assets.load("/bg_game_mobile.png");
    } catch (error) {
      console.warn("Failed to load background images", error);
    }

    this.rebuildBackground(width, height);

    let elapsed = 0;
    this.app.ticker.add((ticker) => {
      if (!this.app || this.destroyed) return;

      const dt = ticker.deltaMS;
      elapsed += dt;
      this.elapsedMs = elapsed;

      if (this.gameState !== "playing") return;

      this.gameTime += dt;
      this.updateTimedEffects();
      this.updateComboWindow();
      this.updatePendingOrder();
      this.updateFever(dt, elapsed);
      this.updateOrderTimer(dt);
      this.updateStageEffects(dt);
      this.updateSpawner(elapsed);

      this.creatures = updateCreatures(
        this.creatures,
        elapsed,
        this.modifiers.fallSpeedMultiplier,
        this.onCreatureExpire.bind(this)
      );
      this.popLabels = updatePopLabels(this.popLabels);
      this.dotParticles = updateDots(this.dotParticles);
    });

    this.callbacks.onReady();
  }

  public startGame() {
    this.score = 0;
    this.misses = 0;
    this.combo = 0;
    this.ordersCompleted = 0;
    this.highestCombo = 0;
    this.totalHarvested = 0;
    this.gameTime = 0;
    this.elapsedMs = 0;
    this.spawnInterval = 1200;
    this.lastSpawn = 0;
    this.currentOrder = null;
    this.pendingOrderStartAtMs = null;
    this.comboExpiresAtMs = 0;
    this.isFever = false;
    this.feverMeter = 0;
    this.feverTimerMs = 0;
    this.timedEffects = [];
    this.modifiers = { ...DEFAULT_MODIFIERS };
    this.shieldCharges = 0;
    this.shieldActiveUntilMs = 0;
    this.shieldCooldownUntilMs = 0;
    this.slowTimeActiveUntilMs = 0;
    this.slowTimeCooldownUntilMs = 0;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.flashTime = 0;

    this.callbacks.onScoreChange(0);
    this.callbacks.onMissesChange(0);
    this.callbacks.onComboChange(0);
    this.callbacks.onOrdersCompletedChange(0);
    this.callbacks.onFeverChange(0, false);

    this.clearActiveEntities();
    AudioManager.setBGMSpeed(1);
    this.startNewOrder();
    this.setGameState("playing");
  }

  public reviveRun(options?: { restoreLives?: number; minOrderTimeMs?: number }) {
    const restoreLives = options?.restoreLives ?? MAX_MISSES;
    const minOrderTimeMs = options?.minOrderTimeMs ?? 6000;

    this.misses = Math.max(0, MAX_MISSES - restoreLives);
    this.callbacks.onMissesChange(this.misses);
    this.clearActiveEntities();

    if (!this.currentOrder) {
      this.startNewOrder();
    } else {
      this.currentOrder.timeRemainingMs = Math.max(
        minOrderTimeMs,
        this.currentOrder.timeRemainingMs
      );
      this.callbacks.onOrderChange({ ...this.currentOrder });
    }
  }

  public clearActiveEntities() {
    for (const creature of this.creatures) {
      creature.container.destroy({ children: true });
    }
    this.creatures = [];
    destroyPopSystem(this.popLabels, this.dotParticles);
    this.popLabels = [];
    this.dotParticles = [];
  }

  public activateShield() {
    if (this.gameState !== "playing") return false;
    if (this.shieldCharges <= 0) return false;
    if (this.shieldActiveUntilMs > this.gameTime) return false;
    if (this.shieldCooldownUntilMs > this.gameTime) return false;

    this.shieldCharges -= 1;
    this.shieldActiveUntilMs = this.gameTime + 8000;
    this.shieldCooldownUntilMs = this.gameTime + 25000;
    this.recomputeModifiers();
    return true;
  }

  public activateSlowTime() {
    if (this.gameState !== "playing") return false;
    if (this.slowTimeActiveUntilMs > this.gameTime) return false;
    if (this.slowTimeCooldownUntilMs > this.gameTime) return false;

    this.slowTimeActiveUntilMs = this.gameTime + 5000;
    this.slowTimeCooldownUntilMs = this.gameTime + 20000;
    this.pushTimedEffect({
      kind: "slow",
      value: 0.55,
      durationMs: 5000,
      label: "Chậm thời gian",
      icon: "S",
      tone: "buff",
    });
    return true;
  }

  public getRuntimeSnapshot(): RuntimeSnapshot {
    const now = this.gameTime;
    const effects = this.timedEffects
      .map((effect) => ({
        id: effect.id,
        icon: effect.icon,
        label: effect.label,
        tone: effect.tone,
        remainingMs: Math.max(0, effect.endsAtMs - now),
      }))
      .filter((effect) => effect.remainingMs > 0)
      .sort((a, b) => a.remainingMs - b.remainingMs);

    return {
      modifiers: {
        ...this.modifiers,
        shieldCharges: this.shieldCharges,
        feverSegments: this.feverMeter,
      },
      effects,
      shield: {
        active: this.shieldActiveUntilMs > now,
        available:
          this.shieldCharges > 0 &&
          this.shieldCooldownUntilMs <= now &&
          this.shieldActiveUntilMs <= now,
        remainingMs: Math.max(0, this.shieldActiveUntilMs - now),
        cooldownRemainingMs: Math.max(0, this.shieldCooldownUntilMs - now),
        charges: this.shieldCharges,
      },
      slowTime: {
        active: this.slowTimeActiveUntilMs > now,
        available:
          this.slowTimeCooldownUntilMs <= now &&
          this.slowTimeActiveUntilMs <= now,
        remainingMs: Math.max(0, this.slowTimeActiveUntilMs - now),
        cooldownRemainingMs: Math.max(0, this.slowTimeCooldownUntilMs - now),
        charges: 0,
      },
    };
  }

  public setGameState(state: GameState) {
    this.gameState = state;
    this.callbacks.onGameStateChange(state);
  }

  public handleTap(clientX: number, clientY: number) {
    if (this.gameState !== "playing" || !this.app) return;

    const rect = this.wrap.getBoundingClientRect();
    const tx = (clientX - rect.left) * (this.app.screen.width / rect.width);
    const ty = (clientY - rect.top) * (this.app.screen.height / rect.height);

    const hit = hitTestCreatures(this.creatures, tx, ty);
    if (hit) {
      this.tapCreature(hit);
    }
  }

  public resize(width: number, height: number) {
    if (!this.app || this.destroyed) return;
    if (
      this.app.screen.width === width &&
      this.app.screen.height === height
    ) {
      return;
    }
    this.app.renderer.resize(width, height);
    this.rebuildBackground(width, height);
  }

  public destroy() {
    this.destroyed = true;
    this.clearActiveEntities();

    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }

  private updateTimedEffects() {
    const now = this.gameTime;
    this.timedEffects = this.timedEffects.filter((effect) => effect.endsAtMs > now);

    if (this.shieldActiveUntilMs <= now) {
      this.shieldActiveUntilMs = 0;
    }
    if (this.slowTimeActiveUntilMs <= now) {
      this.slowTimeActiveUntilMs = 0;
    }

    this.recomputeModifiers();
  }

  private recomputeModifiers() {
    let fallSpeedMultiplier = 1;
    let scoreMultiplier = 1;
    let comboGraceSeconds = 2;

    for (const effect of this.timedEffects) {
      if (effect.kind === "fall") fallSpeedMultiplier *= effect.value;
      if (effect.kind === "score") scoreMultiplier *= effect.value;
      if (effect.kind === "combo") comboGraceSeconds = Math.min(
        comboGraceSeconds,
        effect.value
      );
      if (effect.kind === "slow") fallSpeedMultiplier *= effect.value;
    }

    this.modifiers = {
      ...this.modifiers,
      fallSpeedMultiplier: clamp(fallSpeedMultiplier, 0.5, 1.8),
      scoreMultiplier,
      comboGraceSeconds,
      shieldCharges: this.shieldCharges,
      feverSegments: this.feverMeter,
    };
  }

  private updateComboWindow() {
    if (this.combo > 0 && this.comboExpiresAtMs > 0 && this.gameTime >= this.comboExpiresAtMs) {
      this.resetCombo();
    }
  }

  private updatePendingOrder() {
    if (
      this.pendingOrderStartAtMs !== null &&
      this.gameTime >= this.pendingOrderStartAtMs
    ) {
      this.pendingOrderStartAtMs = null;
      if (!this.currentOrder) {
        this.startNewOrder();
      }
    }
  }

  private updateFever(dt: number, elapsed: number) {
    if (this.isFever) {
      this.feverTimerMs -= dt;
      if (this.feverOverlay) {
        this.feverOverlay.alpha = 0.28 + Math.sin(elapsed * 0.01) * 0.08;
      }
      if (this.feverTimerMs <= 0) {
        this.isFever = false;
        this.feverMeter = 0;
        this.modifiers.feverSegments = 0;
        this.feverTimerMs = 0;
        AudioManager.setBGMSpeed(1);
        if (this.feverOverlay) this.feverOverlay.alpha = 0;
        this.callbacks.onFeverChange(this.feverMeter, this.isFever);
      }
    } else if (this.feverOverlay) {
      this.feverOverlay.alpha = 0;
    }
  }

  private updateOrderTimer(dt: number) {
    if (this.currentOrder && !this.isFever) {
      this.currentOrder.timeRemainingMs -= dt;
      if (this.currentOrder.timeRemainingMs <= 0) {
        this.startNewOrder();
      } else {
        this.callbacks.onOrderChange({ ...this.currentOrder });
      }
    }
  }

  private updateStageEffects(dt: number) {
    if (!this.app) return;

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime > 0) {
        const amount = this.shakeIntensity * (this.shakeTime / 200);
        this.app.stage.x = (Math.random() - 0.5) * amount;
        this.app.stage.y = (Math.random() - 0.5) * amount;
      } else {
        this.app.stage.x = 0;
        this.app.stage.y = 0;
      }
    }

    if (this.flashTime > 0 && this.flashGraphics) {
      this.flashTime -= dt;
      this.flashGraphics.alpha = this.flashTime > 0 ? this.flashTime / 150 : 0;
    }
  }

  private updateSpawner(elapsed: number) {
    if (!this.app) return;

    const currentWidth = this.app.screen.width;
    const currentHeight = this.app.screen.height;
    const isMobile = currentWidth <= 768;
    const waveLevel = this.ordersCompleted;

    let maxAllowed = isMobile ? 2 : 3;
    if (waveLevel >= 2) maxAllowed += 1;
    if (waveLevel >= 4) maxAllowed += 1;
    if (this.isFever) maxAllowed = 6;

    let baseInterval = 1200 - Math.min(600, waveLevel * 100);
    if (this.isFever) baseInterval = 400;

    this.spawnInterval = baseInterval;
    const activeCreatures = this.creatures.filter(
      (creature) => creature.phase === "alive" || creature.phase === "popin"
    );
    const activeGood = activeCreatures.filter(
      (creature) => creature.def.type === "good"
    ).length;
    const activeBad = activeCreatures.filter(
      (creature) => creature.def.type === "bad"
    ).length;

    if (this.isFever && Math.random() < 0.1) {
      spawnBurst(
        this.app,
        this.dotParticles,
        Math.random() * currentWidth,
        Math.random() * currentHeight * 0.5,
        0xffd700
      );
    }

    if (
      elapsed - this.lastSpawn <= this.spawnInterval ||
      activeCreatures.length >= maxAllowed
    ) {
      return;
    }

    this.lastSpawn = elapsed;
    let spawnType = "good";
    let forcedDef: CreatureDef | undefined;

    if (this.isFever) {
      forcedDef = this.currentOrder?.target;
    } else if (waveLevel === 0) {
      forcedDef = this.currentOrder?.target;
    } else if (waveLevel === 1) {
      if (Math.random() < 0.25 && activeBad < 1) {
        spawnType = "bad";
      } else if (Math.random() < 0.7) {
        forcedDef = this.currentOrder?.target;
      }
    } else {
      if (Math.random() < 0.3 && activeBad < (waveLevel >= 3 ? 2 : 1)) {
        spawnType = "bad";
      } else if (activeGood >= maxAllowed - 1) {
        spawnType = "none";
      } else if (Math.random() < 0.6) {
        forcedDef = this.currentOrder?.target;
      }
    }

    if (spawnType === "none") return;

    const newCreature = spawnCreature(
      this.app,
      elapsed,
      this.gameTime,
      [spawnType],
      this.creatures,
      this.isFever,
      forcedDef
    );
    if (newCreature) {
      this.creatures.push(newCreature);
    }
  }

  private startNewOrder() {
    let available = ORDERABLE_TARGETS.filter(
      (target) => target.id !== this.currentOrder?.target?.id
    );
    if (available.length === 0) {
      available = [...ORDERABLE_TARGETS];
    }

    const target = available[Math.floor(Math.random() * available.length)];
    const baseRequired = 4 + Math.floor(this.ordersCompleted / 2);
    const required = baseRequired + this.modifiers.nextOrderExtraRequired;

    this.modifiers.nextOrderExtraRequired = 0;
    this.currentOrder = {
      target,
      required,
      collected: 0,
      timeLimitMs: 15000 + (required - 4) * 2000,
      timeRemainingMs: 15000 + (required - 4) * 2000,
    };
    this.callbacks.onOrderChange({ ...this.currentOrder });
  }

  private tapCreature(creature: ActiveCreature) {
    if (creature.phase !== "alive") return;

    creature.tapped = true;
    creature.phase = "popout";

    if (creature.def.type === "bad") {
      this.applyHazardEffect(creature.def.id as ItemId, creature.x, creature.y);
      return;
    }

    this.totalHarvested += 1;

    if (!this.currentOrder || creature.def.id !== this.currentOrder.target.id) {
      this.resetCombo();
      if (this.app) {
        spawnPopLabel(this.app, this.popLabels, "SAI ĐƠN!", creature.x, creature.y - 24, 0xff4444);
      }
      this.triggerShake(3, 100);
      AudioManager.playSlash();
      return;
    }

    this.currentOrder.collected += 1;
    let points = creature.def.baseScore;
    this.combo += 1;
    if (this.combo > this.highestCombo) this.highestCombo = this.combo;
    this.extendComboWindow();

    if (!this.isFever) {
      this.addFeverSegments(1);
    }

    this.applyItemEffect(creature.def.id as ItemId, creature.x, creature.y);

    if (this.currentOrder.collected >= this.currentOrder.required) {
      this.ordersCompleted += 1;
      this.callbacks.onOrdersCompletedChange(this.ordersCompleted);
      points += 500;
      this.spawnCenterText("HOÀN THÀNH!", 0x44ff44, 800, 50);
      this.currentOrder = null;
      this.callbacks.onOrderChange(null);
      this.pendingOrderStartAtMs = this.gameTime + 1500;
    } else {
      this.callbacks.onOrderChange({ ...this.currentOrder });
    }

    points *= 1 + Math.floor(this.combo / 5);
    points *= this.modifiers.scoreMultiplier;
    if (this.isFever) points *= 2;
    points = Math.round(points);

    this.score += points;
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onComboChange(this.combo);

    if (this.app) {
      spawnPopLabel(this.app, this.popLabels, points, creature.x, creature.y - 24, creature.def.glow);
      spawnBurst(this.app, this.dotParticles, creature.x, creature.y, creature.def.glow);
    }
    AudioManager.playPop();
    this.triggerShake(3, 100);
  }

  private applyItemEffect(itemId: ItemId, x: number, y: number) {
    switch (itemId) {
      case "mango":
        this.pushTimedEffect({
          kind: "fall",
          value: 1.15,
          durationMs: 5000,
          label: "Rơi nhanh",
          icon: "!",
          tone: "debuff",
        });
        break;
      case "pumpkin":
        this.shieldCharges += 1;
        this.modifiers.nextOrderExtraRequired += 1;
        break;
      case "peanut":
        this.addFeverSegments(3);
        this.pushTimedEffect({
          kind: "combo",
          value: 1,
          durationMs: 6000,
          label: "Combo gắt",
          icon: "C",
          tone: "debuff",
        });
        break;
      case "strawberry":
        this.pushTimedEffect({
          kind: "score",
          value: 2,
          durationMs: 5000,
          label: "Điểm x2",
          icon: "x2",
          tone: "buff",
        });
        this.spawnForcedHazard("worm");
        break;
      default:
        break;
    }

    if (this.app && itemId !== "pumpkin") {
      spawnBurst(this.app, this.dotParticles, x, y, 0xfff2b4);
    }
    this.recomputeModifiers();
  }

  private applyHazardEffect(itemId: ItemId, x: number, y: number) {
    switch (itemId) {
      case "bee":
        this.pushTimedEffect({
          kind: "fall",
          value: 1.35,
          durationMs: 6000,
          label: "Ong ép nhịp",
          icon: "B",
          tone: "debuff",
        });
        break;
      case "worm":
        if (this.currentOrder) {
          this.currentOrder.collected = Math.max(0, this.currentOrder.collected - 1);
          this.callbacks.onOrderChange({ ...this.currentOrder });
        }
        this.applyDamage(x, y);
        break;
      case "rotten":
        this.resetCombo();
        this.isFever = false;
        this.feverMeter = 0;
        this.modifiers.feverSegments = 0;
        this.feverTimerMs = 0;
        AudioManager.setBGMSpeed(1);
        this.callbacks.onFeverChange(0, false);
        this.applyDamage(x, y);
        break;
      default:
        break;
    }

    if (this.app) {
      spawnBurst(this.app, this.dotParticles, x, y, 0xcc7069);
    }
    this.triggerShake(6, 140);
    AudioManager.playSlash();
    this.recomputeModifiers();
  }

  private addFeverSegments(amount: number) {
    if (this.isFever) return;
    this.feverMeter = Math.min(8, this.feverMeter + amount);
    this.modifiers.feverSegments = this.feverMeter;
    this.callbacks.onFeverChange(this.feverMeter, this.isFever);
    if (this.feverMeter >= 8) {
      this.triggerFever();
    }
  }

  private triggerFever() {
    this.isFever = true;
    this.feverTimerMs = 5000;
    this.feverMeter = 8;
    this.modifiers.feverSegments = this.feverMeter;
    AudioManager.setBGMSpeed(1.25);
    this.callbacks.onFeverChange(this.feverMeter, this.isFever);
    this.spawnCenterText("MÙA BỘI THU!", 0xffd700, 1500, 0);
  }

  private applyDamage(x: number, y: number) {
    if (this.consumeShieldIfActive(x, y)) {
      return;
    }

    this.misses += 1;
    this.callbacks.onMissesChange(this.misses);
    this.triggerShake(4, 120);
    this.flashTime = 150;
    AudioManager.setBGMSpeed(1);

    if (this.misses >= MAX_MISSES) {
      this.setGameState("dead");
    }
  }

  private consumeShieldIfActive(x: number, y: number) {
    if (this.shieldActiveUntilMs <= this.gameTime) return false;
    this.shieldActiveUntilMs = 0;
    if (this.app) {
      spawnPopLabel(this.app, this.popLabels, "CHẶN", x, y - 24, 0x7bd7ff);
      spawnBurst(this.app, this.dotParticles, x, y, 0x7bd7ff);
    }
    return true;
  }

  private onCreatureExpire(creature: ActiveCreature) {
    if (creature.phase !== "alive") return;

    creature.tapped = false;
    creature.phase = "popout";

    if (
      creature.def.type === "good" &&
      this.currentOrder &&
      creature.def.id === this.currentOrder.target.id
    ) {
      this.resetCombo();
      this.applyDamage(creature.x, creature.y);
      this.triggerShake(4, 120);
      this.flashTime = 150;
      if (this.app) {
        spawnBurst(this.app, this.dotParticles, creature.x, creature.y, 0x6b3a18);
      }
      AudioManager.playSlash();
    }
  }

  private extendComboWindow() {
    this.comboExpiresAtMs =
      this.gameTime + this.modifiers.comboGraceSeconds * 1000;
  }

  private resetCombo() {
    this.combo = 0;
    this.comboExpiresAtMs = 0;
    this.callbacks.onComboChange(0);
  }

  private spawnForcedHazard(itemId: ItemId) {
    if (!this.app) return;

    const definition = lookupItem(itemId);
    const hazard = spawnCreature(
      this.app,
      this.elapsedMs,
      this.gameTime,
      ["bad"],
      this.creatures,
      false,
      definition
    );
    if (hazard) {
      this.creatures.push(hazard);
    }
  }

  private pushTimedEffect(effect: {
    kind: TimedEffect["kind"];
    value: number;
    durationMs: number;
    label: string;
    icon: string;
    tone: TimedEffect["tone"];
  }) {
    this.timedEffects.push({
      id: `${effect.kind}-${this.gameTime}-${Math.random().toString(36).slice(2, 8)}`,
      kind: effect.kind,
      value: effect.value,
      endsAtMs: this.gameTime + effect.durationMs,
      label: effect.label,
      icon: effect.icon,
      tone: effect.tone,
    });
    this.recomputeModifiers();
  }

  private spawnCenterText(text: string, color: number, lifetimeMs: number, offsetY: number) {
    if (!this.app) return;

    const label = new Text({
      text,
      style: new TextStyle({
        fill: color,
        fontSize: 32,
        fontWeight: "bold",
        dropShadow: { alpha: 0.8, color: 0x000000, distance: 1 },
      }),
    });
    label.anchor.set(0.5);
    label.x = this.app.screen.width / 2;
    label.y = this.app.screen.height / 2 + offsetY;
    this.app.stage.addChild(label);

    let age = 0;
    const tick = () => {
      if (!this.app) return;
      age += this.app.ticker.deltaMS;
      label.y -= 1;
      label.alpha = 1 - age / lifetimeMs;
      if (age >= lifetimeMs) {
        this.app.ticker.remove(tick);
        label.destroy();
      }
    };
    this.app.ticker.add(tick);
  }

  private triggerShake(intensity: number, duration = 200) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
  }

  private rebuildBackground(width: number, height: number) {
    if (!this.app || !this.bgContainer) return;
    this.bgContainer.removeChildren();

    const isMobile = width <= 768 || width < height;
    const currentTexture = isMobile
      ? this.bgTextureMobile || this.bgTexturePC
      : this.bgTexturePC;

    if (currentTexture) {
      if (!this.bgSprite) {
        this.bgSprite = new Sprite(currentTexture);
        this.bgSprite.anchor.set(0.5);
      } else {
        this.bgSprite.texture = currentTexture;
      }
      this.bgContainer.addChild(this.bgSprite);
      this.bgSprite.x = width / 2;
      this.bgSprite.y = height / 2;

      const scaleX = width / currentTexture.width;
      const scaleY = height / currentTexture.height;
      this.bgSprite.scale.set(Math.max(scaleX, scaleY));
    } else {
      if (this.skyLayer) this.skyLayer.destroy();
      this.skyLayer = new Graphics();
      this.skyLayer.rect(0, 0, width, height);
      this.skyLayer.fill(0xdcecf0);
      this.bgContainer.addChild(this.skyLayer);

      const fieldTop = height * 0.78;
      if (this.fieldLayer) this.fieldLayer.destroy();
      this.fieldLayer = new Graphics();
      this.fieldLayer.rect(0, fieldTop, width, height - fieldTop);
      this.fieldLayer.fill(0x8b4513);
      this.fieldLayer.rect(0, fieldTop, width, 8);
      this.fieldLayer.fill(0x228b22);
      this.bgContainer.addChild(this.fieldLayer);
    }

    if (this.flashGraphics) this.flashGraphics.destroy();
    this.flashGraphics = new Graphics();
    this.flashGraphics.rect(0, 0, width, height);
    this.flashGraphics.fill({ color: 0xff0000, alpha: 0.25 });
    this.flashGraphics.alpha = this.flashTime > 0 ? this.flashTime / 150 : 0;
    this.bgContainer.addChild(this.flashGraphics);

    if (this.feverOverlay) this.feverOverlay.destroy();
    this.feverOverlay = new Graphics();
    this.feverOverlay.rect(0, 0, width, height);
    this.feverOverlay.fill({ color: 0xffaa00, alpha: 1 });
    this.feverOverlay.alpha = this.isFever ? 0.3 : 0;
    this.feverOverlay.blendMode = "screen";
    this.bgContainer.addChild(this.feverOverlay);
  }
}
