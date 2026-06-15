import { Graphics, Application } from "pixi.js";
import { WATERLINE_RATIO, SKY_TOP } from "../constants";

// ── Static pastel sky + sun ──────────────────────────────────────────────────
export function createSky(app: Application): Graphics {
  const g = new Graphics();
  const W = app.screen.width;
  const H = app.screen.height;
  const horizonY = H * WATERLINE_RATIO;

  // Sky gradient
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const y = horizonY * (i / steps);
    const h = horizonY / steps + 1;
    
    const r1 = (SKY_TOP >> 16) & 0xff;
    const g1 = (SKY_TOP >> 8) & 0xff;
    const b1 = SKY_TOP & 0xff;
    
    // Bottom of sky is a slightly warmer, peachy off-white
    const r2 = 0xff;
    const g2 = 0xee;
    const b2 = 0xdd;
    
    const t = i / steps;
    const r = Math.round(r1 + (r2 - r1) * t);
    const gv = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    g.rect(0, y, W, h);
    g.fill({ color: (r << 16) | (gv << 8) | b, alpha: 1 });
  }

  // Gentle Sun
  const sunX = W * 0.82;
  const sunY = H * 0.22;
  
  // Sun glow
  g.circle(sunX, sunY, 50);
  g.fill({ color: 0xffffff, alpha: 0.15 });
  g.circle(sunX, sunY, 35);
  g.fill({ color: 0xffffff, alpha: 0.3 });
  
  // Sun core
  g.circle(sunX, sunY, 20);
  g.fill({ color: 0xfffdf0, alpha: 0.95 });

  // Warm horizon glow (light strip above water)
  g.rect(0, horizonY - 14, W, 14);
  g.fill({ color: 0xfff5e6, alpha: 0.4 });

  // Distant hills / landmass (left side) - softened to match pastel theme
  g.moveTo(0, horizonY);
  g.lineTo(0, horizonY - 28);
  g.bezierCurveTo(W * 0.04, horizonY - 52, W * 0.1, horizonY - 60, W * 0.18, horizonY - 44);
  g.bezierCurveTo(W * 0.24, horizonY - 34, W * 0.28, horizonY - 18, W * 0.34, horizonY - 10);
  g.lineTo(W * 0.34, horizonY);
  g.closePath();
  g.fill({ color: 0xaaccd4, alpha: 0.8 }); // Pastel hill color

  return g;
}
