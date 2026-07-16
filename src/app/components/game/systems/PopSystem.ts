import { Container, Graphics, Text, TextStyle, Application } from "pixi.js";

interface PopLabel {
  t: Text;
  vy: number;
  life: number;
  maxLife: number;
}

interface DotParticle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const labelPool: Text[] = [];
const dotPool: Graphics[] = [];
const labelStyleCache = new Map<string, TextStyle>();

function getLabelStyle(color: number, numeric: boolean) {
  const key = `${color}-${numeric ? "number" : "message"}`;
  const cached = labelStyleCache.get(key);
  if (cached) return cached;

  const style = new TextStyle({
    fill: color,
    fontSize: numeric ? 22 : 20,
    fontFamily: "monospace",
    fontWeight: "700",
    dropShadow: { color: 0x000000, blur: 6, distance: 2, alpha: 0.6 },
  });
  labelStyleCache.set(key, style);
  return style;
}

function acquireLabel(text: string, style: TextStyle) {
  const label = labelPool.pop() ?? new Text({ text, style });
  label.text = text;
  label.style = style;
  label.visible = true;
  label.alpha = 1;
  label.anchor.set(0.5);
  return label;
}

function releaseLabel(label: Text) {
  label.removeFromParent();
  label.visible = false;
  label.alpha = 1;
  if (labelPool.length < 24) {
    labelPool.push(label);
  } else {
    label.destroy();
  }
}

function acquireDot(color: number) {
  const dot = dotPool.pop() ?? new Graphics().circle(0, 0, 3.5).fill(0xffffff);
  dot.visible = true;
  dot.alpha = 0.9;
  dot.tint = color;
  dot.scale.set(1);
  return dot;
}

function releaseDot(dot: Graphics) {
  dot.removeFromParent();
  dot.visible = false;
  dot.alpha = 1;
  dot.scale.set(1);
  if (dotPool.length < 96) {
    dotPool.push(dot);
  } else {
    dot.destroy();
  }
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
  const numeric = typeof value === "number";
  const textStr = typeof value === "number" ? `+${value}` : value;
  const t = acquireLabel(textStr, getLabelStyle(color, numeric));
  t.anchor.set(0.5, 0.5);
  t.x = x; t.y = y;
  (layer ?? app.stage).addChild(t);
  const life = numeric ? 55 : 80;
  labels.push({ t, vy: -2.2, life, maxLife: life });
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
    const g = acquireDot(color);
    (layer ?? app.stage).addChild(g);
    const angle = (i / 12) * Math.PI * 2;
    const speed = 1.8 + Math.random() * 2.2;
    g.position.set(x, y);
    dots.push({
      g, x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: 32, maxLife: 32,
    });
  }
}

// ── Update pop labels each frame; returns filtered array ─────────────────────
export function updatePopLabels(labels: PopLabel[]): PopLabel[] {
  return labels.filter(p => {
    p.life--;
    p.t.y += p.vy;
    p.vy *= 0.94;
    p.t.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) { releaseLabel(p.t); return false; }
    return true;
  });
}

// ── Update dot particles each frame; returns filtered array ──────────────────
export function updateDots(dots: DotParticle[]): DotParticle[] {
  return dots.filter(p => {
    p.life--;
    p.x += p.vx; p.y += p.vy; p.vy += 0.07;
    const a = p.life / p.maxLife;
    p.g.position.set(p.x, p.y);
    p.g.scale.set(Math.max(0, a));
    p.g.alpha = Math.max(0, a * 0.9);
    if (p.life <= 0) { releaseDot(p.g); return false; }
    return true;
  });
}

// ── Destroy all pop effects ───────────────────────────────────────────────────
export function destroyPopSystem(labels: PopLabel[], dots: DotParticle[]) {
  for (const p of labels) releaseLabel(p.t);
  for (const p of dots) releaseDot(p.g);
  labels.length = 0;
  dots.length = 0;
}
