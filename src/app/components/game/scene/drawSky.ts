import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO, SKY_TOP } from "../constants";

/**
 * Countryside sky — paper gradient, warm sun, mountains, bamboo, storks, kite.
 * Everything ABOVE the ground line.
 */
export function createSky(app: Application): Graphics {
  const g = new Graphics();
  const W = app.screen.width;
  const H = app.screen.height;
  const horizonY = H * WATERLINE_RATIO;

  // Sky gradient — rice paper to warm peach
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const y = horizonY * (i / steps);
    const h = horizonY / steps + 1;
    const r1 = (SKY_TOP >> 16) & 0xff, g1 = (SKY_TOP >> 8) & 0xff, b1 = SKY_TOP & 0xff;
    const r2 = 0xff, g2 = 0xe8, b2 = 0xc8;
    const t = i / steps;
    const r = Math.round(r1 + (r2 - r1) * t);
    const gv = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    g.rect(0, y, W, h);
    g.fill({ color: (r << 16) | (gv << 8) | b, alpha: 1 });
  }

  // Warm sun
  const sunX = W * 0.82, sunY = H * 0.18;
  g.circle(sunX, sunY, 50); g.fill({ color: 0xf8e8c0, alpha: 0.16 });
  g.circle(sunX, sunY, 34); g.fill({ color: 0xf8d880, alpha: 0.22 });
  g.circle(sunX, sunY, 20); g.fill({ color: 0xfff8e0, alpha: 0.85 });

  // Horizon glow
  g.rect(0, horizonY - 10, W, 10); g.fill({ color: 0xffe8c0, alpha: 0.3 });

  // Distant mountains
  g.moveTo(0, horizonY + 2);
  g.bezierCurveTo(W * 0.15, horizonY - 40, W * 0.35, horizonY - 55, W * 0.5, horizonY - 16);
  g.bezierCurveTo(W * 0.65, horizonY + 20, W * 0.8, horizonY - 38, W, horizonY - 6);
  g.lineTo(W, horizonY + 2); g.closePath();
  g.fill({ color: 0xe6d8b2, alpha: 0.45 });
  g.stroke({ color: 0x8a7d65, alpha: 0.2, width: 1 });

  g.moveTo(0, horizonY + 8);
  g.bezierCurveTo(W * 0.2, horizonY - 20, W * 0.45, horizonY - 28, W * 0.65, horizonY + 4);
  g.bezierCurveTo(W * 0.8, horizonY - 16, W * 0.9, horizonY + 6, W, horizonY + 6);
  g.lineTo(W, horizonY + 8); g.closePath();
  g.fill({ color: 0xe6d8b2, alpha: 0.3 });

  // Green hills
  g.moveTo(0, horizonY + 10);
  g.bezierCurveTo(W * 0.25, horizonY - 8, W * 0.5, horizonY + 6, W * 0.75, horizonY - 4);
  g.bezierCurveTo(W * 0.9, horizonY + 4, W, horizonY + 10, W, horizonY + 10);
  g.lineTo(W, horizonY + 22); g.lineTo(0, horizonY + 22); g.closePath();
  g.fill({ color: 0xc8d68a, alpha: 0.35 });

  // Bamboo stalks
  for (let i = 0; i < 10; i++) {
    const bx = W * (0.04 + (i / 9) * 0.92);
    const bh = horizonY + 6 + ((i * 7 + 3) % 10);
    const ty = bh - 28 - ((i * 11) % 16);
    g.moveTo(bx, bh); g.lineTo(bx + ((i % 3) - 1) * 2, ty);
    g.stroke({ color: 0x6b8e3d, alpha: 0.28, width: 1.1 });
    g.moveTo(bx + ((i % 3) - 1) * 2, ty + 5); g.lineTo(bx + ((i % 3) - 1) * 2 + 5, ty);
    g.stroke({ color: 0x6b8e3d, alpha: 0.2, width: 0.8 });
    g.moveTo(bx + ((i % 3) - 1) * 2, ty + 5); g.lineTo(bx + ((i % 3) - 1) * 2 - 4, ty + 1);
    g.stroke({ color: 0x6b8e3d, alpha: 0.2, width: 0.8 });
  }

  // Storks
  for (let i = 0; i < 4; i++) {
    const sx = W * (0.18 + i * 0.16), sy = horizonY - 36 - i * 5;
    g.moveTo(sx - 5, sy); g.lineTo(sx, sy - 6);
    g.stroke({ color: 0x8a7d65, alpha: 0.32, width: 0.9 });
    g.moveTo(sx + 5, sy); g.lineTo(sx, sy - 6);
    g.stroke({ color: 0x8a7d65, alpha: 0.32, width: 0.9 });
  }

  // Kite
  const kx = W * 0.78, ky = horizonY - 80;
  g.moveTo(kx, ky - 14); g.lineTo(kx + 8, ky); g.lineTo(kx, ky + 10); g.lineTo(kx - 8, ky); g.closePath();
  g.fill({ color: 0xf0b840, alpha: 0.45 });
  g.stroke({ color: 0xf0b840, alpha: 0.5, width: 1 });
  g.moveTo(kx, ky + 10); g.quadraticCurveTo(kx + 3, ky + 18, kx - 1, ky + 30);
  g.stroke({ color: 0x8a7d65, alpha: 0.3, width: 0.7 });
  g.moveTo(kx, ky - 14); g.quadraticCurveTo(kx - 25, ky + 80, kx - 70, ky + 180);
  g.stroke({ color: 0x8a7d65, alpha: 0.15, width: 0.6 });

  return g;
}
