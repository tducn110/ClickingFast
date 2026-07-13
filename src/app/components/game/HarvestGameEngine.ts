import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import { createSky } from "./scene/drawSky";
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
import { generateOrder, createOrderHUD, updateOrderHUD, Order, OrderHUD } from "./systems/OrderSystem";
import { MAX_MISSES, WATERLINE_RATIO, TARGETS } from "./constants";
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
  onOrdersCompletedChange: (count: number) => void;
}

export class HarvestGameEngine {
  private wrap: HTMLElement;
  private callbacks: EngineCallbacks;
  public app: Application | null = null;
  private destroyed = false;

  // Scene references
  private bgContainer: Container | null = null;
  private skyLayer: Graphics | null = null;
  private fieldLayer: Graphics | null = null;
  private heartsHUD: ReturnType<typeof createHeartsHUD> | null = null;
  private orderHUD: OrderHUD | null = null;

  // Mutable state
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
  
  // New systems state
  public currentOrder: Order | null = null;
  public ordersCompleted = 0;
  public isHarvestRush = false;
  public harvestRushTimer = 0;
  public currentOrderPerfectCount = 0;
  public currentOrderTotalCount = 0;
  
  // Stats for game over
  public highestCombo = 0;
  public highestPerfect = 0;
  public totalHarvested = 0;

  private comboTimer: ReturnType<typeof setTimeout> | null = null;

  // Screen shake state
  private shakeTime = 0;
  private shakeIntensity = 0;

  // Flash state
  private flashTime = 0;
  private flashGraphics: Graphics | null = null;

  public hasContinued = false;
  public isX2Mode = false;
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
      backgroundColor: 0x87CEEB, // Sky blue
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed || !this.app) return; // In case it was destroyed during init

    this.wrap.appendChild(this.app.canvas);
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // Build scene
    this.bgContainer = new Container();
    this.app.stage.addChild(this.bgContainer);
    
    // Create initial background elements
    this.rebuildBackground(W, H);

    this.heartsHUD = createHeartsHUD(this.app);
    this.orderHUD = createOrderHUD(this.app);

    // Setup ticker
    let elapsed = 0;
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;
      elapsed += dt;

      const currW = this.app ? this.app.screen.width : W;
      const currH = this.app ? this.app.screen.height : H;

      if (this.gameState !== "playing") return;
      this.gameTime += dt;

      // Harvest Rush Timer
      if (this.isHarvestRush) {
        this.harvestRushTimer -= dt;
        if (this.harvestRushTimer <= 0) {
          this.isHarvestRush = false;
        }
      }

      // Order Timer
      if (this.currentOrder && !this.isHarvestRush) {
        this.currentOrder.timeRemainingMs -= dt;
        if (this.currentOrder.timeRemainingMs <= 0) {
          // Failed order -> lose a heart, generate new
          this.misses += 1;
          this.callbacks.onMissesChange(this.misses);
          if (this.heartsHUD) updateHearts(this.heartsHUD, this.misses);
          this.triggerShake(5, 200);
          this.flashTime = 150;
          AudioManager.playSlash(); // sound miss
          if (this.misses >= MAX_MISSES) {
            this.setGameState("dead");
          } else {
            this.startNewOrder();
          }
        }
      }

      if (this.orderHUD && this.currentOrder) {
        updateOrderHUD(this.orderHUD, this.currentOrder);
      }

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

      // Update red flash
      if (this.flashTime > 0 && this.flashGraphics) {
        this.flashTime -= dt;
        if (this.flashTime > 0) {
          this.flashGraphics.alpha = this.flashTime / 150;
        } else {
          this.flashGraphics.alpha = 0;
        }
      }

      // Difficulty ramp
      const phaseSecs = this.gameTime / 1000;
      const isMobile = this.app ? this.app.screen.width <= 768 : false;

      let maxItems = 1;
      let baseInterval = 1400;
      let badWeight = 0; // chance to spawn bad item

      if (phaseSecs < 15) {
        maxItems = 1;
        baseInterval = 1400;
        badWeight = 0;
      } else if (phaseSecs < 30) {
        maxItems = 2;
        baseInterval = 1100;
        badWeight = 0.2; // 20%
      } else if (phaseSecs < 50) {
        maxItems = isMobile ? 2 : 3;
        baseInterval = 900;
        badWeight = 0.3; // 30%
      } else {
        maxItems = isMobile ? 2 : 3;
        baseInterval = Math.max(500, 800 - (phaseSecs - 50) * 10);
        badWeight = Math.min(0.35, 0.3 + (phaseSecs - 50) * 0.005); // cap at 35%
      }

      if (this.isHarvestRush) {
        baseInterval *= 0.6; // spawn faster
        maxItems += 1;
        badWeight = 0; // no bad items in rush
      }

      if (this.difficulty === "Easy") baseInterval += 300;
      if (this.difficulty === "Hard") baseInterval -= 200;

      this.spawnInterval = Math.max(400, baseInterval);

      const activeCreatures = this.creatures.filter(c => c.phase === "alive" || c.phase === "popin");
      const activeGood = activeCreatures.filter(c => c.def.type === "good").length;
      const activeBad = activeCreatures.filter(c => c.def.type === "bad").length;

      if (elapsed - this.lastSpawn > this.spawnInterval && activeCreatures.length < maxItems) {
        this.lastSpawn = elapsed;

        let spawnType = "good";
        if (badWeight > 0 && Math.random() < badWeight) {
          spawnType = "bad";
        }

        // Strict constraints: Max 2 good, Max 1 bad
        if (spawnType === "bad" && activeBad >= 1) spawnType = "none";
        if (spawnType === "good" && activeGood >= 2) spawnType = "none";

        if (spawnType !== "none") {
          const newCreature = spawnCreature(
            this.app!, elapsed, this.gameTime, 
            [spawnType], this.difficulty, this.creatures, this.isHarvestRush
          );
          if (newCreature) {
            // Bias towards order items if good
            if (newCreature.def.type === "good" && this.currentOrder) {
              const pendingItems = this.currentOrder.items.filter(i => i.collected < i.required);
              if (pendingItems.length > 0 && Math.random() < 0.6) {
                const requiredId = pendingItems[Math.floor(Math.random() * pendingItems.length)].id;
                // Since spawnCreature randomly picks, we can just replace its def
                // (Note: slightly hacky, but works for MVP since textures/sizes are dynamic enough)
                const targetDef = TARGETS.find((t: any) => t.id === requiredId);
                if (targetDef) {
                   newCreature.def = targetDef;
                   newCreature.emojiLabel.text = targetDef.emoji;
                }
              }
            }
            this.creatures.push(newCreature);
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
    this.currentOrder = generateOrder(this.gameTime / 1000);
    this.currentOrderPerfectCount = 0;
    this.currentOrderTotalCount = this.currentOrder.items.reduce((sum, i) => sum + i.required, 0);
  }

  public startGame() {
    this.score = 0;
    this.misses = 0;
    this.combo = 0;
    this.ordersCompleted = 0;
    this.highestCombo = 0;
    this.highestPerfect = 0;
    this.totalHarvested = 0;
    this.hasContinued = false;
    this.isX2Mode = false;
    this.isHarvestRush = false;

    this.callbacks.onScoreChange(0);
    this.callbacks.onMissesChange(0);
    this.callbacks.onComboChange(0);
    this.callbacks.onOrdersCompletedChange(0);

    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];
    destroyPopSystem(this.popLabels, this.dotParticles);

    this.spawnInterval = 1200;
    this.lastSpawn = 0;
    this.gameTime = 0;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.flashTime = 0;

    if (this.heartsHUD) updateHearts(this.heartsHUD, 0);
    this.startNewOrder();
    this.setGameState("playing");
  }

  public continueGame() {
    this.misses = 0;
    this.hasContinued = true;
    this.isX2Mode = true;
    this.callbacks.onMissesChange(0);
    if (this.heartsHUD) updateHearts(this.heartsHUD, 0);

    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];
    destroyPopSystem(this.popLabels, this.dotParticles);

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

    if (c.def.type === "good" && this.currentOrder) {
      // Check if it was in the order
      const orderItem = this.currentOrder.items.find(i => i.id === c.def.id);
      if (orderItem && orderItem.collected < orderItem.required) {
        // Missed an order item
        this.misses += 1;
        this.callbacks.onMissesChange(this.misses);
        if (this.heartsHUD) updateHearts(this.heartsHUD, this.misses);
        this.triggerShake(4, 120); // soft shake for miss
        this.flashTime = 150; // trigger short flash
        if (this.app) {
          spawnBurst(this.app, this.dotParticles, c.x, c.y, 0x6b3a18); // dirt burst
        }
        this.combo = 0;
        this.callbacks.onComboChange(0);
        if (this.comboTimer) clearTimeout(this.comboTimer);
        AudioManager.playSlash();

        if (this.misses >= MAX_MISSES) {
          this.setGameState("dead");
        }
      }
    }
  }

  private triggerHarvestRush() {
    this.isHarvestRush = true;
    this.harvestRushTimer = 5000;
    
    // visual effect
    const rushText = new Text({
      text: "MÙA BỘI THU!",
      style: new TextStyle({ fill: 0xffd700, fontSize: 36, fontWeight: "bold", stroke: 0x000000, strokeThickness: 4 })
    });
    rushText.anchor.set(0.5);
    rushText.x = this.app!.screen.width / 2;
    rushText.y = this.app!.screen.height / 2;
    this.app!.stage.addChild(rushText);
    
    let age = 0;
    const ticker = () => {
      age += this.app!.ticker.deltaMS;
      rushText.y -= 1;
      rushText.alpha = 1 - age / 1500;
      if (age >= 1500) {
        this.app!.ticker.remove(ticker);
        rushText.destroy();
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
      if (this.heartsHUD) updateHearts(this.heartsHUD, this.misses);
      this.triggerShake(7, 180); // bad tap shake
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
    let labelGlow = c.def.glow;
    let isPerfect = false;

    // Evaluate logic
    if (this.currentOrder) {
      const orderItem = this.currentOrder.items.find(i => i.id === c.def.id);
      
      if (orderItem && orderItem.collected < orderItem.required) {
        // It's in the order
        orderItem.collected += 1;
        
        if (c.ripeness === "unripe") {
          pts = 30;
          this.combo = 0;
        } else if (c.ripeness === "perfect") {
          pts = 100;
          this.combo += 1;
          isPerfect = true;
          this.currentOrderPerfectCount += 1;
        } else if (c.ripeness === "overripe") {
          pts = 50;
          this.combo = 0;
        }

        // Check if order complete
        const allCollected = this.currentOrder.items.every(i => i.collected >= i.required);
        if (allCollected) {
          this.ordersCompleted += 1;
          this.callbacks.onOrdersCompletedChange(this.ordersCompleted);
          
          pts += 500;
          if (this.currentOrderPerfectCount === this.currentOrderTotalCount) {
            pts += 1000;
            // Heal heart
            if (this.misses > 0) {
              this.misses -= 1;
              this.callbacks.onMissesChange(this.misses);
              if (this.heartsHUD) updateHearts(this.heartsHUD, this.misses);
            }
          }

          if (this.ordersCompleted % 3 === 0) {
            this.triggerHarvestRush();
          }
          this.startNewOrder();
        }

      } else {
        // Not in order or already full
        pts = 30;
        this.combo = 0;
      }
    } else {
      pts = 30;
    }

    if (this.combo > this.highestCombo) this.highestCombo = this.combo;
    if (isPerfect) {
      if (this.combo > this.highestPerfect) this.highestPerfect = this.combo;
    }

    this.callbacks.onComboChange(this.combo);
    if (this.comboTimer) clearTimeout(this.comboTimer);
    if (this.combo > 0) {
      this.comboTimer = setTimeout(() => {
        this.combo = 0;
        this.callbacks.onComboChange(0);
      }, 1500);
    }

    if (this.isX2Mode) pts *= 2;
    if (this.isHarvestRush && isPerfect) pts *= 2; // double perfect points in rush
    
    // Combo multiplier
    if (this.combo >= 10) pts *= 3;
    else if (this.combo >= 6) pts *= 2;
    else if (this.combo >= 3) pts = Math.round(pts * 1.5);

    this.score += pts;
    this.callbacks.onScoreChange(this.score);

    if (this.app) {
      spawnPopLabel(this.app, this.popLabels, pts, c.x, c.y - 24, labelGlow);
      spawnBurst(this.app, this.dotParticles, c.x, c.y, labelGlow);
    }
    
    AudioManager.playPop();
    this.triggerShake(isPerfect ? 6 : 4, 100);
  }

  private rebuildBackground(w: number, h: number) {
    if (!this.app || !this.bgContainer) return;
    this.bgContainer.removeChildren();

    if (this.skyLayer) this.skyLayer.destroy();
    this.skyLayer = new Graphics();
    this.skyLayer.rect(0, 0, w, h * WATERLINE_RATIO);
    this.skyLayer.fill(0x87ceeb); // Light blue sky
    this.bgContainer.addChild(this.skyLayer);

    if (this.fieldLayer) this.fieldLayer.destroy();
    this.fieldLayer = new Graphics();
    this.fieldLayer.rect(0, h * WATERLINE_RATIO, w, h * (1 - WATERLINE_RATIO));
    this.fieldLayer.fill(0x8B4513); // Brown field
    
    // Add some grass line at the top of the field
    this.fieldLayer.rect(0, h * WATERLINE_RATIO, w, 20);
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

    if (this.heartsHUD) {
      this.app.stage.removeChild(this.heartsHUD.container);
      this.heartsHUD.container.destroy({ children: true });
    }
    this.heartsHUD = createHeartsHUD(this.app);
    updateHearts(this.heartsHUD, this.misses);
    
    if (this.orderHUD) {
      this.app.stage.removeChild(this.orderHUD.container);
      this.orderHUD.container.destroy({ children: true });
    }
    this.orderHUD = createOrderHUD(this.app);
    if (this.currentOrder) updateOrderHUD(this.orderHUD, this.currentOrder);
  }

  public destroy() {
    this.destroyed = true;
    if (this.comboTimer) clearTimeout(this.comboTimer);
    destroyPopSystem(this.popLabels, this.dotParticles);

    for (const c of this.creatures) c.container.destroy({ children: true });
    this.creatures = [];

    this.heartsHUD = null;
    this.orderHUD = null;

    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
