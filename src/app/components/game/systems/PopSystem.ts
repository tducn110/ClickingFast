import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";

export interface PopLabel {
  text: Text;
  velocityY: number;
  lifeMs: number;
  maxLifeMs: number;
  startScale: number;
  endScale: number;
}

export interface DotParticle {
  graphic: Graphics;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lifeMs: number;
  maxLifeMs: number;
}

export interface ScoreComboFeedback {
  points: number;
  combo: number;
  multiplier: number;
  milestone: boolean;
}

const labelPool: Text[] = [];
const dotPool: Graphics[] = [];
const labelStyleCache = new Map<string, TextStyle>();
const MAX_ACTIVE_LABELS = 10;
const MAX_ACTIVE_DOTS = 48;

function getLabelStyle(color: number, emphasis: "score" | "message" | "milestone") {
  const key = `${color}-${emphasis}`;
  const cached = labelStyleCache.get(key);
  if (cached) return cached;

  const style = new TextStyle({
    fill: color,
    fontSize: emphasis === "milestone" ? 30 : emphasis === "score" ? 24 : 20,
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif",
    fontWeight: "900",
    stroke: { color: 0x55320f, width: emphasis === "milestone" ? 5 : 4 },
    dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.42 },
  });
  labelStyleCache.set(key, style);
  return style;
}

function acquireLabel(value: string, style: TextStyle) {
  const label = labelPool.pop() ?? new Text({ text: value, style });
  label.text = value;
  label.style = style;
  label.visible = true;
  label.alpha = 1;
  label.anchor.set(0.5);
  label.scale.set(1);
  return label;
}

function releaseLabel(label: Text) {
  label.removeFromParent();
  label.visible = false;
  label.alpha = 1;
  label.scale.set(1);
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
  if (dotPool.length < 72) {
    dotPool.push(dot);
  } else {
    dot.destroy();
  }
}

function addLabel(
  app: Application,
  labels: PopLabel[],
  value: string,
  x: number,
  y: number,
  color: number,
  emphasis: "score" | "message" | "milestone",
  layer?: Container,
) {
  while (labels.length >= MAX_ACTIVE_LABELS) {
    const oldest = labels.shift();
    if (oldest) releaseLabel(oldest.text);
  }

  const text = acquireLabel(value, getLabelStyle(color, emphasis));
  const milestone = emphasis === "milestone";
  const startScale = milestone ? 0.62 : 0.82;
  const endScale = milestone ? 1.1 : 1;
  const horizontalPadding = 12;
  const halfWidth = Math.min(
    (text.width * endScale) / 2,
    Math.max(0, app.screen.width / 2 - horizontalPadding),
  );
  const safeX = Math.min(
    app.screen.width - horizontalPadding - halfWidth,
    Math.max(horizontalPadding + halfWidth, x),
  );
  const safeY = Math.min(app.screen.height - 28, Math.max(28, y));
  text.position.set(safeX, safeY);
  text.scale.set(startScale);
  (layer ?? app.stage).addChild(text);
  labels.push({
    text,
    velocityY: milestone ? -0.075 : -0.11,
    lifeMs: milestone ? 1100 : emphasis === "score" ? 850 : 1000,
    maxLifeMs: milestone ? 1100 : emphasis === "score" ? 850 : 1000,
    startScale,
    endScale,
  });
}

export function spawnPopLabel(
  app: Application,
  labels: PopLabel[],
  value: number | string,
  x: number,
  y: number,
  color: number,
  layer?: Container,
) {
  const displayValue = typeof value === "number" ? `+${value}` : value;
  addLabel(app, labels, displayValue, x, y, color, "message", layer);
}

export function spawnScoreComboFeedback(
  app: Application,
  labels: PopLabel[],
  feedback: ScoreComboFeedback,
  x: number,
  y: number,
  color: number,
  layer?: Container,
) {
  const multiplierText = feedback.multiplier > 1 ? ` (${feedback.multiplier}x)` : "";
  addLabel(
    app,
    labels,
    `+${feedback.points}${multiplierText}`,
    x,
    y,
    color,
    feedback.milestone ? "milestone" : "score",
    layer,
  );
}

export function spawnBurst(
  app: Application,
  dots: DotParticle[],
  x: number,
  y: number,
  color: number,
  layer?: Container,
  count = 10,
) {
  const availableSlots = Math.max(0, MAX_ACTIVE_DOTS - dots.length);
  const particleCount = Math.max(0, Math.min(16, count, availableSlots));
  for (let index = 0; index < particleCount; index += 1) {
    const graphic = acquireDot(color);
    (layer ?? app.stage).addChild(graphic);
    const angle = (index / particleCount) * Math.PI * 2;
    const speed = 0.11 + Math.random() * 0.12;
    graphic.position.set(x, y);
    dots.push({
      graphic,
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 0.07,
      lifeMs: 540,
      maxLifeMs: 540,
    });
  }
}

export function updatePopLabels(labels: PopLabel[], deltaMs: number) {
  for (let index = labels.length - 1; index >= 0; index -= 1) {
    const label = labels[index];
    label.lifeMs -= deltaMs;
    label.text.y += label.velocityY * deltaMs;
    label.velocityY *= Math.pow(0.94, deltaMs / 16.67);
    const lifeRatio = Math.max(0, label.lifeMs / label.maxLifeMs);
    const enterProgress = Math.min(1, (1 - lifeRatio) * 5);
    const scale = label.startScale + (label.endScale - label.startScale) * enterProgress;
    label.text.scale.set(scale);
    label.text.alpha = Math.min(1, lifeRatio * 2.5);
    if (label.lifeMs <= 0) {
      releaseLabel(label.text);
      labels.splice(index, 1);
    }
  }
  return labels;
}

export function updateDots(dots: DotParticle[], deltaMs: number) {
  for (let index = dots.length - 1; index >= 0; index -= 1) {
    const particle = dots[index];
    particle.lifeMs -= deltaMs;
    particle.x += particle.velocityX * deltaMs;
    particle.y += particle.velocityY * deltaMs;
    particle.velocityY += 0.00024 * deltaMs;
    const lifeRatio = Math.max(0, particle.lifeMs / particle.maxLifeMs);
    particle.graphic.position.set(particle.x, particle.y);
    particle.graphic.scale.set(lifeRatio);
    particle.graphic.alpha = lifeRatio * 0.9;
    if (particle.lifeMs <= 0) {
      releaseDot(particle.graphic);
      dots.splice(index, 1);
    }
  }
  return dots;
}

export function destroyPopSystem(labels: PopLabel[], dots: DotParticle[]) {
  for (const label of labels) releaseLabel(label.text);
  for (const dot of dots) releaseDot(dot.graphic);
  labels.length = 0;
  dots.length = 0;
}

export function destroyPopPools() {
  for (const label of labelPool) label.destroy();
  for (const dot of dotPool) dot.destroy();
  labelPool.length = 0;
  dotPool.length = 0;
  labelStyleCache.clear();
}
