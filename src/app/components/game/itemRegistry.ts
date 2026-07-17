export type ProduceId = "mango" | "strawberry" | "apple" | "pear" | "guava";
export type HazardId = "bee" | "worm" | "rotten";
export type PowerupId = "heart" | "lightning" | "slowTime";
export type ItemId = ProduceId | HazardId | PowerupId;

export type ItemBehavior = "normal" | "heavy" | "sway" | "buzz";
export type ItemShape =
  | "mango"
  | "apple"
  | "pear"
  | "guava"
  | "berry"
  | "bee"
  | "bug"
  | "melon"
  | "heart"
  | "lightning"
  | "hourglass";
export type PowerupEffect = "restoreLife" | "clearHazards" | "slowFall";

interface ItemVisualDefinition {
  id: ItemId;
  name: string;
  color: number;
  glow: number;
  size: number;
  speed: number;
  shape: ItemShape;
  emoji: string;
  behavior: ItemBehavior;
  texturePath: string;
  visualSize: number;
  anchor: { x: number; y: number };
  hitboxScale: number;
  shadowScale: number;
}

export interface ProduceDefinition extends ItemVisualDefinition {
  id: ProduceId;
  category: "produce";
  type: "good";
  canAppearInOrder: true;
}

export interface HazardDefinition extends ItemVisualDefinition {
  id: HazardId;
  category: "hazard";
  type: "bad";
  canAppearInOrder: false;
}

export interface PowerupDefinition extends ItemVisualDefinition {
  id: PowerupId;
  category: "powerup";
  type: "pickup";
  canAppearInOrder: false;
  powerupEffect: PowerupEffect;
}

export type ItemDefinition =
  | ProduceDefinition
  | HazardDefinition
  | PowerupDefinition;

export const PRODUCE_ITEMS: ProduceDefinition[] = [
  {
    id: "mango",
    name: "Xoài",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    color: 0xffcc00,
    glow: 0xffa21a,
    size: 85,
    speed: 0.7,
    shape: "mango",
    emoji: "🥭",
    behavior: "normal",
    texturePath: "/assets/fruits/mango.png",
    visualSize: 102,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.85,
  },
  {
    id: "apple",
    name: "Táo",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    color: 0xf4432f,
    glow: 0xff765f,
    size: 88,
    speed: 0.9,
    shape: "apple",
    emoji: "🍎",
    behavior: "heavy",
    texturePath: "/assets/fruits/apple.png",
    visualSize: 96,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.88,
    shadowScale: 0.9,
  },
  {
    id: "pear",
    name: "Lê",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    color: 0xd9e72f,
    glow: 0xf5ef67,
    size: 82,
    speed: 0.6,
    shape: "pear",
    emoji: "🍐",
    behavior: "sway",
    texturePath: "/assets/fruits/pear.png",
    visualSize: 92,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.92,
    shadowScale: 0.82,
  },
  {
    id: "strawberry",
    name: "Dâu",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    color: 0xe8405e,
    glow: 0xff7d8f,
    size: 74,
    speed: 0.8,
    shape: "berry",
    emoji: "🍓",
    behavior: "normal",
    texturePath: "/assets/fruits/strawberry.png",
    visualSize: 90,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.82,
  },
  {
    id: "guava",
    name: "Ổi",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    color: 0x9fc62e,
    glow: 0xd7ef58,
    size: 90,
    speed: 0.78,
    shape: "guava",
    emoji: "🍈",
    behavior: "heavy",
    texturePath: "/assets/fruits/guava.png",
    visualSize: 98,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.88,
  },
];

export const HAZARD_ITEMS: HazardDefinition[] = [
  {
    id: "bee",
    name: "Ong Đốt",
    category: "hazard",
    type: "bad",
    canAppearInOrder: false,
    color: 0xf3c53c,
    glow: 0xffe580,
    size: 76,
    speed: 1.1,
    shape: "bee",
    emoji: "🐝",
    behavior: "buzz",
    texturePath: "/assets/items/bee.png",
    visualSize: 76,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.8,
  },
  {
    id: "worm",
    name: "Sâu Bọ",
    category: "hazard",
    type: "bad",
    canAppearInOrder: false,
    color: 0x88cc44,
    glow: 0x55aa22,
    size: 70,
    speed: 0.6,
    shape: "bug",
    emoji: "🐛",
    behavior: "sway",
    texturePath: "/assets/items/worm.png",
    visualSize: 70,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.78,
  },
  {
    id: "rotten",
    name: "Quả Hỏng",
    category: "hazard",
    type: "bad",
    canAppearInOrder: false,
    color: 0x8b5a2b,
    glow: 0x5c3a21,
    size: 80,
    speed: 0.7,
    shape: "melon",
    emoji: "🤢",
    behavior: "heavy",
    texturePath: "/assets/items/rotten.png",
    visualSize: 80,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.88,
    shadowScale: 0.85,
  },
];

export const POWERUP_ITEMS: PowerupDefinition[] = [
  {
    id: "heart",
    name: "Tim",
    category: "powerup",
    type: "pickup",
    canAppearInOrder: false,
    powerupEffect: "restoreLife",
    color: 0xe84f66,
    glow: 0xff8fa0,
    size: 72,
    speed: 0.75,
    shape: "heart",
    emoji: "❤️",
    behavior: "normal",
    texturePath: "/assets/items/heart.png",
    visualSize: 72,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.8,
  },
  {
    id: "lightning",
    name: "Sét",
    category: "powerup",
    type: "pickup",
    canAppearInOrder: false,
    powerupEffect: "clearHazards",
    color: 0xffd447,
    glow: 0xfff2a6,
    size: 78,
    speed: 0.9,
    shape: "lightning",
    emoji: "⚡",
    behavior: "sway",
    texturePath: "/assets/items/lightning.png",
    visualSize: 78,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.8,
  },
  {
    id: "slowTime",
    name: "Làm Chậm",
    category: "powerup",
    type: "pickup",
    canAppearInOrder: false,
    powerupEffect: "slowFall",
    color: 0x79c8eb,
    glow: 0xc8f2ff,
    size: 76,
    speed: 0.82,
    shape: "hourglass",
    emoji: "⏳",
    behavior: "sway",
    texturePath: "/assets/items/slow-time.png",
    visualSize: 76,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.92,
    shadowScale: 0.8,
  },
];

export const ITEM_REGISTRY: ItemDefinition[] = [
  ...PRODUCE_ITEMS,
  ...HAZARD_ITEMS,
  ...POWERUP_ITEMS,
];

export const CREATURES = ITEM_REGISTRY;
export type CreatureDef = ItemDefinition;
