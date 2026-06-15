import { Graphics, Container, Application } from "pixi.js";
import { WATERLINE_RATIO } from "../constants";

export interface BoatScene {
  container: Container;
  rodLine: Graphics;    // fishing line — updated each frame
  bobber: Graphics;     // bobber at end of line — updated each frame
  rodTipX: number;      // world X of rod tip (for line origin)
  rodTipY: number;
  lineEndX: number;     // where line enters water (updated each frame)
  lineEndY: number;
}

// ── Build the static boat + fisherman; return mutable refs for animated parts ─
export function createBoat(app: Application): BoatScene {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;

  // Boat sits left-of-center
  const bx = W * 0.3;
  const by = wy;

  const container = new Container();
  container.x = bx;
  container.y = by;

  const g = new Graphics();
  container.addChild(g);

  // ── hull ──────────────────────────────────────────────────────────────────
  // main hull body
  g.moveTo(-68, 0);
  g.lineTo(-72, 20);
  g.bezierCurveTo(-70, 34, 70, 34, 72, 20);
  g.lineTo(68, 0);
  g.closePath();
  g.fill({ color: 0x8b4513, alpha: 1 }); // saddle brown wood

  // hull planks (dark stripes)
  for (let i = 1; i <= 2; i++) {
    g.moveTo(-68 + i * 4, i * 7);
    g.lineTo(68 - i * 4, i * 7);
    g.stroke({ color: 0x5c2d0a, alpha: 0.35, width: 1.5 });
  }

  // hull rim / gunwale
  g.moveTo(-68, 0);
  g.lineTo(68, 0);
  g.stroke({ color: 0xc8773a, alpha: 0.9, width: 3 });

  // interior lighter floor
  g.ellipse(0, 10, 58, 14);
  g.fill({ color: 0xa0601a, alpha: 0.5 });

  // ── mast stub (short post for character to sit by) ────────────────────────
  g.rect(-4, -44, 8, 44);
  g.fill({ color: 0x7a5230, alpha: 0.9 });

  // ── Hai nhân vật (Cậu bé áo vàng & Người áo xám) ──────────────────────────
  const boyX = 10;  // Vị trí cậu bé
  const girlX = 45; // Vị trí người áo xám
  const baseY = -2; // Sàn thuyền

  // 1. Vẽ cậu bé áo vàng
  g.roundRect(boyX - 10, baseY - 25, 20, 25, 4); // Thân áo mưa
  g.fill({ color: 0xEED05E, alpha: 1 }); // Vàng mù tạt

  g.circle(boyX, baseY - 35, 10); // Đầu
  g.fill({ color: 0xffccaa, alpha: 1 });

  g.rect(boyX - 5, baseY, 10, 15); // Chân
  g.fill({ color: 0x4A4D4E, alpha: 1 }); // Xám than

  // arm holding rod (extends right and up)
  g.moveTo(boyX + 5, baseY - 15);
  g.lineTo(boyX + 25, baseY - 25);
  g.stroke({ color: 0xEED05E, alpha: 1, width: 5 }); // Cánh tay áo vàng

  // bàn tay
  g.circle(boyX + 25, baseY - 25, 3);
  g.fill({ color: 0xffccaa, alpha: 1 });

  // 2. Vẽ người áo xám
  g.roundRect(girlX - 9, baseY - 28, 18, 28, 4); // Thân áo
  g.fill({ color: 0x666666, alpha: 1 }); // Xám đậm

  g.circle(girlX, baseY - 40, 10); // Đầu
  g.fill({ color: 0x8b5a2b, alpha: 1 }); // Tóc xù tối màu

  g.rect(girlX - 6, baseY, 12, 18); // Chân (quần jean)
  g.fill({ color: 0x3a5f7d, alpha: 1 });

  // ── fishing rod ───────────────────────────────────────────────────────────
  // rod base at hand position, extends upper-right then curves down
  const handX = bx + boyX + 25;
  const handY = by + baseY - 25;

  // rod stick (3 segments for slight arc)
  const rodG = new Graphics();
  const rodLen = 130;
  const rodEndX = handX + rodLen * 0.78;
  const rodEndY = handY - rodLen * 0.5;
  rodG.moveTo(handX, handY);
  rodG.quadraticCurveTo(handX + rodLen * 0.5, handY - rodLen * 0.35, rodEndX, rodEndY);
  rodG.stroke({ color: 0x5c3a10, alpha: 1, width: 4 });
  // rod tip highlight
  rodG.circle(rodEndX, rodEndY, 2.5);
  rodG.fill({ color: 0xffd700, alpha: 0.9 });

  // fishing line (animated) — separate Graphics added to stage (not container)
  const rodLine = new Graphics();
  const bobber = new Graphics();

  // store tip world coords so caller can draw the line each frame
  const rodTipX = rodEndX;
  const rodTipY = rodEndY;
  const lineEndX = rodEndX + 40;
  const lineEndY = wy + 60;

  app.stage.addChild(container);
  app.stage.addChild(rodG);
  app.stage.addChild(rodLine);
  app.stage.addChild(bobber);

  return { container, rodLine, bobber, rodTipX, rodTipY, lineEndX, lineEndY };
}

// ── Animate the fishing line + bobber each frame ──────────────────────────────
export function updateBoat(scene: BoatScene, H: number, elapsed: number) {
  const t = elapsed * 0.001;
  const wy = H * WATERLINE_RATIO;

  // bobber bobs on the water surface
  const bobberX = scene.rodTipX + 55 + Math.sin(t * 1.1) * 6;
  const bobberY = wy + 2 + Math.sin(t * 2.3) * 2.5;

  scene.lineEndX = bobberX;
  scene.lineEndY = bobberY;

  // draw fishing line (slight catenary droop)
  scene.rodLine.clear();
  const midX = (scene.rodTipX + bobberX) / 2 + Math.sin(t * 0.7) * 4;
  const midY = (scene.rodTipY + bobberY) / 2 + 18;
  scene.rodLine.moveTo(scene.rodTipX, scene.rodTipY);
  scene.rodLine.quadraticCurveTo(midX, midY, bobberX, bobberY);
  scene.rodLine.stroke({ color: 0xddddcc, alpha: 0.7, width: 1 });

  // draw bobber
  scene.bobber.clear();
  // float white top
  scene.bobber.ellipse(bobberX, bobberY - 3, 4, 3);
  scene.bobber.fill({ color: 0xffffff, alpha: 0.95 });
  // float red bottom
  scene.bobber.ellipse(bobberX, bobberY + 3, 4, 3);
  scene.bobber.fill({ color: 0xff2222, alpha: 0.95 });
  // center ring
  scene.bobber.circle(bobberX, bobberY, 0.8);
  scene.bobber.fill({ color: 0x333333, alpha: 0.9 });

  // gentle boat bob (move container Y slightly)
  scene.container.y = H * WATERLINE_RATIO + Math.sin(t * 1.4) * 2;
}
