export type ItemId =
  | "mango"
  | "pumpkin"
  | "peanut"
  | "strawberry"
  | "bee"
  | "worm"
  | "rotten";

export type ItemCategory = "produce" | "hazard";
export type ItemType = "good" | "bad";
export type ItemBehavior = "normal" | "heavy" | "sway" | "buzz";
export type ItemShape = "mango" | "pumpkin" | "peanut" | "berry" | "bee" | "bug" | "melon";
export type EffectId =
  | "mango_boost"
  | "pumpkin_shield"
  | "peanut_fever"
  | "strawberry_score"
  | "bee_haste"
  | "worm_bite"
  | "rotten_crash";
export type DrawbackId =
  | "mango_haste"
  | "pumpkin_extra_order"
  | "peanut_combo_tight"
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
  },
  {
    id: "pumpkin",
    name: "Bí Đỏ",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 140,
    effectId: "pumpkin_shield",
    drawbackId: "pumpkin_extra_order",
    color: 0xff8833,
    glow: 0xdd6611,
    size: 95,
    speed: 0.9,
    shape: "pumpkin",
    emoji: "🎃",
    behavior: "heavy",
  },
  {
    id: "peanut",
    name: "Đậu Phộng",
    category: "produce",
    type: "good",
    canAppearInOrder: true,
    baseScore: 150,
    effectId: "peanut_fever",
    drawbackId: "peanut_combo_tight",
    color: 0xf0b840,
    glow: 0xd99820,
    size: 65,
    speed: 0.6,
    shape: "peanut",
    emoji: "🥜",
    behavior: "sway",
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
  },
];

export type CreatureDef = ItemDefinition;

export const CREATURES = ITEM_REGISTRY;
