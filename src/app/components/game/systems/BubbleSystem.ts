import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO } from "../constants";

interface Leaf {
  g: Graphics;
  x: number;
  y: number;
  vy: number;
  vx: number;
  rotation: number;
  rotSpeed: number;
  canvasH: number;
  canvasW: number;
}

/**
 * Floating leaves / petals drifting gently in the sky.
 * Replaces the old ocean bubbles — countryside appropriate.
 */
export function createBubbles(app: Application): Leaf[] {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;
  const leaves: Leaf[] = [];

  for (let i = 0; i < 12; i++) {
    const size = 3 + Math.random() * 5;
    const x = Math.random() * W;
    const y = Math.random() * wy; // only in sky zone
    const g = new Graphics();
    // Small leaf shape — ellipse
    g.ellipse(0, 0, size, size * 0.45);
    g.fill({ color: 0xa8d86a, alpha: 0.15 + Math.random() * 0.1 });
    g.x = x; g.y = y;
    g.rotation = Math.random() * Math.PI * 2;
    app.stage.addChild(g);
    leaves.push({
      g, x, y,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.2 + Math.random() * 0.4,
      rotation: g.rotation,
      rotSpeed: (Math.random() - 0.5) * 0.01,
      canvasH: H, canvasW: W,
    });
  }
  return leaves;
}

export function updateBubbles(leaves: Leaf[], H: number, W: number) {
  const wy = H * WATERLINE_RATIO;
  for (const l of leaves) {
    l.y -= l.vy;
    l.x += l.vx + Math.sin(l.y * 0.01) * 0.3;
    l.rotation += l.rotSpeed;
    // Wrap around when leaves go above screen
    if (l.y < -20) {
      l.y = wy + 10;
      l.x = Math.random() * W;
    }
    // Wrap horizontally
    if (l.x < -20) l.x = W + 20;
    if (l.x > W + 20) l.x = -20;
    l.g.x = l.x;
    l.g.y = l.y;
    l.g.rotation = l.rotation;
  }
}

export function destroyBubbles(leaves: Leaf[]) {
  for (const l of leaves) l.g.destroy();
  leaves.length = 0;
}
