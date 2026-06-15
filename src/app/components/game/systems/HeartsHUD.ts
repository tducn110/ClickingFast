import { Graphics, Container, Application } from "pixi.js";
import { MAX_MISSES } from "../constants";
import { drawHeart } from "../drawCreature";

export interface HeartsHUD {
  container: Container;
  hearts: Graphics[];
}

// ── Create heart HUD in top-right of the PixiJS stage ────────────────────────
export function createHeartsHUD(app: Application): HeartsHUD {
  const W = app.screen.width;
  const container = new Container();
  const hearts: Graphics[] = [];
  const spacing = 34;
  const startX = W - MAX_MISSES * spacing - 12;
  const y = 28;

  for (let i = 0; i < MAX_MISSES; i++) {
    const hg = new Graphics();
    hg.x = startX + i * spacing;
    hg.y = y;
    drawHeart(hg, 14, 0xff3355, 0.9);
    container.addChild(hg);
    hearts.push(hg);
  }

  app.stage.addChild(container);
  return { container, hearts };
}

// ── Redraw hearts to reflect current miss count ───────────────────────────────
export function updateHearts(hud: HeartsHUD, misses: number) {
  for (let i = 0; i < MAX_MISSES; i++) {
    const alive = i < MAX_MISSES - misses;
    drawHeart(hud.hearts[i], 14, alive ? 0xff3355 : 0x334455, alive ? 0.9 : 0.28);
  }
}
