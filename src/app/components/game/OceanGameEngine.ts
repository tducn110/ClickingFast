import { Application } from "pixi.js";
import { createSky } from "./scene/drawSky";
import { createWater, updateWater } from "./scene/drawWater";
import { createBoat, updateBoat } from "./scene/drawBoat";
import { createBubbles, updateBubbles, destroyBubbles } from "./systems/BubbleSystem";
import { createHeartsHUD, updateHearts } from "./systems/HeartsHUD";
import {
  spawnPopLabel, spawnBurst,
  updatePopLabels, updateDots,
  destroyPopSystem,
} from "./systems/PopSystem";
import {
  spawnCreature, updateCreatures, hitTestCreatures,
  type ActiveCreature,
} from "./systems/CreatureSystem";
import { MAX_MISSES } from "./constants";
import { AudioManager } from "../../lib/audioManager";

type PopLabel  = Parameters<typeof updatePopLabels>[0][number];
type DotParticle = Parameters<typeof updateDots>[0][number];

export type GameState = "login" | "loading" | "idle" | "playing" | "dead" | "paused" | "countdown";

export interface EngineCallbacks {
  onScoreChange: (score: number) => void;
  onComboChange: (combo: number) => void;
  onMissesChange: (misses: number) => void;
  onGameStateChange: (state: GameState) => void;
  onReady: () => void;
}

export class OceanGameEngine {
  private wrap: HTMLElement;
  private callbacks: EngineCallbacks;
  private app: Application | null = null;
  private destroyed = false;

  // Scene references
  private waterLayer: ReturnType<typeof createWater> | null = null;
  private boatScene: ReturnType<typeof createBoat> | null = null;
  private heartsHUD: ReturnType<typeof createHeartsHUD> | null = null;

  // Mutable state
  private creatures: ActiveCreature[] = [];
  private bubbles: ReturnType<typeof createBubbles> = [];
  private popLabels: PopLabel[] = [];
  private dotParticles: DotParticle[] = [];

  private spawnInterval = 1200;
  private lastSpawn = 0;
  public gameTime = 0;

  public score = 0;
  public misses = 0;
  public combo = 0;
  public gameState: GameState = "loading";

  private comboTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Screen shake state
  private shakeTime = 0;
  private shakeIntensity = 0;

  public difficulty: string = "Normal";

  constructor(wrap: HTMLElement, callbacks: EngineCallbacks) {
    this.wrap = wrap;
    this.callbacks = callbacks;
  }

  public setDifficulty(diff: string) {
    this.difficulty = diff;
  }

  public async init() {
    this.app = new Application();
    
    // Allow React loading screen to render by delaying slightly
    await this.app.init({
      width: this.wrap.clientWidth || 800,
      height: this.wrap.clientHeight || 600,
      backgroundColor: 0xdcecf0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed || !this.app) return; // In case it was destroyed during init

    this.wrap.appendChild(this.app.canvas);
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // Build scene
    this.app.stage.addChild(createSky(this.app));

    this.waterLayer = createWater(this.app);
    this.app.stage.addChild(this.waterLayer.deep);
    this.app.stage.addChild(this.waterLayer.reflection);
    this.app.stage.addChild(this.waterLayer.surface);

    this.boatScene = createBoat(this.app);
    this.bubbles = createBubbles(this.app);
    this.heartsHUD = createHeartsHUD(this.app);

    // Setup ticker
    let elapsed = 0;
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;
      elapsed += dt;

      // Always run background animations
      if (this.waterLayer) updateWater(this.waterLayer, W, H, elapsed);
      updateBubbles(this.bubbles, H, W);
      if (this.boatScene) updateBoat(this.boatScene, H, elapsed);

      if (this.gameState !== "playing") return;
      this.gameTime += dt;

      // Update screen shake
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        if (this.shakeTime > 0) {
          const amt = this.shakeIntensity * (this.shakeTime / 200); // rough duration scale
          this.app!.stage.x = (Math.random() - 0.5) * amt;
          this.app!.stage.y = (Math.random() - 0.5) * amt;
        } else {
          this.app!.stage.x = 0;
          this.app!.stage.y = 0;
        }
      }

      // Difficulty ramp
      let spawnBase = 1200;
      let spawnRamp = 0.04;
      if (this.difficulty === "Easy") {
        spawnBase = 1500;
        spawnRamp = 0.03;
      } else if (this.difficulty === "Hard") {
        spawnBase = 800;
        spawnRamp = 0.05;
      }
      this.spawnInterval = Math.max(400, spawnBase - this.gameTime * spawnRamp);

      if (elapsed - this.lastSpawn > this.spawnInterval) {
        this.lastSpawn = elapsed;
        this.creatures.push(spawnCreature(this.app!, elapsed, this.gameTime, this.difficulty));
      }

      this.creatures = updateCreatures(
        this.creatures,
        elapsed,
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
    this.callbacks.onScoreChange(0);
    this.callbacks.onMissesChange(0);
    this.callbacks.onComboChange(0);

    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];
    destroyPopSystem(this.popLabels, this.dotParticles);

    this.spawnInterval = 1200;
    this.lastSpawn = 0;
    this.gameTime = 0;

    if (this.heartsHUD) updateHearts(this.heartsHUD, 0);
    this.setGameState("playing");

    AudioManager.playBGM();
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
    if (hit) this.tapCreature(hit);
  }

  public triggerShake(intensity: number, duration: number = 200) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
  }

  private onCreatureExpire(c: ActiveCreature) {
    if (c.phase !== "alive") return;
    c.tapped = false;
    c.phase = "popout";

    this.misses += 1;
    this.callbacks.onMissesChange(this.misses);
    if (this.heartsHUD) updateHearts(this.heartsHUD, this.misses);
    
    // Heavy screen shake on miss (losing a heart)
    this.triggerShake(15, 300);
    
    this.combo = 0;
    this.callbacks.onComboChange(0);
    if (this.comboTimer) clearTimeout(this.comboTimer);

    if (this.misses >= MAX_MISSES) {
      this.setGameState("dead");
    }
  }

  private tapCreature(c: ActiveCreature) {
    c.tapped = true;
    c.phase = "popout";

    this.combo += 1;
    this.callbacks.onComboChange(this.combo);
    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.combo = 0;
      this.callbacks.onComboChange(0);
    }, 1500);

    let pts = c.def.points;
    if (this.combo >= 3) pts = Math.round(pts * (1 + this.combo * 0.3));

    this.score += pts;
    this.callbacks.onScoreChange(this.score);

    if (this.app) {
      spawnPopLabel(this.app, this.popLabels, pts, c.x, c.y - 24, c.def.glow);
      spawnBurst(this.app, this.dotParticles, c.x, c.y, c.def.glow);
    }
    
    // Animation and Sound
    if (this.boatScene) {
      this.boatScene.triggerCatch();
    }
    AudioManager.playPop();

    // Light screen shake on hit
    this.triggerShake(4, 100);
  }

  public destroy() {
    this.destroyed = true;
    if (this.comboTimer) clearTimeout(this.comboTimer);
    destroyBubbles(this.bubbles);
    destroyPopSystem(this.popLabels, this.dotParticles);
    
    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];
    
    this.heartsHUD = null;
    this.boatScene = null;
    this.waterLayer = null;

    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
