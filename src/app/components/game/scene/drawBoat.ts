import { Graphics, Container, Application, Point } from "pixi.js";
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
  catchTime: number; // For animation
  triggerCatch: () => void;
}

export function createBoat(app: Application): BoatScene {
  const W = app.screen.width;
  const H = app.screen.height;
  const wy = H * WATERLINE_RATIO;

  const bx = W * 0.3;
  const by = wy;

  const container = new Container();
  container.x = bx;
  container.y = by;

  const g = new Graphics();
  container.addChild(g);

  // hull
  g.moveTo(-68, 0);
  g.lineTo(-72, 20);
  g.bezierCurveTo(-70, 34, 70, 34, 72, 20);
  g.lineTo(68, 0);
  g.closePath();
  g.fill({ color: 0x8b4513, alpha: 1 });

  for (let i = 1; i <= 2; i++) {
    g.moveTo(-68 + i * 4, i * 7);
    g.lineTo(68 - i * 4, i * 7);
    g.stroke({ color: 0x5c2d0a, alpha: 0.35, width: 1.5 });
  }

  g.moveTo(-68, 0);
  g.lineTo(68, 0);
  g.stroke({ color: 0xc8773a, alpha: 0.9, width: 3 });

  g.ellipse(0, 10, 58, 14);
  g.fill({ color: 0xa0601a, alpha: 0.5 });

  g.rect(-4, -44, 8, 44);
  g.fill({ color: 0x7a5230, alpha: 0.9 });

  const boyX = 10;
  const girlX = 45;
  const baseY = -2;

  // Boy body
  g.roundRect(boyX - 10, baseY - 25, 20, 25, 4);
  g.fill({ color: 0xEED05E, alpha: 1 });
  g.circle(boyX, baseY - 35, 10);
  g.fill({ color: 0xffccaa, alpha: 1 });

  // Girl body
  g.roundRect(girlX - 9, baseY - 28, 18, 28, 4);
  g.fill({ color: 0x666666, alpha: 1 });
  g.circle(girlX, baseY - 40, 10);
  g.fill({ color: 0x8b5a2b, alpha: 1 });

  // --- Animated Arm & Rod ---
  const armContainer = new Container();
  armContainer.x = boyX + 5;
  armContainer.y = baseY - 15;

  const armG = new Graphics();
  armG.moveTo(0, 0);
  armG.lineTo(20, -10);
  armG.stroke({ color: 0xEED05E, alpha: 1, width: 5 });
  armG.circle(20, -10, 3);
  armG.fill({ color: 0xffccaa, alpha: 1 });
  armContainer.addChild(armG);

  const rodG = new Graphics();
  const rodLen = 130;
  const localRodTipX = 20 + rodLen * 0.78;
  const localRodTipY = -10 - rodLen * 0.5;
  rodG.moveTo(20, -10);
  rodG.quadraticCurveTo(20 + rodLen * 0.5, -10 - rodLen * 0.35, localRodTipX, localRodTipY);
  rodG.stroke({ color: 0x5c3a10, alpha: 1, width: 4 });
  rodG.circle(localRodTipX, localRodTipY, 2.5);
  rodG.fill({ color: 0xffd700, alpha: 0.9 });
  armContainer.addChild(rodG);
  
  container.addChild(armContainer);

  const rodLine = new Graphics();
  const bobber = new Graphics();

  app.stage.addChild(container);
  app.stage.addChild(rodLine);
  app.stage.addChild(bobber);

  const scene: BoatScene = {
    container,
    armContainer,
    localRodTipX,
    localRodTipY,
    rodLine,
    bobber,
    rodTipX: 0,
    rodTipY: 0,
    lineEndX: 0,
    lineEndY: 0,
    catchTime: 0,
    triggerCatch: () => {
      scene.catchTime = 1;
    }
  };

  return scene;
}

export function updateBoat(scene: BoatScene, H: number, elapsed: number) {
  const t = elapsed * 0.001;
  const wy = H * WATERLINE_RATIO;

  // Animation logic
  if (scene.catchTime > 0) {
    scene.catchTime -= 0.05; // speed of animation
    if (scene.catchTime < 0) scene.catchTime = 0;
  }
  
  // catchTime goes 1 -> 0. We want a quick jerk up, then settle.
  // We can use a sine wave or simple math: 
  // angle = sin(catchTime * PI) * negative_value (to rotate upwards)
  const angle = Math.sin(scene.catchTime * Math.PI) * -0.6;
  scene.armContainer.rotation = angle;

  // Calculate global rod tip position
  const tipGlobal = scene.armContainer.toGlobal(new Point(scene.localRodTipX, scene.localRodTipY));
  scene.rodTipX = tipGlobal.x;
  scene.rodTipY = tipGlobal.y;

  // bobber bobs on the water surface
  const bobberX = scene.container.x + scene.armContainer.x + scene.localRodTipX + 35 + Math.sin(t * 1.1) * 6;
  const bobberY = wy + 2 + Math.sin(t * 2.3) * 2.5;

  scene.lineEndX = bobberX;
  scene.lineEndY = bobberY;

  scene.rodLine.clear();
  const midX = (scene.rodTipX + bobberX) / 2 + Math.sin(t * 0.7) * 4;
  const midY = (scene.rodTipY + bobberY) / 2 + 18;
  scene.rodLine.moveTo(scene.rodTipX, scene.rodTipY);
  scene.rodLine.quadraticCurveTo(midX, midY, bobberX, bobberY);
  scene.rodLine.stroke({ color: 0xddddcc, alpha: 0.7, width: 1 });

  scene.bobber.clear();
  scene.bobber.ellipse(bobberX, bobberY - 3, 4, 3);
  scene.bobber.fill({ color: 0xffffff, alpha: 0.95 });
  scene.bobber.ellipse(bobberX, bobberY + 3, 4, 3);
  scene.bobber.fill({ color: 0xff2222, alpha: 0.95 });
  scene.bobber.circle(bobberX, bobberY, 0.8);
  scene.bobber.fill({ color: 0x333333, alpha: 0.9 });

  // gentle boat bob
  scene.container.y = H * WATERLINE_RATIO + Math.sin(t * 1.4) * 2;
}
