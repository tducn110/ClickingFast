import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO } from "../constants";

export interface WaterLayer {
  surface: Graphics;
  deep: Graphics;
  reflection: Graphics;
}

/**
 * Ground layer — earth + grass below the sky line.
 * Ground mound where the mascot stands.
 */
export function createWater(app: Application): WaterLayer {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;
  const groundH = H - wy;

  // Ground fill — green to deep earth
  const deep = new Graphics();
  const steps = 25;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const y = wy + groundH * (i / steps);
    const h = groundH / steps + 1;
    const sr = 0xc8, sg = 0xd6, sb = 0x8a;
    const dr = 0x4c, dg = 0x66, db = 0x30;
    const r = Math.round(sr + (dr - sr) * t);
    const gv = Math.round(sg + (dg - sg) * t);
    const b = Math.round(sb + (db - sb) * t);
    deep.rect(0, y, W, h);
    deep.fill({ color: (r << 16) | (gv << 8) | b, alpha: 1 });
  }

  // Big earth mound — where mascot stands
  const mc = W * 0.5;
  const my = wy + groundH * 0.48;
  const mrx = W * 0.44;
  const mry = groundH * 0.36;
  deep.ellipse(mc, my, mrx, mry);
  deep.fill({ color: 0xb88440, alpha: 0.75 });
  deep.ellipse(mc, my - 6, mrx * 0.88, mry * 0.65);
  deep.fill({ color: 0xc89848, alpha: 0.3 });

  // Dirt texture
  for (let i = 0; i < 16; i++) {
    const dx = mc - mrx * 0.55 + (i / 15) * mrx * 1.1;
    const dy = my - mry * 0.25 + ((i * 7) % 9) * 3;
    deep.moveTo(dx, dy); deep.lineTo(dx + 5, dy - 1.5);
    deep.stroke({ color: 0x6b3a18, alpha: 0.22, width: 0.9 });
  }

  // Small grass tufts on mound
  for (let i = 0; i < 10; i++) {
    const gx = mc - mrx * 0.5 + (i / 9) * mrx;
    const gy = my - mry * 0.5;
    deep.moveTo(gx, gy); deep.lineTo(gx + 2, gy - 6);
    deep.stroke({ color: 0x6b8e3d, alpha: 0.3, width: 1.2 });
  }

  const surface = new Graphics();
  const reflection = new Graphics();

  return { surface, deep, reflection };
}

export function updateWater(layer: WaterLayer, W: number, H: number, elapsed: number) {
  const wy = H * WATERLINE_RATIO;
  const t = elapsed * 0.001;

  layer.surface.clear();

  // Grass wave at the horizon
  layer.surface.moveTo(0, wy);
  const wSteps = 24;
  for (let i = 0; i <= wSteps; i++) {
    const x = (i / wSteps) * W;
    const y = wy + Math.sin(i * 0.7 + t * 1.2) * 3 + Math.sin(i * 1.4 + t * 0.8) * 2;
    i === 0 ? layer.surface.moveTo(x, y) : layer.surface.lineTo(x, y);
  }
  layer.surface.lineTo(W, wy - 6); layer.surface.lineTo(0, wy - 6); layer.surface.closePath();
  layer.surface.fill({ color: 0xb8d06a, alpha: 0.5 });

  // Crest
  layer.surface.moveTo(0, wy - 1);
  for (let i = 0; i <= wSteps; i++) {
    const x = (i / wSteps) * W;
    const y = wy + Math.sin(i * 0.7 + t * 1.2) * 3 + Math.sin(i * 1.4 + t * 0.8) * 2 - 1;
    i === 0 ? layer.surface.moveTo(x, y) : layer.surface.lineTo(x, y);
  }
  layer.surface.stroke({ color: 0xe8d898, alpha: 0.45, width: 2 });

  // Warning line
  layer.surface.moveTo(0, wy - 20);
  for (let i = 0; i <= wSteps; i++) {
    const x = (i / wSteps) * W;
    const y = wy - 20;
    if (i % 2 === 0) layer.surface.moveTo(x, y);
    else layer.surface.lineTo(x, y);
  }
  layer.surface.stroke({ color: 0xff4444, alpha: 0.15, width: 2 });

  // Shimmer
  layer.reflection.clear();
  const sx = W * 0.7;
  for (let i = 0; i < 5; i++) {
    const rx = sx + Math.sin(t * 2.2 + i * 0.7) * 30;
    const ry = wy + 6 + i * 10;
    layer.reflection.ellipse(rx, ry, 12 + Math.sin(t * 1.8 + i) * 4, 1.8);
    layer.reflection.fill({ color: 0xfff8d0, alpha: 0.1 });
  }
}
