import { Graphics, Container, Application } from "pixi.js";
import { WATERLINE_RATIO } from "../constants";

export interface BoatScene {
  container: Container;
  armContainer: Container;
  localRodTipX: number;
  localRodTipY: number;
  rodLine: Graphics;
  bobber: Graphics;
  rodTipX: number;
  rodTipY: number;
  lineEndX: number;
  lineEndY: number;
  catchTime: number;
  triggerCatch: () => void;
}

/**
 * Big peanut mascot (Lạc Lạc) standing on the ground mound, looking UP at the sky.
 * Occupies the bottom portion of the screen.
 */
export function createBoat(app: Application): BoatScene {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;

  // Center on the ground mound
  const container = new Container();
  container.x = W * 0.5;
  container.y = wy + (H - wy) * 0.52;

  const g = new Graphics();
  container.addChild(g);

  // ── Shadow ──
  g.ellipse(0, 44, 30, 8);
  g.fill({ color: 0x4a2a10, alpha: 0.22 });

  // ── Body (large peanut — two lobes) ──
  const bodyScale = 1.4;
  g.ellipse(-6 * bodyScale, 0, 18 * bodyScale, 28 * bodyScale);
  g.fill({ color: 0xf0b840, alpha: 0.95 });
  g.ellipse(6 * bodyScale, 0, 18 * bodyScale, 28 * bodyScale);
  g.fill({ color: 0xf0b840, alpha: 0.95 });
  // Waist
  g.ellipse(0, 0, 7, 16 * bodyScale);
  g.fill({ color: 0xd99820, alpha: 0.4 });

  // Texture lines
  for (let i = -2; i <= 2; i++) {
    g.moveTo(-20 * bodyScale, i * 9 * bodyScale);
    g.lineTo(20 * bodyScale, i * 9 * bodyScale);
    g.stroke({ color: 0x8e4e22, alpha: 0.25, width: 1.2 });
  }

  // ── Head (tilted UP — looking at sky) ──
  const headX = 0;
  const headY = -32 * bodyScale;
  g.ellipse(headX, headY, 14 * bodyScale, 15 * bodyScale);
  g.fill({ color: 0xf0b840, alpha: 0.95 });

  // Eyes — positioned higher (looking up)
  const eyeY = headY - 5;
  g.circle(-5, eyeY, 2.8); g.fill({ color: 0x2b2620, alpha: 0.9 });
  g.circle(5, eyeY, 2.8); g.fill({ color: 0x2b2620, alpha: 0.9 });
  // Eye shine — placed at top of eye (looking up effect)
  g.circle(-4.5, eyeY - 0.8, 1); g.fill({ color: 0xffffff, alpha: 0.85 });
  g.circle(5.5, eyeY - 0.8, 1); g.fill({ color: 0xffffff, alpha: 0.85 });

  // Happy mouth
  g.moveTo(-3.5, headY + 4); g.quadraticCurveTo(0, headY + 8, 3.5, headY + 4);
  g.stroke({ color: 0x2b2620, alpha: 0.55, width: 1.4 });

  // Blush
  g.circle(-8, headY + 2, 4); g.fill({ color: 0xe87432, alpha: 0.18 });
  g.circle(8, headY + 2, 4); g.fill({ color: 0xe87432, alpha: 0.18 });

  // ── Arms reaching UP toward sky ──
  g.moveTo(-15 * bodyScale, -8 * bodyScale);
  g.lineTo(-25 * bodyScale, -35 * bodyScale);
  g.stroke({ color: 0xf0b840, alpha: 0.75, width: 5 });
  // Little hands
  g.circle(-25 * bodyScale, -36 * bodyScale, 4);
  g.fill({ color: 0xf0b840, alpha: 0.85 });

  g.moveTo(15 * bodyScale, -8 * bodyScale);
  g.lineTo(25 * bodyScale, -38 * bodyScale);
  g.stroke({ color: 0xf0b840, alpha: 0.75, width: 5 });
  g.circle(25 * bodyScale, -39 * bodyScale, 4);
  g.fill({ color: 0xf0b840, alpha: 0.85 });

  // ── Feet ──
  g.ellipse(-8 * bodyScale, 28 * bodyScale, 8, 5);
  g.fill({ color: 0xd99820, alpha: 0.8 });
  g.ellipse(8 * bodyScale, 28 * bodyScale, 8, 5);
  g.fill({ color: 0xd99820, alpha: 0.8 });

  // ── Little tail/hat (nón lá mini) ──
  g.ellipse(0, headY - 16 * bodyScale, 12, 5);
  g.fill({ color: 0xd4a85c, alpha: 0.6 });
  g.moveTo(-10, headY - 15 * bodyScale); g.lineTo(0, headY - 22 * bodyScale); g.lineTo(10, headY - 15 * bodyScale);
  g.closePath();
  g.fill({ color: 0xd4a85c, alpha: 0.5 });
  g.stroke({ color: 0x8e6e3a, alpha: 0.4, width: 1 });

  const armContainer = new Container();
  container.addChild(armContainer);
  const rodLine = new Graphics();
  container.addChild(rodLine);
  const bobber = new Graphics();
  container.addChild(bobber);

  return {
    container, armContainer,
    localRodTipX: 0, localRodTipY: 0,
    rodLine, bobber,
    rodTipX: 0, rodTipY: 0,
    lineEndX: 0, lineEndY: 0,
    catchTime: 0,
    triggerCatch: () => {},
  };
}

export function updateBoat(scene: BoatScene, H: number, elapsed: number) {
  const t = elapsed * 0.001;
  const wy = H * WATERLINE_RATIO;
  // Gentle bounce + slight arm wave
  scene.container.y = wy + (H - wy) * 0.52 + Math.sin(t * 2.2) * 3;
  // Subtle body sway
  scene.container.rotation = Math.sin(t * 1.5) * 0.02;
}
