import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO } from "../constants";

interface Bubble {
  g: Graphics;
  x: number;
  y: number;
  r: number;
  vy: number;
  wobble: number;
  wobbleSpeed: number;
  canvasH: number;
  canvasW: number;
}

// ── Create bubble particles in the underwater zone ───────────────────────────
export function createBubbles(app: Application): Bubble[] {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;
  const bubbles: Bubble[] = [];

  for (let i = 0; i < 20; i++) {
    const r = 2.5 + Math.random() * 6;
    const x = Math.random() * W;
    const y = wy + Math.random() * (H - wy);
    const g = new Graphics();
    g.circle(0, 0, r);
    g.fill({ color: 0x88ddff, alpha: 0.06 });
    g.circle(0, 0, r);
    g.stroke({ color: 0xaaeeff, alpha: 0.22, width: 1 });
    g.x = x; g.y = y;
    app.stage.addChild(g);
    bubbles.push({
      g, x, y, r,
      vy: 0.3 + Math.random() * 0.55,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.018 + Math.random() * 0.022,
      canvasH: H, canvasW: W,
    });
  }
  return bubbles;
}

// ── Animate bubbles each frame ────────────────────────────────────────────────
export function updateBubbles(bubbles: Bubble[], H: number, W: number) {
  const wy = H * WATERLINE_RATIO;
  for (const b of bubbles) {
    b.wobble += b.wobbleSpeed;
    b.y -= b.vy;
    b.x += Math.sin(b.wobble) * 0.35;
    if (b.y < wy - b.r * 2) {
      b.y = H + b.r;
      b.x = Math.random() * W;
    }
    b.g.x = b.x;
    b.g.y = b.y;
  }
}

// ── Destroy all bubbles ───────────────────────────────────────────────────────
export function destroyBubbles(bubbles: Bubble[]) {
  for (const b of bubbles) b.g.destroy();
  bubbles.length = 0;
}
