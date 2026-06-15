import { Graphics, Container, Text, TextStyle, Application, Texture, Sprite } from "pixi.js";
import { CREATURES, WATERLINE_RATIO, type CreatureDef } from "../constants";
import { drawCreature } from "../drawCreature";

export interface ActiveCreature {
  id: number;
  def: CreatureDef;
  x: number;
  y: number;
  container: Container;
  body: Sprite;
  ring: Graphics;
  born: number;       // ms (elapsed ticker time)
  lifeMs: number;
  phase: "popin" | "alive" | "popout" | "dead";
  tapped: boolean;
}

let gId = 0;

const textureCache = new Map<string, Texture>();

function getCreatureTexture(app: Application, def: CreatureDef): Texture {
  if (textureCache.has(def.name)) {
    return textureCache.get(def.name)!;
  }
  const body = new Graphics();
  drawCreature(body, def);
  const texture = app.renderer.generateTexture(body);
  textureCache.set(def.name, texture);
  return texture;
}

// ── Spawn one creature in the underwater zone ─────────────────────────────────
export function spawnCreature(
  app: Application,
  elapsed: number,
  gameTimeMs: number,
  difficulty: string = "Normal"
): ActiveCreature {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;

  const margin = 60;
  const x = margin + Math.random() * (W - margin * 2);
  // only appear below the waterline
  const y = wy + margin + Math.random() * (H - wy - margin * 1.5);

  const def = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  
  let lifeBase = 2200;
  let lifeRamp = 0.03;
  if (difficulty === "Easy") {
    lifeBase = 2640; // 1.2x
    lifeRamp = 0.02;
  } else if (difficulty === "Hard") {
    lifeBase = 1540; // 0.7x
    lifeRamp = 0.04;
  }
  const lifeMs = Math.max(700, lifeBase - gameTimeMs * lifeRamp) * (1 / (def.speed * 0.4 + 0.6));

  const container = new Container();
  container.x = x; container.y = y;

  const ring = new Graphics();
  container.addChild(ring);

  const texture = getCreatureTexture(app, def);
  const body = new Sprite(texture);
  body.anchor.set(0.5); // Center the sprite
  container.addChild(body);

  // name label
  const label = new Text({
    text: def.name,
    style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: "monospace", alpha: 0.65 }),
  });
  label.anchor.set(0.5, 0);
  label.y = def.size * 1.3;
  container.addChild(label);

  container.alpha = 0;
  container.scale.set(0.1);
  app.stage.addChild(container);

  return { id: gId++, def, x, y, container, body, ring, born: elapsed, lifeMs, phase: "popin", tapped: false };
}

// ── Update all creatures; returns creatures that expired (for miss counting) ──
export function updateCreatures(
  creatures: ActiveCreature[],
  elapsed: number,
  onExpire: (c: ActiveCreature) => void,
): ActiveCreature[] {
  const dead: ActiveCreature[] = [];

  for (const c of creatures) {
    if (c.phase === "dead") { dead.push(c); continue; }
    const age = elapsed - c.born;
    const progress = age / c.lifeMs;

    if (c.phase === "popin") {
      const t = Math.min(age / 180, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      c.container.alpha = ease;
      c.container.scale.set(0.3 + ease * 0.85);
      c.container.scale.y = c.container.scale.x * (1 + Math.sin(t * Math.PI) * 0.18);
      if (t >= 1) c.phase = "alive";
    }

    if (c.phase === "alive") {
      // shrinking timer ring
      const remaining = 1 - progress;
      c.ring.clear();
      c.ring.circle(0, 0, c.def.size * 1.12);
      c.ring.stroke({ color: 0x223344, alpha: 0.5, width: 4 });
      if (remaining > 0) {
        const steps = 40;
        const startA = -Math.PI / 2;
        const endA = startA + remaining * Math.PI * 2;
        c.ring.moveTo(
          Math.cos(startA) * c.def.size * 1.12,
          Math.sin(startA) * c.def.size * 1.12,
        );
        for (let si = 0; si <= steps; si++) {
          const a = startA + (endA - startA) * (si / steps);
          c.ring.lineTo(Math.cos(a) * c.def.size * 1.12, Math.sin(a) * c.def.size * 1.12);
        }
        const ringColor = remaining > 0.4 ? 0x00ffaa : remaining > 0.2 ? 0xffaa00 : 0xff3333;
        c.ring.stroke({ color: ringColor, alpha: 0.85, width: 4 });
      }
      // idle wobble
      c.container.scale.x = 1 + Math.sin(elapsed * 0.005 + c.id) * 0.04;
      c.container.scale.y = 1 + Math.cos(elapsed * 0.006 + c.id) * 0.04;

      if (progress >= 1) onExpire(c);
    }

    if (c.phase === "popout") {
      const popStart = c.tapped ? c.born : c.born + c.lifeMs;
      const t = Math.min((elapsed - popStart) / 200, 1);
      c.container.scale.set(c.tapped ? 1 + t * 0.6 : Math.max(0, 1 - t));
      c.container.alpha = 1 - t;
      if (t >= 1) { c.phase = "dead"; dead.push(c); }
    }
  }

  // cleanup dead
  for (const c of dead) {
    c.container.destroy({ children: true });
  }
  return creatures.filter(c => c.phase !== "dead");
}

// ── Hit-test a tap against living creatures ───────────────────────────────────
export function hitTestCreatures(
  creatures: ActiveCreature[],
  tx: number,
  ty: number,
): ActiveCreature | null {
  const sorted = [...creatures].sort((a, b) => a.def.size - b.def.size);
  for (const c of sorted) {
    if (c.phase !== "alive") continue;
    const dx = tx - c.x, dy = ty - c.y;
    if (Math.sqrt(dx * dx + dy * dy) < c.def.size * 1.1) return c;
  }
  return null;
}
