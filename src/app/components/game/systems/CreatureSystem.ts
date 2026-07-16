import { Graphics, Container, Application, Texture, Sprite } from "pixi.js";
import { CREATURES, WATERLINE_RATIO, type CreatureDef } from "../constants";
import { drawCreature } from "../drawCreature";
import { getProcessedFruitCanvas } from "../../../lib/fruitAssetProcessing";

export type RipenessState = "unripe" | "perfect" | "overripe" | "none";

export interface ActiveCreature {
  id: number;
  def: CreatureDef;
  x: number;
  y: number;
  startY: number;
  endY: number;
  laneIndex: number;
  laneOffsetNormalized: number;
  minX: number;
  maxX: number;
  fallProgressNormalized: number;
  popinElapsedMs: number;
  popoutElapsedMs: number;
  container: Container;
  body: Sprite;
  born: number;
  lifeMs: number;
  phase: "popin" | "alive" | "popout" | "dead";
  tapped: boolean;
  popoutStart?: number;
  ripeness: RipenessState;
}

export interface GameplayBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let gId = 0;
const textureCache = new Map<string, Texture>();
const visualPool = new Map<string, Array<{ container: Container; body: Sprite }>>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTexture(app: Application, def: CreatureDef): Texture {
  if (textureCache.has(def.id)) return textureCache.get(def.id)!;
  const g = new Graphics();
  drawCreature(g, def);
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  textureCache.set(def.id, tex);
  return tex;
}

export async function preloadCreatureTextures(
  app: Application,
  definitions: CreatureDef[],
) {
  const textures = await Promise.all(
    definitions.map(async (definition) => {
      const cached = textureCache.get(definition.id);
      if (cached) return cached;

      if (
        definition.category === "produce" &&
        definition.texturePath.startsWith("/assets/fruits/")
      ) {
        try {
          const canvas = await getProcessedFruitCanvas(definition.texturePath);
          const texture = Texture.from(canvas);
          textureCache.set(definition.id, texture);
          return texture;
        } catch (error) {
          console.warn(`Failed to load fruit texture ${definition.id}`, error);
        }
      }

      return getTexture(app, definition);
    }),
  );

  return textures.filter((texture): texture is Texture => Boolean(texture));
}

function getHorizontalLimits(bounds: GameplayBounds, def: CreatureDef) {
  const visualRadius = Math.max(28, def.visualSize * 0.5);
  const minX = bounds.left + visualRadius;
  const maxX = bounds.right - visualRadius;

  if (maxX < minX) {
    const center = (bounds.left + bounds.right) / 2;
    return { minX: center, maxX: center };
  }

  return { minX, maxX };
}

function acquireCreatureVisual(def: CreatureDef, texture: Texture) {
  const pool = visualPool.get(def.id);
  const recycled = pool?.pop();

  if (recycled) {
    recycled.body.texture = texture;
    recycled.container.visible = true;
    recycled.container.alpha = 1;
    recycled.container.rotation = 0;
    recycled.container.scale.set(1);
    return recycled;
  }

  const container = new Container({ label: `creature-${def.id}` });
  const shadow = new Graphics();
  shadow.ellipse(
    0,
    def.visualSize * 0.36,
    def.visualSize * 0.32 * def.shadowScale,
    def.visualSize * 0.09 * def.shadowScale,
  );
  shadow.fill({ color: 0x2b261d, alpha: 0.18 });
  container.addChild(shadow);

  const body = new Sprite(texture);
  body.anchor.set(def.anchor.x, def.anchor.y);
  const textureMax = Math.max(1, texture.width, texture.height);
  body.scale.set(def.visualSize / textureMax);
  container.addChild(body);

  return { container, body };
}

export function recycleCreatureVisual(creature: ActiveCreature) {
  creature.container.removeFromParent();
  creature.container.visible = false;
  creature.container.alpha = 1;
  creature.container.rotation = 0;
  creature.container.scale.set(1);

  const pool = visualPool.get(creature.def.id) ?? [];
  if (pool.length < 8) {
    pool.push({ container: creature.container, body: creature.body });
    visualPool.set(creature.def.id, pool);
    return;
  }

  creature.container.destroy({ children: true });
}

function getRendererBounds(app: Application): GameplayBounds {
  return {
    top: 0,
    right: app.screen.width,
    bottom: app.screen.height * WATERLINE_RATIO,
    left: 0,
  };
}

function getLaneMetrics(bounds: GameplayBounds) {
  const totalLanes = 5;
  const width = Math.max(1, bounds.right - bounds.left);
  const laneWidth = Math.min(240, width / totalLanes);
  const startX = bounds.left + (width - laneWidth * totalLanes) / 2;
  return { totalLanes, laneWidth, startX };
}

function resolveLaneX(
  bounds: GameplayBounds,
  laneIndex: number,
  laneOffsetNormalized: number,
) {
  const { laneWidth, startX } = getLaneMetrics(bounds);
  const offsetX = laneOffsetNormalized * laneWidth * 0.5;
  return startX + laneIndex * laneWidth + laneWidth / 2 + offsetX;
}

function resolveStartY(bounds: GameplayBounds, def: CreatureDef) {
  return bounds.top + def.size * 0.75;
}

function resolveEndY(bounds: GameplayBounds, def: CreatureDef) {
  return bounds.bottom + def.size;
}

function applyCreaturePosition(c: ActiveCreature, visualTimeMs: number) {
  let progress = c.fallProgressNormalized;
  const behavior = (c.def as any).behavior || "normal";

  if (behavior === "heavy") {
    progress = Math.pow(progress, 1.2);
  }

  c.y = c.startY + progress * (c.endY - c.startY);
  c.container.y = c.y;

  let displayX = c.x;

  if (behavior === "sway") {
    displayX += Math.sin(visualTimeMs * 0.003 + c.id) * 40;
    c.container.rotation = Math.sin(visualTimeMs * 0.003 + c.id) * 0.25;
  } else if (behavior === "buzz") {
    displayX += Math.sin(visualTimeMs * 0.016 + c.id) * 18;
    c.container.y += Math.cos(visualTimeMs * 0.02 + c.id) * 4;
    c.container.rotation = Math.sin(visualTimeMs * 0.025 + c.id) * 0.35;
  } else {
    displayX += Math.sin(visualTimeMs * 0.002 + c.id) * 15;
    c.container.rotation = Math.sin(visualTimeMs * 0.003 + c.id) * 0.1;
  }

  const baseScale = 1 + progress * 0.15;
  c.container.scale.x = baseScale + Math.sin(visualTimeMs * 0.008 + c.id) * 0.05;
  c.container.scale.y = baseScale + Math.cos(visualTimeMs * 0.009 + c.id) * 0.05;

  if (c.ripeness === "overripe") {
    displayX += Math.sin(visualTimeMs * 0.04 + c.id) * 3;
  }

  if (c.def.type === "bad") {
    displayX += Math.sin(visualTimeMs * 0.02 + c.id * 3) * 5;
    c.container.rotation += Math.sin(visualTimeMs * 0.03 + c.id) * 0.4;
  }

  c.container.x = clamp(displayX, c.minX, c.maxX);
}

/** Spawn a fruit falling from the top */
export function spawnCreature(
  app: Application,
  layer: Container,
  elapsed: number,
  gameTimeMs: number,
  gameplayBounds?: GameplayBounds,
  allowedTypes: string[] = ["good", "bad"],
  activeCreatures: ActiveCreature[] = [],
  rushMode: boolean = false,
  forcedDef?: CreatureDef,
): ActiveCreature | null {
  const bounds = gameplayBounds ?? getRendererBounds(app);

  let defs = forcedDef ? [forcedDef] : CREATURES.filter(c => allowedTypes.includes(c.type));
  if (defs.length === 0) defs = [...CREATURES];
  const def = defs[Math.floor(Math.random() * defs.length)];

  const { totalLanes, laneWidth, startX } = getLaneMetrics(bounds);

  // Prevent spawning in a lane that has a fruit too close to the top
  const minDistance = def.size * 2.2;
  const occupiedLanes = activeCreatures
    .filter(c => c.phase === "popin" || c.phase === "alive")
    .filter(c => Math.abs(c.y - resolveStartY(bounds, c.def)) < minDistance)
    .map(c => c.laneIndex ?? Math.floor((c.x - startX) / laneWidth));

  let laneIndex = Math.floor(Math.random() * totalLanes);
  let attempts = 0;
  while (occupiedLanes.includes(laneIndex) && attempts < 10) {
    laneIndex = Math.floor(Math.random() * totalLanes);
    attempts++;
  }
  if (occupiedLanes.includes(laneIndex)) return null; // Too crowded

  const startY = resolveStartY(bounds, def);
  const endY = resolveEndY(bounds, def);
  const y = startY;

  // Lifetime: how long the fruit takes to fall
  let lifeBase = 4500;
  let lifeRamp = 0.05;
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
  const laneOffsetNormalized = Math.random() - 0.5;
  const { minX, maxX } = getHorizontalLimits(bounds, def);
  const x = clamp(
    resolveLaneX(bounds, laneIndex, laneOffsetNormalized),
    minX,
    maxX,
  );

  const tex = getTexture(app, def);
  const { container, body } = acquireCreatureVisual(def, tex);
  container.x = x;
  container.y = y;

  container.alpha = 0;
  container.scale.set(0.2);
  layer.addChild(container);

  return { 
    id: gId++, def, x, y, startY, endY,
    laneIndex, laneOffsetNormalized, minX, maxX, fallProgressNormalized: 0,
    popinElapsedMs: 0, popoutElapsedMs: 0,
    container, body, born: elapsed, lifeMs,
    phase: "popin", tapped: false, ripeness: "none"
  };
}

/** Update fruits: pop-in → alive (falling) → pop-out on expire */
export function updateCreatures(
  creatures: ActiveCreature[],
  visualTimeMs: number,
  deltaMs: number,
  fallSpeedMultiplier: number,
  onExpire: (c: ActiveCreature) => void,
): ActiveCreature[] {
  const dead: ActiveCreature[] = [];

  for (const c of creatures) {
    if (c.phase === "dead") { dead.push(c); continue; }
    if (c.phase === "popin" || c.phase === "alive") {
      c.fallProgressNormalized = Math.min(
        1,
        c.fallProgressNormalized + (deltaMs * fallSpeedMultiplier) / c.lifeMs
      );
    }
    const progress = c.fallProgressNormalized;

    // Ripeness state
    if (c.def.type === "good") {
      c.ripeness = "none";
    }

    // ── Pop-in animation ──
    if (c.phase === "popin") {
      c.popinElapsedMs += deltaMs;
      const t = Math.min(c.popinElapsedMs / 200, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      c.container.alpha = Math.max(0, ease);
      c.container.scale.set(Math.max(0, 0.3 + ease * 0.8));
      // Fall down while popping in
      c.y = c.startY + progress * (c.endY - c.startY);
      c.container.y = c.y;
      c.container.x = clamp(
        c.x + Math.sin(visualTimeMs * 0.002 + c.id) * 20,
        c.minX,
        c.maxX,
      );

      if (t >= 1) c.phase = "alive";
    }

    // ── Alive (falling) ──
    if (c.phase === "alive") {
      applyCreaturePosition(c, visualTimeMs);

      if (progress >= 1) {
        onExpire(c);
        c.phase = "popout";
      }
    }

    // ── Pop-out animation ──
    if (c.phase === "popout") {
      if (c.popoutStart === undefined) {
        c.popoutStart = visualTimeMs;
      }
      c.popoutElapsedMs += deltaMs;
      const popoutAge = c.popoutElapsedMs;
      const t = Math.min(popoutAge / 180, 1);
      
      if (c.tapped) {
        // Squash and stretch bounce (juice)
        const scaleX = 1 + Math.sin(t * Math.PI) * 0.6;
        const scaleY = 1 - Math.sin(t * Math.PI) * 0.3 + t * 0.2;
        c.container.scale.set(Math.max(0, scaleX), Math.max(0, scaleY)); 
        c.container.alpha = Math.max(0, 1 - Math.pow(t, 2));
        c.container.y -= t * 30; // Float up a bit when popped
      } else {
        c.container.scale.set(Math.max(0, 1 - t)); // shrink
        c.container.alpha = Math.max(0, 1 - t);
      }
      if (t >= 1) { c.phase = "dead"; dead.push(c); }
    }
  }

  for (const c of dead) {
    recycleCreatureVisual(c);
  }
  return creatures.filter(c => c.phase !== "dead");
}

export function remapCreaturesToBounds(
  creatures: ActiveCreature[],
  app: Application,
  gameplayBounds?: GameplayBounds,
) {
  const bounds = gameplayBounds ?? getRendererBounds(app);
  for (const creature of creatures) {
    const { minX, maxX } = getHorizontalLimits(bounds, creature.def);
    creature.startY = resolveStartY(bounds, creature.def);
    creature.endY = resolveEndY(bounds, creature.def);
    creature.minX = minX;
    creature.maxX = maxX;
    creature.x = clamp(
      resolveLaneX(
        bounds,
        creature.laneIndex,
        creature.laneOffsetNormalized,
      ),
      minX,
      maxX,
    );
    applyCreaturePosition(creature, 0);
  }
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
    const hitRadius = Math.max(32, c.def.visualSize * c.def.hitboxScale * 0.5);
    if (Math.sqrt(dx * dx + dy * dy) < hitRadius) return c;
  }
  return null;
}
