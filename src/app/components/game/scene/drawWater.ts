import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO, WATER_SURF, WATER_DEEP } from "../constants";

export interface WaterLayer {
  surface: Graphics; // animated wave layer
  deep: Graphics;    // static deep water fill
  reflection: Graphics; // moon/light reflection, redrawn each frame
}

// ── Create the static deep water fill ────────────────────────────────────────
export function createWater(app: Application): WaterLayer {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;

  // deep fill — gradient bands from surface color to near-black
  const deep = new Graphics();
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const y = wy + (H - wy) * (i / steps);
    const h = ((H - wy) / steps) + 1;
    const sr = (WATER_SURF >> 16) & 0xff;
    const sg = (WATER_SURF >> 8) & 0xff;
    const sb = WATER_SURF & 0xff;
    const dr = (WATER_DEEP >> 16) & 0xff;
    const dg = (WATER_DEEP >> 8) & 0xff;
    const db = WATER_DEEP & 0xff;
    const r = Math.round(sr + (dr - sr) * t);
    const gv = Math.round(sg + (dg - sg) * t);
    const b = Math.round(sb + (db - sb) * t);
    deep.rect(0, y, W, h);
    deep.fill({ color: (r << 16) | (gv << 8) | b, alpha: 1 });
  }

  // animated wave surface
  const surface = new Graphics();

  // moon reflection strip (redrawn each frame for shimmer)
  const reflection = new Graphics();

  return { surface, deep, reflection };
}

// ── Call each ticker frame to animate waves + reflection ─────────────────────
export function updateWater(layer: WaterLayer, W: number, H: number, elapsed: number) {
  const wy = H * WATERLINE_RATIO;
  const t = elapsed * 0.001;

  // ── animated wave surface ─────────────────────────────────────────────────
  layer.surface.clear();

  // main wave band
  layer.surface.moveTo(0, wy);
  const wSteps = 24;
  for (let i = 0; i <= wSteps; i++) {
    const x = (i / wSteps) * W;
    const y = wy + Math.sin(i * 0.9 + t * 2.2) * 3 + Math.sin(i * 1.7 + t * 1.4) * 1.5;
    i === 0 ? layer.surface.moveTo(x, y) : layer.surface.lineTo(x, y);
  }
  layer.surface.lineTo(W, wy - 6);
  layer.surface.lineTo(0, wy - 6);
  layer.surface.closePath();
  layer.surface.fill({ color: 0x2a6a99, alpha: 0.55 });

  // bright crest highlight
  layer.surface.moveTo(0, wy - 1);
  for (let i = 0; i <= wSteps; i++) {
    const x = (i / wSteps) * W;
    const y = wy + Math.sin(i * 0.9 + t * 2.2) * 3 + Math.sin(i * 1.7 + t * 1.4) * 1.5 - 1;
    i === 0 ? layer.surface.moveTo(x, y) : layer.surface.lineTo(x, y);
  }
  layer.surface.stroke({ color: 0x88ccff, alpha: 0.4, width: 2 });

  // secondary ripple lines deeper in water
  for (let row = 0; row < 5; row++) {
    const ry = wy + 18 + row * 22;
    const amp = 1.5 - row * 0.2;
    layer.surface.moveTo(0, ry);
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * W;
      const y = ry + Math.sin(i * 1.2 + t * 1.8 + row * 0.8) * amp;
      layer.surface.lineTo(x, y);
    }
    layer.surface.stroke({ color: 0x3a7aaa, alpha: 0.12 - row * 0.02, width: 1 });
  }

  // ── moon reflection ───────────────────────────────────────────────────────
  layer.reflection.clear();
  const moonReflX = W * 0.82;
  const reflW = 18 + Math.sin(t * 3) * 4;
  for (let i = 0; i < 8; i++) {
    const ry = wy + 8 + i * 14;
    const rw = reflW * (1 - i * 0.09) + Math.sin(t * 4 + i) * 3;
    const ra = (0.22 - i * 0.025) * (0.6 + Math.sin(t * 5 + i * 0.7) * 0.4);
    layer.reflection.ellipse(moonReflX, ry, rw, 3);
    layer.reflection.fill({ color: 0xffe8aa, alpha: ra });
  }

  // horizon orange reflection on water
  layer.reflection.rect(0, wy, W, 10);
  layer.reflection.fill({ color: 0xff8833, alpha: 0.06 + Math.sin(t) * 0.02 });
}
