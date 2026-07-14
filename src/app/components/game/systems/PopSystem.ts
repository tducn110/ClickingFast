import { Container, Graphics, Text, TextStyle, Application } from "pixi.js";

interface PopLabel {
  t: Text;
  vy: number;
  life: number;
}

interface DotParticle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
}

// ── Spawn a floating text label at canvas coords ───────────────────────
export function spawnPopLabel(
  app: Application,
  labels: PopLabel[],
  value: number | string,
  x: number,
  y: number,
  color: number,
  layer?: Container,
) {
  const style = new TextStyle({
    fill: color,
    fontSize: typeof value === 'number' ? 22 : 20,
    fontFamily: "monospace",
    fontWeight: "700",
    dropShadow: { color: 0x000000, blur: 6, distance: 2, alpha: 0.6 },
  });
  const textStr = typeof value === 'number' ? `+${value}` : value;
  const t = new Text({ text: textStr, style });
  t.anchor.set(0.5, 0.5);
  t.x = x; t.y = y;
  (layer ?? app.stage).addChild(t);
  labels.push({ t, vy: -2.2, life: typeof value === 'number' ? 55 : 80 });
}

// ── Spawn colored dot burst at coords ─────────────────────────────────────────
export function spawnBurst(
  app: Application,
  dots: DotParticle[],
  x: number,
  y: number,
  color: number,
  layer?: Container,
) {
  for (let i = 0; i < 12; i++) {
    const g = new Graphics();
    (layer ?? app.stage).addChild(g);
    const angle = (i / 12) * Math.PI * 2;
    const speed = 1.8 + Math.random() * 2.2;
    dots.push({
      g, x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: 32, maxLife: 32, color,
    });
  }
}

// ── Update pop labels each frame; returns filtered array ─────────────────────
export function updatePopLabels(labels: PopLabel[]): PopLabel[] {
  return labels.filter(p => {
    p.life--;
    p.t.y += p.vy;
    p.vy *= 0.94;
    p.t.alpha = p.life / 55;
    if (p.life <= 0) { p.t.destroy(); return false; }
    return true;
  });
}

// ── Update dot particles each frame; returns filtered array ──────────────────
export function updateDots(dots: DotParticle[]): DotParticle[] {
  return dots.filter(p => {
    p.life--;
    p.x += p.vx; p.y += p.vy; p.vy += 0.07;
    const a = p.life / p.maxLife;
    p.g.clear();
    p.g.circle(p.x, p.y, 3.5 * a);
    p.g.fill({ color: p.color, alpha: a * 0.9 });
    if (p.life <= 0) { p.g.destroy(); return false; }
    return true;
  });
}

// ── Destroy all pop effects ───────────────────────────────────────────────────
export function destroyPopSystem(labels: PopLabel[], dots: DotParticle[]) {
  for (const p of labels) p.t.destroy();
  for (const p of dots) p.g.destroy();
  labels.length = 0;
  dots.length = 0;
}
