import { Graphics } from "pixi.js";
import type { CreatureDef } from "./constants";

// ── Draw one creature into a Graphics object ──────────────────────────────────
export function drawCreature(g: Graphics, def: CreatureDef) {
  const s = def.size;
  const c = def.color;
  g.clear();

  // soft glow halo
  g.circle(0, 0, s * 1.15);
  g.fill({ color: def.glow, alpha: 0.16 });

  switch (def.shape) {
    case "jelly":
      g.ellipse(0, -s * 0.1, s * 0.6, s * 0.42);
      g.fill({ color: c, alpha: 0.88 });
      for (let i = 0; i < 6; i++) {
        const tx = (i - 2.5) * s * 0.18;
        g.moveTo(tx, s * 0.3);
        g.lineTo(tx + s * 0.05, s * 0.75);
        g.stroke({ color: c, alpha: 0.55, width: 2.5 });
      }
      break;

    case "fish":
      g.ellipse(0, 0, s * 0.55, s * 0.32);
      g.fill({ color: c, alpha: 0.9 });
      g.moveTo(s * 0.45, 0);
      g.lineTo(s * 0.72, -s * 0.25);
      g.lineTo(s * 0.72, s * 0.25);
      g.closePath();
      g.fill({ color: c, alpha: 0.75 });
      g.moveTo(-s * 0.05, -s * 0.32);
      g.lineTo(-s * 0.05, s * 0.32);
      g.stroke({ color: 0xffffff, alpha: 0.45, width: 3 });
      g.circle(-s * 0.18, -s * 0.07, s * 0.07);
      g.fill({ color: 0xffffff, alpha: 0.9 });
      break;

    case "horse":
      g.roundRect(-s * 0.15, -s * 0.32, s * 0.3, s * 0.6, s * 0.1);
      g.fill({ color: c, alpha: 0.9 });
      g.ellipse(s * 0.05, -s * 0.44, s * 0.22, s * 0.17);
      g.fill({ color: c, alpha: 0.9 });
      g.moveTo(s * 0.05, -s * 0.54);
      g.lineTo(s * 0.25, -s * 0.48);
      g.stroke({ color: c, alpha: 0.8, width: 5 });
      break;

    case "octo":
      g.ellipse(0, -s * 0.1, s * 0.42, s * 0.38);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(0, s * 0.18);
        g.quadraticCurveTo(Math.cos(a) * s * 0.4, s * 0.3, Math.cos(a) * s * 0.45, s * 0.55);
        g.stroke({ color: c, alpha: 0.7, width: 3.5 });
      }
      g.circle(-s * 0.13, -s * 0.13, s * 0.07);
      g.fill({ color: 0xffffff, alpha: 0.9 });
      g.circle(s * 0.13, -s * 0.13, s * 0.07);
      g.fill({ color: 0xffffff, alpha: 0.9 });
      break;

    case "whale":
      g.ellipse(0, 0, s * 0.7, s * 0.3);
      g.fill({ color: c, alpha: 0.9 });
      g.moveTo(s * 0.6, 0);
      g.lineTo(s * 0.88, -s * 0.28);
      g.lineTo(s * 0.75, 0);
      g.lineTo(s * 0.88, s * 0.28);
      g.closePath();
      g.fill({ color: c, alpha: 0.8 });
      g.ellipse(-s * 0.1, s * 0.1, s * 0.38, s * 0.12);
      g.fill({ color: 0xaaddff, alpha: 0.35 });
      g.circle(-s * 0.28, -s * 0.08, s * 0.06);
      g.fill({ color: 0xffffff, alpha: 0.9 });
      break;

    case "turtle":
      g.ellipse(0, 0, s * 0.44, s * 0.36);
      g.fill({ color: c, alpha: 0.9 });
      g.ellipse(0, 0, s * 0.34, s * 0.27);
      g.fill({ color: 0x228855, alpha: 0.7 });
      g.circle(s * 0.44, 0, s * 0.14);
      g.fill({ color: c, alpha: 0.9 });
      for (const [fx, fy] of [[-0.28, -0.3], [-0.28, 0.3], [0.18, -0.3], [0.18, 0.3]] as [number, number][]) {
        g.ellipse(fx * s, fy * s, s * 0.14, s * 0.08);
        g.fill({ color: c, alpha: 0.8 });
      }
      break;

    case "angler":
      g.ellipse(0, 0, s * 0.5, s * 0.37);
      g.fill({ color: c, alpha: 0.9 });
      g.moveTo(-s * 0.4, s * 0.1);
      g.lineTo(s * 0.15, s * 0.38);
      g.lineTo(-s * 0.4, s * 0.38);
      g.closePath();
      g.fill({ color: 0x880000, alpha: 0.7 });
      g.moveTo(-s * 0.1, -s * 0.37);
      g.lineTo(-s * 0.1, -s * 0.62);
      g.stroke({ color: 0x888888, width: 2 });
      g.circle(-s * 0.1, -s * 0.68, s * 0.1);
      g.fill({ color: 0xffff00, alpha: 0.95 });
      g.circle(-s * 0.26, -s * 0.12, s * 0.07);
      g.fill({ color: 0xffff00, alpha: 0.9 });
      break;

    case "star":
      for (let i = 0; i < 5; i++) {
        const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = a1 + Math.PI / 5;
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a1) * s * 0.44, Math.sin(a1) * s * 0.44);
        g.lineTo(Math.cos(a2) * s * 0.2, Math.sin(a2) * s * 0.2);
        g.closePath();
        g.fill({ color: c, alpha: 0.9 });
      }
      break;

    default:
      g.circle(0, 0, s * 0.4);
      g.fill({ color: c, alpha: 0.9 });
  }
}

// ── Draw a bezier heart ───────────────────────────────────────────────────────
export function drawHeart(g: Graphics, size: number, color: number, alpha: number) {
  g.clear();
  const s = size;
  g.moveTo(0, s * 0.3);
  g.bezierCurveTo(-s * 0.05, s * 0.05, -s * 0.5, -s * 0.1, -s * 0.5, -s * 0.3);
  g.bezierCurveTo(-s * 0.5, -s * 0.65, 0, -s * 0.5, 0, -s * 0.15);
  g.bezierCurveTo(0, -s * 0.5, s * 0.5, -s * 0.65, s * 0.5, -s * 0.3);
  g.bezierCurveTo(s * 0.5, -s * 0.1, s * 0.05, s * 0.05, 0, s * 0.3);
  g.closePath();
  g.fill({ color, alpha });
}
