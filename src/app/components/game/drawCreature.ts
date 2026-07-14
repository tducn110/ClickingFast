import { Graphics } from "pixi.js";
import type { TargetDef } from "./constants";

// ── Draw one fruit into a Graphics object ─────────────────────────────────────
export function drawCreature(g: Graphics, def: TargetDef) {
  const s = def.size;
  const c = def.color;
  g.clear();

  // Removed glow halo to make it look less like a debug hitbox

  switch (def.shape as string) {
    case "peanut":
      g.ellipse(-s * 0.14, 0, s * 0.25, s * 0.38);
      g.fill({ color: c, alpha: 0.9 });
      g.ellipse(s * 0.14, 0, s * 0.25, s * 0.38);
      g.fill({ color: c, alpha: 0.9 });
      g.ellipse(0, 0, s * 0.06, s * 0.2);
      g.fill({ color: 0xd99820, alpha: 0.5 });
      for (let i = -1; i <= 1; i++) {
        g.moveTo(-s * 0.32, i * s * 0.13);
        g.lineTo(s * 0.32, i * s * 0.13);
        g.stroke({ color: 0x8e4e22, alpha: 0.35, width: 1.2 });
      }
      break;

    case "mango":
      g.ellipse(0, 0, s * 0.35, s * 0.5);
      g.fill({ color: c, alpha: 0.9 });
      g.ellipse(-s * 0.05, -s * 0.08, s * 0.15, s * 0.2);
      g.fill({ color: 0xffdd44, alpha: 0.35 });
      g.ellipse(0, -s * 0.55, s * 0.1, s * 0.16);
      g.fill({ color: 0x44aa44, alpha: 0.7 });
      break;

    case "melon":
      g.circle(0, 0, s * 0.42);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = -2; i <= 2; i++) {
        g.moveTo(i * s * 0.1, -s * 0.38);
        g.lineTo(i * s * 0.15, s * 0.38);
        g.stroke({ color: 0x228833, alpha: 0.4, width: 2.5 });
      }
      g.circle(-s * 0.1, -s * 0.08, s * 0.08);
      g.fill({ color: 0xffffff, alpha: 0.25 });
      break;

    case "rambutan":
      g.circle(0, 0, s * 0.35);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const sx = Math.cos(a) * s * 0.34;
        const sy = Math.sin(a) * s * 0.34;
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(a) * s * 0.16, sy + Math.sin(a) * s * 0.16);
        g.stroke({ color: c, alpha: 0.7, width: 2 });
      }
      g.circle(0, 0, s * 0.18);
      g.fill({ color: 0xffccaa, alpha: 0.6 });
      break;

    case "dragon":
      g.ellipse(0, 0, s * 0.35, s * 0.45);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const tx = Math.cos(a) * s * 0.32;
        const ty = Math.sin(a) * s * 0.42;
        g.moveTo(tx, ty);
        g.lineTo(tx + Math.cos(a) * s * 0.12, ty + Math.sin(a) * s * 0.12);
        g.stroke({ color: 0x44dd66, alpha: 0.7, width: 2.5 });
      }
      g.circle(0, 0, s * 0.1);
      g.fill({ color: 0xffffff, alpha: 0.3 });
      break;

    case "mangosteen":
      g.circle(0, 0, s * 0.36);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        g.moveTo(0, -s * 0.32);
        g.lineTo(Math.cos(a) * s * 0.14, -s * 0.22 - Math.sin(a) * s * 0.08);
        g.stroke({ color: 0x44aa44, alpha: 0.7, width: 2.5 });
      }
      g.circle(-s * 0.08, -s * 0.08, s * 0.06);
      g.fill({ color: 0xffffff, alpha: 0.25 });
      break;

    case "coconut":
      g.circle(0, 0, s * 0.36);
      g.fill({ color: c, alpha: 0.9 });
      g.circle(-s * 0.08, -s * 0.12, 2.5);
      g.fill({ color: 0x4a3a1a, alpha: 0.8 });
      g.circle(s * 0.06, -s * 0.1, 2.5);
      g.fill({ color: 0x4a3a1a, alpha: 0.8 });
      g.circle(-s * 0.01, -s * 0.06, 2.5);
      g.fill({ color: 0x4a3a1a, alpha: 0.8 });
      g.moveTo(-s * 0.25, -s * 0.18);
      g.lineTo(s * 0.25, s * 0.18);
      g.stroke({ color: 0x6b4e0a, alpha: 0.3, width: 1.2 });
      break;

    case "durian":
      g.ellipse(0, 0, s * 0.42, s * 0.38);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const sx = Math.cos(a) * s * 0.4;
        const sy = Math.sin(a) * s * 0.36;
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(a) * s * 0.14, sy + Math.sin(a) * s * 0.14);
        g.stroke({ color: 0x667722, alpha: 0.6, width: 2.5 });
      }
      break;

    case "pumpkin":
      g.ellipse(0, 0, s * 0.48, s * 0.35);
      g.fill({ color: c, alpha: 0.9 });
      for (let i = -2; i <= 2; i++) {
        g.moveTo(i * s * 0.1, -s * 0.33);
        g.lineTo(i * s * 0.12, s * 0.33);
        g.stroke({ color: 0xcc5500, alpha: 0.35, width: 2 });
      }
      g.rect(-s * 0.04, -s * 0.42, s * 0.08, s * 0.1);
      g.fill({ color: 0x668833, alpha: 0.7 });
      g.circle(-s * 0.12, -s * 0.06, s * 0.09);
      g.fill({ color: 0xffffff, alpha: 0.2 });
      break;

    case "berry":
      g.circle(0, 0, s * 0.28);
      g.fill({ color: c, alpha: 0.95 });
      g.circle(-s * 0.18, s * 0.08, s * 0.18);
      g.fill({ color: c, alpha: 0.95 });
      g.circle(s * 0.18, s * 0.08, s * 0.18);
      g.fill({ color: c, alpha: 0.95 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.circle(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.18 + s * 0.06, s * 0.025);
        g.fill({ color: 0xfff1b0, alpha: 0.9 });
      }
      g.moveTo(0, -s * 0.28);
      g.lineTo(-s * 0.16, -s * 0.44);
      g.lineTo(0, -s * 0.38);
      g.lineTo(s * 0.16, -s * 0.44);
      g.closePath();
      g.fill({ color: 0x4f9b42, alpha: 0.95 });
      break;

    case "bee":
      g.ellipse(0, 0, s * 0.34, s * 0.22);
      g.fill({ color: c, alpha: 0.95 });
      for (let i = -1; i <= 1; i++) {
        g.moveTo(i * s * 0.13, -s * 0.16);
        g.lineTo(i * s * 0.13, s * 0.16);
        g.stroke({ color: 0x2b2620, alpha: 0.7, width: 2.2 });
      }
      g.ellipse(-s * 0.12, -s * 0.22, s * 0.14, s * 0.12);
      g.fill({ color: 0xffffff, alpha: 0.45 });
      g.ellipse(s * 0.1, -s * 0.2, s * 0.14, s * 0.12);
      g.fill({ color: 0xffffff, alpha: 0.4 });
      g.circle(-s * 0.28, -s * 0.02, s * 0.09);
      g.fill({ color: 0x2b2620, alpha: 0.9 });
      g.moveTo(s * 0.32, 0);
      g.lineTo(s * 0.46, -s * 0.06);
      g.lineTo(s * 0.44, s * 0.04);
      g.closePath();
      g.fill({ color: 0x2b2620, alpha: 0.95 });
      break;

    case "bug":
      g.ellipse(0, 0, s * 0.4, s * 0.2);
      g.fill({ color: c, alpha: 0.9 });
      g.circle(-s * 0.2, -s * 0.05, s * 0.08);
      g.fill({ color: 0xffffff, alpha: 0.8 });
      g.circle(-s * 0.2, -s * 0.05, s * 0.03);
      g.fill({ color: 0x000000, alpha: 0.8 });
      for (let i = -1; i <= 1; i++) {
        g.moveTo(i * s * 0.1, s * 0.15);
        g.lineTo(i * s * 0.1, s * 0.25);
        g.stroke({ color: 0x000000, alpha: 0.6, width: 2 });
      }
      break;

    case "poison":
      g.circle(0, s * 0.1, s * 0.35);
      g.fill({ color: c, alpha: 0.9 });
      g.rect(-s * 0.1, -s * 0.4, s * 0.2, s * 0.2);
      g.fill({ color: c, alpha: 0.9 });
      g.moveTo(-s * 0.15, -s * 0.4);
      g.lineTo(s * 0.15, -s * 0.4);
      g.stroke({ color: 0x995522, alpha: 0.9, width: 4 });
      g.circle(0, s * 0.15, s * 0.1);
      g.fill({ color: 0x220033, alpha: 0.5 });
      g.moveTo(-s * 0.1, s * 0.05);
      g.lineTo(s * 0.1, s * 0.25);
      g.stroke({ color: 0x220033, alpha: 0.5, width: 3 });
      g.moveTo(s * 0.1, s * 0.05);
      g.lineTo(-s * 0.1, s * 0.25);
      g.stroke({ color: 0x220033, alpha: 0.5, width: 3 });
      break;

    default:
      g.circle(0, 0, s * 0.35);
      g.fill({ color: c, alpha: 0.9 });
      g.circle(-s * 0.08, -s * 0.08, s * 0.06);
      g.fill({ color: 0xffffff, alpha: 0.3 });
  }
}

// ── Draw a heart shape (used by HeartsHUD) ───────────────────────────────────
export function drawHeart(g: Graphics, size: number, color: number, alpha: number) {
  g.clear();
  const s = size;
  g.moveTo(0, s * 0.3);
  g.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s);
  g.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
  g.fill({ color, alpha });
}
