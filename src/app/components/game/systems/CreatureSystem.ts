import { Graphics, Container, Text, TextStyle, Application, Texture, Sprite, ColorMatrixFilter } from "pixi.js";
import { CREATURES, WATERLINE_RATIO, type CreatureDef } from "../constants";
import { drawCreature } from "../drawCreature";

export type RipenessState = "unripe" | "perfect" | "overripe" | "none";

export interface ActiveCreature {
  id: number;
  def: CreatureDef;
  x: number;
  y: number;
  startY: number;
  endY: number;
  container: Container;
  body: Sprite;
  born: number;
  lifeMs: number;
  phase: "popin" | "alive" | "popout" | "dead";
  tapped: boolean;
  popoutStart?: number;
  ripeness: RipenessState;
  filter: ColorMatrixFilter;
  emojiLabel: Text;
}

let gId = 0;
const textureCache = new Map<string, Texture>();

function getTexture(app: Application, def: CreatureDef): Texture {
  if (textureCache.has(def.name)) return textureCache.get(def.name)!;
  const g = new Graphics();
  drawCreature(g, def);
  const tex = app.renderer.generateTexture(g);
  textureCache.set(def.name, tex);
  return tex;
}

/** Spawn a fruit falling from the top */
export function spawnCreature(
  app: Application,
  elapsed: number,
  gameTimeMs: number,
  allowedTypes: string[] = ["good", "bad"],
  difficulty: string = "Normal",
  activeCreatures: ActiveCreature[] = [],
  rushMode: boolean = false
): ActiveCreature | null {
  const W = app.screen.width;
  const H = app.screen.height;
  const groundY = H * WATERLINE_RATIO;

  let defs = CREATURES.filter(c => allowedTypes.includes(c.type));
  if (defs.length === 0) defs = [...CREATURES];
  const def = defs[Math.floor(Math.random() * defs.length)];

  // 5-lane system
  const totalLanes = 5;
  const laneWidth = Math.min(160, W / totalLanes);
  const startX = (W - (laneWidth * totalLanes)) / 2;

  // Prevent spawning in a lane that has a fruit too close to the top
  const minDistance = def.size * 2.2;
  const occupiedLanes = activeCreatures
    .filter(c => c.phase === "popin" || c.phase === "alive")
    .filter(c => Math.abs(c.y - (-c.def.size * 2)) < minDistance)
    .map(c => Math.floor((c.x - startX) / laneWidth));

  let laneIndex = Math.floor(Math.random() * totalLanes);
  let attempts = 0;
  while (occupiedLanes.includes(laneIndex) && attempts < 10) {
    laneIndex = Math.floor(Math.random() * totalLanes);
    attempts++;
  }
  if (occupiedLanes.includes(laneIndex)) return null; // Too crowded

  // Start above the screen and fall down to the ground line
  const startY = -def.size * 2;
  const endY = groundY + def.size;
  const y = startY;

  // Lifetime: how long the fruit takes to fall
  let lifeBase = 4500;
  let lifeRamp = 0.05;
  if (difficulty === "Easy") { lifeBase = 5500; lifeRamp = 0.03; }
  if (difficulty === "Hard") { lifeBase = 3500; lifeRamp = 0.07; }
  if (rushMode) { lifeBase *= 0.85; } // faster in rush
  
  const lifeMs = Math.max(1200, lifeBase - gameTimeMs * lifeRamp) * (1 / (def.speed * 0.8 + 0.2));

  if (def.type === "good") {
    const estimatedHitTime = elapsed + lifeMs;
    const hasConflict = activeCreatures.some(c =>
      c.def.type === "good" &&
      (c.phase === "alive" || c.phase === "popin") &&
      Math.abs((c.born + c.lifeMs) - estimatedHitTime) < 500
    );
    if (hasConflict) return null; // Drops too close to another good item
  }

  // Add a slight random offset inside the lane to avoid being too rigid
  const offsetX = (Math.random() - 0.5) * (laneWidth * 0.5);
  const x = startX + laneIndex * laneWidth + laneWidth / 2 + offsetX;

  const container = new Container();
  container.x = x; container.y = y;

  const tex = getTexture(app, def);
  const body = new Sprite(tex);
  body.anchor.set(0.5);
  
  const filter = new ColorMatrixFilter();
  body.filters = [filter];
  container.addChild(body);

  // Fallback Emoji if no graphic (or as a small icon)
  const emojiLabel = new Text({
    text: def.emoji,
    style: new TextStyle({ fontSize: def.size * 0.6 })
  });
  emojiLabel.anchor.set(0.5);
  emojiLabel.alpha = 0.8;
  container.addChild(emojiLabel);

  container.alpha = 0;
  container.scale.set(0.2);
  app.stage.addChild(container);

  return { 
    id: gId++, def, x, y, startY, endY, 
    container, body, emojiLabel, born: elapsed, lifeMs, 
    phase: "popin", tapped: false, ripeness: "none", filter
  };
}

/** Update fruits: pop-in → alive (falling) → pop-out on expire */
export function updateCreatures(
  creatures: ActiveCreature[],
  elapsed: number,
  onExpire: (c: ActiveCreature) => void,
): ActiveCreature[] {
  const dead: ActiveCreature[] = [];

  for (const c of creatures) {
    if (c.phase === "dead") { dead.push(c); continue; }
    const age = elapsed - c.born;
    let progress = age / c.lifeMs;
    if (progress > 1) progress = 1;

    // Ripeness state
    if (c.def.type === "good") {
      let newState: RipenessState = "unripe";
      if (progress > 0.4 && progress < 0.75) newState = "perfect";
      else if (progress >= 0.75) newState = "overripe";
      
      if (c.ripeness !== newState) {
        c.ripeness = newState;
        if (newState === "unripe") {
          c.filter.saturate(-0.5, true); // dull color
          c.filter.brightness(0.8, true);
        } else if (newState === "perfect") {
          c.filter.reset();
          c.filter.saturate(0.3, true); // bright
          c.filter.brightness(1.2, true);
        } else if (newState === "overripe") {
          c.filter.reset();
          c.filter.brightness(0.7, true);
        }
      }
    }

    // ── Pop-in animation ──
    if (c.phase === "popin") {
      const t = Math.min(age / 200, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      c.container.alpha = Math.max(0, ease);
      c.container.scale.set(Math.max(0, 0.3 + ease * 0.8));
      // Fall down while popping in
      c.y = c.startY + progress * (c.endY - c.startY);
      c.container.y = c.y;
      c.container.x = c.x + Math.sin(elapsed * 0.002 + c.id) * 20;

      if (t >= 1) c.phase = "alive";
    }

    // ── Alive (falling) ──
    if (c.phase === "alive") {
      // Fall down
      c.y = c.startY + progress * (c.endY - c.startY);
      c.container.y = c.y;

      // Gentle horizontal sway
      c.container.x = c.x + Math.sin(elapsed * 0.002 + c.id) * 20;

      // Scale up slightly as it approaches ground (perspective) + Gentle wobble
      const baseScale = 1 + progress * 0.15;
      c.container.scale.x = baseScale + Math.sin(elapsed * 0.004 + c.id) * 0.04;
      c.container.scale.y = baseScale + Math.cos(elapsed * 0.005 + c.id) * 0.04;

      // Overripe shake
      if (c.ripeness === "overripe") {
        c.container.x += Math.sin(elapsed * 0.02 + c.id) * 2;
      }

      // Gentle rotation
      c.container.rotation = Math.sin(elapsed * 0.003 + c.id) * 0.15;

      // Bad items have erratic movement
      if (c.def.type === "bad") {
        c.container.x += Math.sin(elapsed * 0.015 + c.id * 3) * 3;
        c.container.rotation += Math.sin(elapsed * 0.02 + c.id) * 0.3;
      }

      if (progress >= 1) {
        onExpire(c);
        c.phase = "popout";
      }
    }

    // ── Pop-out animation ──
    if (c.phase === "popout") {
      if (c.popoutStart === undefined) {
        c.popoutStart = elapsed;
      }
      const popoutAge = elapsed - c.popoutStart;
      const t = Math.min(popoutAge / 150, 1);
      if (c.tapped) {
        c.container.scale.set(Math.max(0, 1 + t * 0.5)); // pop scale up
        c.container.alpha = Math.max(0, 1 - t);
      } else {
        c.container.scale.set(Math.max(0, 1 - t)); // shrink
        c.container.alpha = Math.max(0, 1 - t);
      }
      if (t >= 1) { c.phase = "dead"; dead.push(c); }
    }
  }

  for (const c of dead) {
    c.container.destroy({ children: true });
  }
  return creatures.filter(c => c.phase !== "dead");
}

/** Hit-test a tap against alive fruits */
export function hitTestCreatures(
  creatures: ActiveCreature[],
  tx: number,
  ty: number,
): ActiveCreature | null {
  const sorted = [...creatures].sort((a, b) => a.def.size - b.def.size);
  for (const c of sorted) {
    if (c.phase !== "alive") continue;
    const dx = tx - c.container.x;
    const dy = ty - c.container.y;
    if (Math.sqrt(dx * dx + dy * dy) < c.def.size * 1.35) return c;
  }
  return null;
}
