import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { CREATURES, WATERLINE_RATIO, type CreatureDef } from "../constants";

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
  guideHalo: Graphics;
  born: number;
  lifeMs: number;
  phase: "popin" | "alive" | "popout" | "dead";
  tapped: boolean;
  guided: boolean;
}

export interface GameplayBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SpawnCreatureOptions {
  gameTimeMs: number;
  gameplayBounds?: GameplayBounds;
  activeCreatures?: ActiveCreature[];
  forcedDef?: CreatureDef;
  fallDurationMultiplier?: number;
  guided?: boolean;
  random?: () => number;
}

interface CreatureVisual {
  container: Container;
  body: Sprite;
  guideHalo: Graphics;
}

const ITEM_BUNDLE = "harvest-items";
let itemBundleRegistered = false;
let nextCreatureId = 0;
const textureCache = new Map<string, Texture>();
const visualPool = new Map<string, CreatureVisual[]>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function assetAlias(id: string) {
  return `harvest-${id}`;
}

function getTexture(def: CreatureDef): Texture {
  const cached = textureCache.get(def.id);
  if (cached) return cached;

  throw new Error(`Gameplay texture was not preloaded: ${def.id}`);
}

export async function preloadCreatureTextures(definitions: CreatureDef[]) {
  const missingPaths = definitions.filter((definition) => !definition.texturePath);
  if (missingPaths.length > 0) {
    throw new Error(
      `Missing gameplay texture paths: ${missingPaths.map(({ id }) => id).join(", ")}`,
    );
  }

  if (!itemBundleRegistered) {
    Assets.addBundle(
      ITEM_BUNDLE,
      Object.fromEntries(
        definitions.map((definition) => [
          assetAlias(definition.id),
          definition.texturePath,
        ]),
      ),
    );
    itemBundleRegistered = true;
  }

  const loaded = (await Assets.loadBundle(ITEM_BUNDLE)) as Record<string, Texture>;
  for (const definition of definitions) {
    const texture = loaded[assetAlias(definition.id)];
    if (!texture) {
      throw new Error(`Failed to load gameplay texture: ${definition.texturePath}`);
    }
    textureCache.set(definition.id, texture);
  }

  return definitions.map((definition) => getTexture(definition));
}

function getHorizontalLimits(bounds: GameplayBounds, def: CreatureDef) {
  const visualRadius = Math.max(36, def.visualSize * 0.78);
  const minX = bounds.left + visualRadius;
  const maxX = bounds.right - visualRadius;
  if (maxX < minX) {
    const center = (bounds.left + bounds.right) / 2;
    return { minX: center, maxX: center };
  }
  return { minX, maxX };
}

function acquireCreatureVisual(def: CreatureDef, texture: Texture): CreatureVisual {
  const recycled = visualPool.get(def.id)?.pop();
  if (recycled) {
    recycled.body.texture = texture;
    recycled.container.visible = true;
    recycled.container.alpha = 1;
    recycled.container.rotation = 0;
    recycled.container.scale.set(1);
    recycled.guideHalo.visible = false;
    recycled.guideHalo.alpha = 0;
    return recycled;
  }

  const container = new Container({ label: `creature-${def.id}` });
  const guideHalo = new Graphics();
  guideHalo.circle(0, 0, def.visualSize * 0.62);
  guideHalo.stroke({ color: 0xffe36f, width: 5, alpha: 0.9 });
  guideHalo.circle(0, 0, def.visualSize * 0.72);
  guideHalo.stroke({ color: 0xffffff, width: 2, alpha: 0.65 });
  guideHalo.visible = false;
  guideHalo.alpha = 0;
  container.addChild(guideHalo);

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
  body.scale.set(def.visualSize / Math.max(1, texture.width, texture.height));
  container.addChild(body);
  return { container, body, guideHalo };
}

export function recycleCreatureVisual(creature: ActiveCreature) {
  creature.container.removeFromParent();
  creature.container.visible = false;
  creature.container.alpha = 1;
  creature.container.rotation = 0;
  creature.container.scale.set(1);
  creature.guideHalo.visible = false;

  const pool = visualPool.get(creature.def.id) ?? [];
  if (pool.length < 8) {
    pool.push({
      container: creature.container,
      body: creature.body,
      guideHalo: creature.guideHalo,
    });
    visualPool.set(creature.def.id, pool);
    return;
  }
  creature.container.destroy({ children: true });
}

export function destroyCreatureSystemResources() {
  for (const pool of visualPool.values()) {
    for (const visual of pool) visual.container.destroy({ children: true });
  }
  visualPool.clear();

  textureCache.clear();
  nextCreatureId = 0;
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
  const width = Math.max(1, bounds.right - bounds.left);
  const totalLanes = width < 600 ? 3 : 5;
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
  const safeLaneIndex = Math.min(getLaneMetrics(bounds).totalLanes - 1, laneIndex);
  const offsetX = laneOffsetNormalized * laneWidth * 0.42;
  return startX + safeLaneIndex * laneWidth + laneWidth / 2 + offsetX;
}

function resolveStartY(bounds: GameplayBounds, def: CreatureDef) {
  return bounds.top + def.size * 0.75;
}

function resolveEndY(bounds: GameplayBounds, def: CreatureDef) {
  return bounds.bottom + def.size;
}

function applyCreaturePosition(creature: ActiveCreature, visualTimeMs: number) {
  let progress = creature.fallProgressNormalized;
  if (creature.def.behavior === "heavy") progress = Math.pow(progress, 1.2);

  creature.y = creature.startY + progress * (creature.endY - creature.startY);
  creature.container.y = creature.y;
  let displayX = creature.x;

  if (creature.def.behavior === "sway") {
    displayX += Math.sin(visualTimeMs * 0.003 + creature.id) * 32;
    creature.container.rotation = Math.sin(visualTimeMs * 0.003 + creature.id) * 0.2;
  } else if (creature.def.behavior === "buzz") {
    displayX += Math.sin(visualTimeMs * 0.016 + creature.id) * 18;
    creature.container.y += Math.cos(visualTimeMs * 0.02 + creature.id) * 4;
    creature.container.rotation = Math.sin(visualTimeMs * 0.025 + creature.id) * 0.35;
  } else {
    displayX += Math.sin(visualTimeMs * 0.002 + creature.id) * 12;
    creature.container.rotation = Math.sin(visualTimeMs * 0.003 + creature.id) * 0.08;
  }

  const baseScale = 1 + progress * 0.12;
  creature.container.scale.x = baseScale + Math.sin(visualTimeMs * 0.008 + creature.id) * 0.035;
  creature.container.scale.y = baseScale + Math.cos(visualTimeMs * 0.009 + creature.id) * 0.035;

  if (creature.def.type === "bad") {
    displayX += Math.sin(visualTimeMs * 0.02 + creature.id * 3) * 5;
    creature.container.rotation += Math.sin(visualTimeMs * 0.03 + creature.id) * 0.35;
  }

  if (creature.guided) {
    creature.guideHalo.visible = true;
    creature.guideHalo.alpha = 0.55 + Math.sin(visualTimeMs * 0.009) * 0.25;
    creature.guideHalo.scale.set(0.94 + Math.sin(visualTimeMs * 0.007) * 0.08);
  }

  creature.container.x = clamp(displayX, creature.minX, creature.maxX);
}

export function spawnCreature(
  app: Application,
  layer: Container,
  options: SpawnCreatureOptions,
): ActiveCreature | null {
  const random = options.random ?? Math.random;
  const bounds = options.gameplayBounds ?? getRendererBounds(app);
  const activeCreatures = options.activeCreatures ?? [];
  const def =
    options.forcedDef ?? CREATURES[Math.floor(random() * CREATURES.length)];
  if (!def) return null;

  const { totalLanes } = getLaneMetrics(bounds);
  const minDistance = def.size * 2.1;
  const occupiedLanes = activeCreatures
    .filter((creature) => creature.phase === "popin" || creature.phase === "alive")
    .filter(
      (creature) =>
        Math.abs(creature.y - resolveStartY(bounds, creature.def)) < minDistance,
    )
    .map((creature) => Math.min(totalLanes - 1, creature.laneIndex));

  let laneIndex = Math.floor(random() * totalLanes);
  let attempts = 0;
  while (occupiedLanes.includes(laneIndex) && attempts < 10) {
    laneIndex = Math.floor(random() * totalLanes);
    attempts += 1;
  }
  if (occupiedLanes.includes(laneIndex)) return null;

  const startY = resolveStartY(bounds, def);
  const endY = resolveEndY(bounds, def);
  const fallDurationMultiplier = options.fallDurationMultiplier ?? 1;
  const lifeMs =
    4500 * fallDurationMultiplier * (1 / (def.speed * 0.8 + 0.2));
  const laneOffsetNormalized = random() - 0.5;
  const { minX, maxX } = getHorizontalLimits(bounds, def);
  const x = clamp(
    resolveLaneX(bounds, laneIndex, laneOffsetNormalized),
    minX,
    maxX,
  );

  const texture = getTexture(def);
  const { container, body, guideHalo } = acquireCreatureVisual(def, texture);
  container.position.set(x, startY);
  container.alpha = 0;
  container.scale.set(0.2);
  layer.addChild(container);

  return {
    id: nextCreatureId++,
    def,
    x,
    y: startY,
    startY,
    endY,
    laneIndex,
    laneOffsetNormalized,
    minX,
    maxX,
    fallProgressNormalized: 0,
    popinElapsedMs: 0,
    popoutElapsedMs: 0,
    container,
    body,
    guideHalo,
    born: options.gameTimeMs,
    lifeMs,
    phase: "popin",
    tapped: false,
    guided: options.guided ?? false,
  };
}

export function updateCreatures(
  creatures: ActiveCreature[],
  visualTimeMs: number,
  deltaMs: number,
  fallSpeedMultiplier: number,
  onExpire: (creature: ActiveCreature) => void,
) {
  for (let index = creatures.length - 1; index >= 0; index -= 1) {
    const creature = creatures[index];
    if (creature.phase === "popin" || creature.phase === "alive") {
      creature.fallProgressNormalized = Math.min(
        1,
        creature.fallProgressNormalized +
          (deltaMs * fallSpeedMultiplier) / creature.lifeMs,
      );
    }

    if (creature.phase === "popin") {
      creature.popinElapsedMs += deltaMs;
      const progress = Math.min(creature.popinElapsedMs / 200, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      creature.container.alpha = ease;
      creature.container.scale.set(0.3 + ease * 0.8);
      creature.container.x = clamp(
        creature.x + Math.sin(visualTimeMs * 0.002 + creature.id) * 16,
        creature.minX,
        creature.maxX,
      );
      if (progress >= 1) creature.phase = "alive";
    }

    if (creature.phase === "alive") {
      applyCreaturePosition(creature, visualTimeMs);
      if (creature.fallProgressNormalized >= 1) {
        onExpire(creature);
        creature.phase = "popout";
      }
    }

    if (creature.phase === "popout") {
      creature.popoutElapsedMs += deltaMs;
      const progress = Math.min(creature.popoutElapsedMs / 180, 1);
      if (creature.tapped) {
        const bounce = Math.sin(progress * Math.PI);
        creature.container.scale.set(1 + bounce * 0.5, 1 - bounce * 0.25 + progress * 0.15);
        creature.container.alpha = 1 - progress * progress;
        creature.container.y -= (deltaMs / 16.67) * 2;
      } else {
        creature.container.scale.set(Math.max(0, 1 - progress));
        creature.container.alpha = Math.max(0, 1 - progress);
      }

      if (progress >= 1) creature.phase = "dead";
    }

    if (creature.phase === "dead") {
      recycleCreatureVisual(creature);
      creatures.splice(index, 1);
    }
  }
  return creatures;
}

export function remapCreaturesToBounds(
  creatures: ActiveCreature[],
  app: Application,
  gameplayBounds?: GameplayBounds,
) {
  const bounds = gameplayBounds ?? getRendererBounds(app);
  const { totalLanes } = getLaneMetrics(bounds);
  for (const creature of creatures) {
    const { minX, maxX } = getHorizontalLimits(bounds, creature.def);
    creature.laneIndex = Math.min(totalLanes - 1, creature.laneIndex);
    creature.startY = resolveStartY(bounds, creature.def);
    creature.endY = resolveEndY(bounds, creature.def);
    creature.minX = minX;
    creature.maxX = maxX;
    creature.x = clamp(
      resolveLaneX(bounds, creature.laneIndex, creature.laneOffsetNormalized),
      minX,
      maxX,
    );
    applyCreaturePosition(creature, 0);
  }
}

export function hitTestCreatures(
  creatures: ActiveCreature[],
  targetX: number,
  targetY: number,
) {
  let closest: ActiveCreature | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const creature of creatures) {
    if (creature.phase !== "alive") continue;
    const deltaX = targetX - creature.container.x;
    const deltaY = targetY - creature.container.y;
    const distance = Math.hypot(deltaX, deltaY);
    const hitRadius = Math.max(
      32,
      creature.def.visualSize * creature.def.hitboxScale * 0.5,
    );
    if (distance < hitRadius && distance < closestDistance) {
      closest = creature;
      closestDistance = distance;
    }
  }
  return closest;
}
