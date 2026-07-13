const fs = require('fs');
const content = `import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import { createBubbles, updateBubbles, destroyBubbles } from "./systems/BubbleSystem";
import {
  spawnPopLabel, spawnBurst,
  updatePopLabels, updateDots,
  destroyPopSystem,
} from "./systems/PopSystem";
import {
  spawnCreature, updateCreatures, hitTestCreatures,
  type ActiveCreature,
} from "./systems/CreatureSystem";
import { MAX_MISSES, WATERLINE_RATIO, TARGETS, type TargetDef } from "./constants";
import { AudioManager } from "../../lib/audioManager";

type PopLabel  = Parameters<typeof updatePopLabels>[0][number];
type DotParticle = Parameters<typeof updateDots>[0][number];

export type GameState = "login" | "loading" | "idle" | "playing" | "dead" | "paused" | "countdown";

export interface OrderState {
  target: TargetDef;
  required: number;
  collected: number;
  timeLimitMs: number;
  timeRemainingMs: number;
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

export class HarvestGameEngine {
  private wrap: HTMLElement;
  private callbacks: EngineCallbacks;
  public app: Application | null = null;
  private destroyed = false;

  private bgContainer: Container | null = null;
  private skyLayer: Graphics | null = null;
  private fieldLayer: Graphics | null = null;
  private perfectZoneLayer: Graphics | null = null;

  private creatures: ActiveCreature[] = [];
  private popLabels: PopLabel[] = [];
  private dotParticles: DotParticle[] = [];

  private spawnInterval = 1200;
  private lastSpawn = 0;
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
  public highestPerfect = 0;
  public totalHarvested = 0;

  private comboTimer: ReturnType<typeof setTimeout> | null = null;

  private shakeTime = 0;
  private shakeIntensity = 0;

  private flashTime = 0;
  private flashGraphics: Graphics | null = null;

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

    await this.app.init({
      width: this.wrap.clientWidth || 800,
      height: this.wrap.clientHeight || 600,
      backgroundColor: 0xDCECF0, 
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed || !this.app) return;

    this.wrap.appendChild(this.app.canvas);
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    this.bgContainer = new Container();
    this.app.stage.addChild(this.bgContainer);
    
    this.rebuildBackground(W, H);

    let elapsed = 0;
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;
      elapsed += dt;

      const currW = this.app ? this.app.screen.width : W;
      const currH = this.app ? this.app.screen.height : H;

      if (this.gameState !== "playing") return;
      this.gameTime += dt;

      if (this.isFever) {
        this.feverTimerMs -= dt;
        if (this.feverTimerMs <= 0) {
          this.isFever = false;
          this.feverMeter = 0;
          this.callbacks.onFeverChange(this.feverMeter, this.isFever);
        }
      }

      if (this.currentOrder && !this.isFever) {
        this.currentOrder.timeRemainingMs -= dt;
        if (this.currentOrder.timeRemainingMs <= 0) {
          this.startNewOrder();
        } else {
          if (Math.floor((this.currentOrder.timeRemainingMs + dt) / 1000) !== Math.floor(this.currentOrder.timeRemainingMs / 1000)) {
             this.callbacks.onOrderChange({...this.currentOrder});
          }
        }
      }

      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        if (this.shakeTime > 0) {
          const amt = this.shakeIntensity * (this.shakeTime / 200); 
          this.app!.stage.x = (Math.random() - 0.5) * amt;
          this.app!.stage.y = (Math.random() - 0.5) * amt;
        } else {
          this.app!.stage.x = 0;
          this.app!.stage.y = 0;
        }
      }

      if (this.flashTime > 0 && this.flashGraphics) {
        this.flashTime -= dt;
        if (this.flashTime > 0) {
          this.flashGraphics.alpha = this.flashTime / 150;
        } else {
          this.flashGraphics.alpha = 0;
        }
      }

      const isMobile = currW <= 768;
      const maxAllowed = isMobile ? 2 : 3;
      
      let baseInterval = 1100;
      if (this.isFever) baseInterval = 600;

      this.spawnInterval = baseInterval;

      const activeCreatures = this.creatures.filter(c => c.phase === "alive" || c.phase === "popin");
      const activeGood = activeCreatures.filter(c => c.def.type === "good").length;
      const activeBad = activeCreatures.filter(c => c.def.type === "bad").length;

      if (elapsed - this.lastSpawn > this.spawnInterval && activeCreatures.length < maxAllowed) {
        this.lastSpawn = elapsed;

        let spawnType = "good";
        let forceTargetDef: TargetDef | undefined;

        if (this.isFever) {
          spawnType = "good";
          forceTargetDef = this.currentOrder?.target;
        } else {
          const r = Math.random();
          if (r < 0.20 && activeBad < 1) {
            spawnType = "bad";
          } else {
            spawnType = "good";
            if (activeGood >= 2) spawnType = "none";
            else {
              if (Math.random() < 0.68) forceTargetDef = this.currentOrder?.target;
            }
          }
        }

        if (spawnType !== "none") {
          const newCreature = spawnCreature(
            this.app!, elapsed, this.gameTime, 
            [spawnType], this.difficulty, this.creatures, this.isFever
          );
          if (newCreature) {
            if (forceTargetDef && newCreature.def.type === "good") {
               newCreature.def = forceTargetDef;
               newCreature.emojiLabel.text = forceTargetDef.emoji;
            }
            this.creatures.push(newCreature);
          }
        }
      }

      const zoneTop = currH * 0.65;
      const zoneBot = currH * 0.78;
      
      for (const c of this.creatures) {
         if (c.phase === "alive" && c.def.type === "good" && this.currentOrder && c.def.id === this.currentOrder.target.id) {
            const inZone = c.y >= zoneTop && c.y <= zoneBot;
            if (inZone) {
               c.container.scale.set(1.1);
               c.filter.brightness(1.3, true);
            } else {
               c.container.scale.set(1.0);
               c.filter.reset();
            }
         }
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

  private startNewOrder() {
    const goodTargets = TARGETS.filter(t => t.type === "good");
    let available = goodTargets.filter(t => t.id !== this.currentOrder?.target?.id);
    if (available.length === 0) available = goodTargets;

    const target = available[Math.floor(Math.random() * available.length)];

    this.currentOrder = {
      target,
      required: 4,
      collected: 0,
      timeLimitMs: 10000,
      timeRemainingMs: 10000
    };
    this.callbacks.onOrderChange({...this.currentOrder});
  }

  public startGame() {
    this.score = 0;
    this.misses = 0;
    this.combo = 0;
    this.ordersCompleted = 0;
    this.highestCombo = 0;
    this.highestPerfect = 0;
    this.totalHarvested = 0;
    this.isFever = false;
    this.feverMeter = 0;

    this.callbacks.onScoreChange(0);
    this.callbacks.onMissesChange(0);
    this.callbacks.onComboChange(0);
    this.callbacks.onOrdersCompletedChange(0);
    this.callbacks.onFeverChange(0, false);

    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];
    destroyPopSystem(this.popLabels, this.dotParticles);

    this.spawnInterval = 1200;
    this.lastSpawn = 0;
    this.gameTime = 0;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.flashTime = 0;

    this.startNewOrder();
    this.setGameState("playing");
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

  public triggerShake(intensity: number, duration: number = 200) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
  }

  private onCreatureExpire(c: ActiveCreature) {
    if (c.phase !== "alive") return;
    c.tapped = false;
    c.phase = "popout";

    if (c.def.type === "good" && this.currentOrder && c.def.id === this.currentOrder.target.id) {
      this.misses += 1;
      this.callbacks.onMissesChange(this.misses);
      
      this.triggerShake(4, 120); 
      this.flashTime = 150; 
      if (this.app) spawnBurst(this.app, this.dotParticles, c.x, c.y, 0x6b3a18); 
      
      this.combo = 0;
      this.callbacks.onComboChange(0);
      if (this.comboTimer) clearTimeout(this.comboTimer);
      AudioManager.playSlash();

      if (this.misses >= MAX_MISSES) {
        this.setGameState("dead");
      }
    }
  }

  private triggerFever() {
    this.isFever = true;
    this.feverTimerMs = 5000;
    this.feverMeter = 8;
    this.callbacks.onFeverChange(this.feverMeter, this.isFever);
    
    const feverText = new Text({
      text: "MÙA BỘI THU!",
      style: new TextStyle({ fill: 0xffd700, fontSize: 36, fontWeight: "bold", stroke: 0x000000, strokeThickness: 4 })
    });
    feverText.anchor.set(0.5);
    feverText.x = this.app!.screen.width / 2;
    feverText.y = this.app!.screen.height / 2;
    this.app!.stage.addChild(feverText);
    
    let age = 0;
    const ticker = () => {
      age += this.app!.ticker.deltaMS;
      feverText.y -= 1;
      feverText.alpha = 1 - age / 1500;
      if (age >= 1500) {
        this.app!.ticker.remove(ticker);
        feverText.destroy();
      }
    };
    this.app!.ticker.add(ticker);
  }

  private tapCreature(c: ActiveCreature) {
    if (c.phase !== "alive") return;
    c.tapped = true;
    c.phase = "popout";

    if (c.def.type === "bad") {
      this.misses += 1;
      this.callbacks.onMissesChange(this.misses);
      
      this.triggerShake(7, 180);
      this.combo = 0;
      this.callbacks.onComboChange(0);
      if (this.comboTimer) clearTimeout(this.comboTimer);
      AudioManager.playSlash();
      if (this.misses >= MAX_MISSES) {
        this.setGameState("dead");
      }
      return;
    }

    this.totalHarvested += 1;
    let pts = 0;
    let isPerfect = false;
    
    const zoneTop = this.app!.screen.height * 0.65;
    const zoneBot = this.app!.screen.height * 0.78;
    const inZone = c.y >= zoneTop && c.y <= zoneBot;

    if (this.currentOrder && c.def.id === this.currentOrder.target.id) {
      this.currentOrder.collected += 1;
      
      if (inZone) {
        pts = 200;
        this.combo += 2;
        isPerfect = true;
        if (!this.isFever) {
          this.feverMeter = Math.min(8, this.feverMeter + 1);
          this.callbacks.onFeverChange(this.feverMeter, this.isFever);
          if (this.feverMeter >= 8) {
            this.triggerFever();
          }
        }
      } else {
        pts = 100;
        this.combo += 1;
      }
      
      if (this.currentOrder.collected >= this.currentOrder.required) {
        this.ordersCompleted += 1;
        this.callbacks.onOrdersCompletedChange(this.ordersCompleted);
        pts += 500;
        
        const doneText = new Text({
          text: "HOÀN THÀNH!",
          style: new TextStyle({ fill: 0x44ff44, fontSize: 32, fontWeight: "bold", stroke: 0x000000, strokeThickness: 4 })
        });
        doneText.anchor.set(0.5);
        doneText.x = this.app!.screen.width / 2;
        doneText.y = this.app!.screen.height / 2 + 50;
        this.app!.stage.addChild(doneText);
        
        let age = 0;
        const ticker = () => {
          age += this.app!.ticker.deltaMS;
          doneText.y -= 1;
          doneText.alpha = 1 - age / 600;
          if (age >= 600) {
            this.app!.ticker.remove(ticker);
            doneText.destroy();
          }
        };
        this.app!.ticker.add(ticker);

        this.startNewOrder();
      } else {
        this.callbacks.onOrderChange({...this.currentOrder});
      }

    } else {
      this.combo = 0;
      pts = 0;
    }

    if (this.combo > this.highestCombo) this.highestCombo = this.combo;
    if (isPerfect && this.combo > this.highestPerfect) this.highestPerfect = this.combo;

    this.callbacks.onComboChange(this.combo);
    if (this.comboTimer) clearTimeout(this.comboTimer);
    if (this.combo > 0) {
      this.comboTimer = setTimeout(() => {
        this.combo = 0;
        this.callbacks.onComboChange(0);
      }, 1500);
    }

    if (this.isFever) pts *= 2; 

    this.score += pts;
    this.callbacks.onScoreChange(this.score);

    if (this.app && pts > 0) {
      spawnPopLabel(this.app, this.popLabels, pts, c.x, c.y - 24, c.def.glow);
      spawnBurst(this.app, this.dotParticles, c.x, c.y, c.def.glow);
    }
    
    if (pts > 0) {
      AudioManager.playPop();
      this.triggerShake(isPerfect ? 6 : 2, 100);
    }
  }

  private rebuildBackground(w: number, h: number) {
    if (!this.app || !this.bgContainer) return;
    this.bgContainer.removeChildren();

    if (this.skyLayer) this.skyLayer.destroy();
    this.skyLayer = new Graphics();
    this.skyLayer.rect(0, 0, w, h);
    this.skyLayer.fill(0xDCECF0);
    this.bgContainer.addChild(this.skyLayer);
    
    const zoneTop = h * 0.65;
    const zoneBot = h * 0.78;
    if (this.perfectZoneLayer) this.perfectZoneLayer.destroy();
    this.perfectZoneLayer = new Graphics();
    this.perfectZoneLayer.rect(0, zoneTop, w, zoneBot - zoneTop);
    this.perfectZoneLayer.fill({ color: 0xffffff, alpha: 0.3 }); 
    
    this.perfectZoneLayer.moveTo(0, zoneTop);
    this.perfectZoneLayer.lineTo(w, zoneTop);
    this.perfectZoneLayer.moveTo(0, zoneBot);
    this.perfectZoneLayer.lineTo(w, zoneBot);
    this.perfectZoneLayer.stroke({ color: 0xffd700, alpha: 0.5, width: 2 });
    
    this.bgContainer.addChild(this.perfectZoneLayer);

    const label = new Text({
      text: "PERFECT ZONE",
      style: new TextStyle({ fill: 0xffd700, fontSize: 14, fontWeight: "bold", letterSpacing: 2, dropShadow: { alpha: 0.8, color: 0x000000, distance: 1 } })
    });
    label.x = 10;
    label.y = zoneTop + 4;
    label.alpha = 0.8;
    this.perfectZoneLayer.addChild(label);

    // farm field only 20-25% at bottom. So fieldTop = h * 0.78 is 22%.
    const fieldTop = h * 0.78;
    if (this.fieldLayer) this.fieldLayer.destroy();
    this.fieldLayer = new Graphics();
    this.fieldLayer.rect(0, fieldTop, w, h - fieldTop);
    this.fieldLayer.fill(0x8B4513);
    
    this.fieldLayer.rect(0, fieldTop, w, 8);
    this.fieldLayer.fill(0x228b22);
    this.bgContainer.addChild(this.fieldLayer);

    if (this.flashGraphics) this.flashGraphics.destroy();
    this.flashGraphics = new Graphics();
    this.flashGraphics.rect(0, 0, w, h);
    this.flashGraphics.fill({ color: 0xff0000, alpha: 0.25 });
    this.flashGraphics.alpha = this.flashTime > 0 ? this.flashTime / 150 : 0;
    this.bgContainer.addChild(this.flashGraphics);
  }

  public resize(w: number, h: number) {
    if (!this.app || this.destroyed) return;
    if (this.app.screen.width === w && this.app.screen.height === h) return;
    this.app.renderer.resize(w, h);
    this.rebuildBackground(w, h);
  }

  public destroy() {
    this.destroyed = true;
    if (this.comboTimer) clearTimeout(this.comboTimer);
    destroyPopSystem(this.popLabels, this.dotParticles);

    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];

    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
`;
fs.writeFileSync('src/app/components/game/HarvestGameEngine.ts', content);
