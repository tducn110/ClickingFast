import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO, SKY_TOP, SKY_MID, SKY_HOR } from "../constants";

// ── Static dusk sky + stars + moon ───────────────────────────────────────────
export function createSky(app: Application): Graphics {
  const W = app.screen.width;
  const H = app.screen.height;
  const horizonY = H * WATERLINE_RATIO;

  const g = new Graphics();

  // gradient bands (sky top → purple mid → orange horizon)
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const y0 = (horizonY / steps) * i;
    const h = horizonY / steps + 1;

    let r: number, gv: number, b: number;
    if (t < 0.55) {
      // top indigo → purple mid
      const u = t / 0.55;
      r = lerp(0x1a, 0x5c, u);
      gv = lerp(0x05, 0x1a, u);
      b = lerp(0x33, 0x6e, u);
    } else {
      // purple mid → warm horizon
      const u = (t - 0.55) / 0.45;
      r = lerp(0x5c, 0xd4, u);
      gv = lerp(0x1a, 0x60, u);
      b = lerp(0x6e, 0x1a, u);
    }
    g.rect(0, y0, W, h);
    g.fill({ color: (r << 16) | (gv << 8) | b, alpha: 1 });
  }

  // moon (upper right area)
  const moonX = W * 0.82;
  const moonY = H * 0.1;
  g.circle(moonX, moonY, 18);
  g.fill({ color: 0xfff5cc, alpha: 0.95 });
  // crescent shadow
  g.circle(moonX + 6, moonY - 3, 15);
  g.fill({ color: SKY_TOP, alpha: 0.85 });

  // moon glow
  g.circle(moonX, moonY, 32);
  g.fill({ color: 0xffe8aa, alpha: 0.08 });
  g.circle(moonX, moonY, 52);
  g.fill({ color: 0xffe8aa, alpha: 0.04 });

  // stars
  const rng = seededRng(42);
  for (let i = 0; i < 55; i++) {
    const sx = rng() * W;
    const sy = rng() * horizonY * 0.85;
    const sr = 0.6 + rng() * 1.2;
    const sa = 0.3 + rng() * 0.7;
    g.circle(sx, sy, sr);
    g.fill({ color: 0xffffff, alpha: sa });
  }

  // warm horizon glow (light strip above water)
  g.rect(0, horizonY - 14, W, 14);
  g.fill({ color: 0xff8833, alpha: 0.18 });
  g.rect(0, horizonY - 5, W, 5);
  g.fill({ color: 0xffcc44, alpha: 0.28 });

  // silhouette distant hills / landmass (left side)
  g.moveTo(0, horizonY);
  g.lineTo(0, horizonY - 28);
  g.bezierCurveTo(W * 0.04, horizonY - 52, W * 0.1, horizonY - 60, W * 0.18, horizonY - 44);
  g.bezierCurveTo(W * 0.24, horizonY - 34, W * 0.28, horizonY - 18, W * 0.34, horizonY - 10);
  g.lineTo(W * 0.34, horizonY);
  g.closePath();
  g.fill({ color: 0x0a0218, alpha: 0.7 });

  return g;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// suppress unused import warning
void SKY_MID;
