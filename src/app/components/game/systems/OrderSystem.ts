import { Container, Text, TextStyle, Graphics, Application } from "pixi.js";
import { TARGETS } from "../constants";

export interface OrderItem {
  id: string;
  emoji: string;
  required: number;
  collected: number;
}

export interface Order {
  items: OrderItem[];
  timeLimitMs: number;
  timeRemainingMs: number;
}

export function generateOrder(gameTimeSecs: number): Order {
  const goodTargets = TARGETS.filter(t => t.type === "good");
  
  let numTypes = 1;
  let totalItems = 2;
  
  if (gameTimeSecs < 30) {
    numTypes = Math.random() < 0.5 ? 1 : 2;
    totalItems = Math.floor(Math.random() * 2) + 2; // 2 to 3
  } else if (gameTimeSecs < 60) {
    numTypes = 2;
    totalItems = Math.floor(Math.random() * 2) + 3; // 3 to 4
  } else {
    numTypes = Math.random() < 0.3 ? 2 : 3;
    totalItems = Math.floor(Math.random() * 2) + 4; // 4 to 5
  }

  const shuffled = [...goodTargets].sort(() => Math.random() - 0.5);
  const selectedTypes = shuffled.slice(0, numTypes);
  
  const items: OrderItem[] = selectedTypes.map(t => ({
    id: t.id!,
    emoji: t.emoji!,
    required: 1,
    collected: 0
  }));
  
  let remaining = totalItems - numTypes;
  while (remaining > 0) {
    const idx = Math.floor(Math.random() * items.length);
    items[idx].required += 1;
    remaining -= 1;
  }

  return {
    items,
    timeLimitMs: 15000,
    timeRemainingMs: 15000
  };
}

export interface OrderHUD {
  container: Container;
  bg: Graphics;
  title: Text;
  itemsContainer: Container;
  timerBar: Graphics;
  timerBg: Graphics;
}

export function createOrderHUD(app: Application): OrderHUD {
  const container = new Container();
  
  // Positioned below the Score HUD
  container.x = 16;
  container.y = 80;
  
  const bg = new Graphics();
  container.addChild(bg);
  
  const title = new Text({
    text: "ĐƠN HÀNG",
    style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: "Be Vietnam Pro", fontWeight: "bold" })
  });
  title.x = 10;
  title.y = 10;
  container.addChild(title);
  
  const itemsContainer = new Container();
  itemsContainer.x = 10;
  itemsContainer.y = 35;
  container.addChild(itemsContainer);
  
  const timerBg = new Graphics();
  container.addChild(timerBg);
  
  const timerBar = new Graphics();
  container.addChild(timerBar);
  
  app.stage.addChild(container);
  
  return { container, bg, title, itemsContainer, timerBar, timerBg };
}

export function updateOrderHUD(hud: OrderHUD, order: Order | null) {
  if (!order) {
    hud.container.visible = false;
    return;
  }
  hud.container.visible = true;
  
  hud.itemsContainer.removeChildren();
  
  let currentY = 0;
  for (const item of order.items) {
    const text = new Text({
      text: `${item.emoji} × ${item.required - item.collected}`,
      style: new TextStyle({ 
        fill: item.collected >= item.required ? 0x88ff88 : 0xffffff, 
        fontSize: 20, 
        fontFamily: "Be Vietnam Pro",
        fontWeight: "bold"
      })
    });
    text.y = currentY;
    hud.itemsContainer.addChild(text);
    currentY += 30;
  }
  
  const contentHeight = currentY + 45;
  const contentWidth = 140;
  
  hud.bg.clear();
  hud.bg.roundRect(0, 0, contentWidth, contentHeight, 10);
  hud.bg.fill({ color: 0x000000, alpha: 0.6 });
  
  // Timer bar
  const ratio = order.timeRemainingMs / order.timeLimitMs;
  hud.timerBg.clear();
  hud.timerBg.rect(10, contentHeight - 15, contentWidth - 20, 5);
  hud.timerBg.fill({ color: 0x555555 });
  
  hud.timerBar.clear();
  const barColor = ratio > 0.3 ? 0x44ff44 : 0xff4444;
  hud.timerBar.rect(10, contentHeight - 15, (contentWidth - 20) * Math.max(0, ratio), 5);
  hud.timerBar.fill({ color: barColor });
}
