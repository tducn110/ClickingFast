export type ItemId =
  | "mango"
  | "strawberry"
  | "apple"
  | "pear"
  | "guava"
  | "bee"
  | "worm"
  | "rotten"
  | "heart"
  | "lightning";

export type ItemCategory = "produce" | "hazard" | "pickup";
export type ItemType = "good" | "bad" | "pickup";
export type ItemBehavior = "normal" | "heavy" | "sway" | "buzz";
export type ItemShape = "mango" | "apple" | "pear" | "guava" | "berry" | "bee" | "bug" | "melon" | "heart" | "lightning";
export type EffectId =
  | "mango_boost"
  | "apple_shield"
  | "pear_fever"
  | "guava_bonus"
  | "strawberry_score"
  | "bee_haste"
  | "worm_bite"
  | "rotten_crash"
  | "heart_restore"
  | "lightning_clear";
export type DrawbackId =
  | "mango_haste"
  | "apple_extra_order"
  | "pear_combo_tight"
  | "strawberry_spawn_worm";

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  type: ItemType;
  canAppearInOrder: boolean;
  baseScore: number;
  effectId: EffectId;
  drawbackId?: DrawbackId;
  color: number;
  glow: number;
  size: number;
  speed: number;
  shape: ItemShape;
  emoji: string;
  behavior: ItemBehavior;
  texturePath: string;
  visualSize: number;
  anchor: {
    x: number;
    y: number;
  };
  hitboxScale: number;
  shadowScale: number;
  spawnWeight: number;
  feedbackKey: string;
}

export const ITEM_REGISTRY: ItemDefinition[] = [
  {
    id: "mango",
    name: "Xoài",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 300,
    effectId: "mango_boost",
    drawbackId: "mango_haste",
    color: 0xffcc00,
    glow: 0xff8800,
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
    spawnWeight: 1,
    feedbackKey: "produce_score",
  },
  {
    id: "apple",
    name: "Táo",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 140,
    effectId: "apple_shield",
    drawbackId: "apple_extra_order",
    color: 0xf4432f,
    glow: 0xff8b4a,
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
    spawnWeight: 1,
    feedbackKey: "produce_shield",
  },
  {
    id: "pear",
    name: "Lê",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 150,
    effectId: "pear_fever",
    drawbackId: "pear_combo_tight",
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
    spawnWeight: 1,
    feedbackKey: "produce_fever",
  },
  {
    id: "strawberry",
    name: "Dâu",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 180,
    effectId: "strawberry_score",
    drawbackId: "strawberry_spawn_worm",
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
    spawnWeight: 1,
    feedbackKey: "produce_score_x2",
  },
  {
    id: "guava",
    name: "Ổi",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 220,
    effectId: "guava_bonus",
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
    spawnWeight: 1,
    feedbackKey: "produce_bonus",
  },
  {
    id: "bee",
    name: "Ong Đốt",
    category: "hazard",
    type: "bad",
    canAppearInOrder: false,
    baseScore: 0,
    effectId: "bee_haste",
    color: 0xf3c53c,
    glow: 0xffe580,
    size: 76,
    speed: 1.1,
    shape: "bee",
    emoji: "🐝",
    behavior: "buzz",
    texturePath: "/items/bee.png",
    visualSize: 76,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.8,
    spawnWeight: 1,
    feedbackKey: "hazard_haste",
  },
  {
    id: "worm",
    name: "Sâu Bọ",
    category: "hazard",
    type: "bad",
    canAppearInOrder: false,
    baseScore: 0,
    effectId: "worm_bite",
    color: 0x88cc44,
    glow: 0x55aa22,
    size: 70,
    speed: 0.6,
    shape: "bug",
    emoji: "🐛",
    behavior: "sway",
    texturePath: "/items/worm.png",
    visualSize: 70,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.78,
    spawnWeight: 1,
    feedbackKey: "hazard_damage_order",
  },
  {
    id: "rotten",
    name: "Quả Hỏng",
    category: "hazard",
    type: "bad",
    canAppearInOrder: false,
    baseScore: 0,
    effectId: "rotten_crash",
    color: 0x8b5a2b,
    glow: 0x5c3a21,
    size: 80,
    speed: 0.7,
    shape: "melon",
    emoji: "🤢",
    behavior: "heavy",
    texturePath: "/items/rotten.png",
    visualSize: 80,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.88,
    shadowScale: 0.85,
    spawnWeight: 1,
    feedbackKey: "hazard_crash",
  },
  {
    id: "heart",
    name: "Tim",
    category: "pickup",
    type: "pickup",
    canAppearInOrder: false,
    baseScore: 100,
    effectId: "heart_restore",
    color: 0xe84f66,
    glow: 0xff8fa0,
    size: 72,
    speed: 0.75,
    shape: "heart",
    emoji: "❤️",
    behavior: "normal",
    texturePath: "/items/heart.png",
    visualSize: 72,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.8,
    spawnWeight: 0.02,
    feedbackKey: "pickup_heart",
  },
  {
    id: "lightning",
    name: "Sét",
    category: "pickup",
    type: "pickup",
    canAppearInOrder: false,
    baseScore: 0,
    effectId: "lightning_clear",
    color: 0xffd447,
    glow: 0xfff2a6,
    size: 78,
    speed: 0.9,
    shape: "lightning",
    emoji: "⚡",
    behavior: "sway",
    texturePath: "/items/lightning.png",
    visualSize: 78,
    anchor: { x: 0.5, y: 0.5 },
    hitboxScale: 0.9,
    shadowScale: 0.8,
    spawnWeight: 0.01,
    feedbackKey: "pickup_lightning",
  },
];

export type CreatureDef = ItemDefinition;

export const CREATURES = ITEM_REGISTRY;
