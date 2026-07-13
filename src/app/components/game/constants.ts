export const MAX_MISSES = 5;
export const GROUND_RATIO = 0.32;
export const GROUND_TOP = 0xc8d68a;
export const GROUND_DEEP = 0x4c6630;
export const WATERLINE_RATIO = 1 - GROUND_RATIO;
export const WATER_SURF = GROUND_TOP;
export const WATER_DEEP = GROUND_DEEP;
export const SKY_TOP = 0xf5ecd7;

export const TARGETS = [
  // Good targets
  { id: "mango",   name: "Xoài",      color: 0xffcc00, glow: 0xff8800, points: 100, size: 85, speed: 0.7, shape: "mango", type: "good", emoji: "🥭" },
  { id: "pumpkin", name: "Bí Đỏ",     color: 0xff8833, glow: 0xdd6611, points: 70,  size: 95, speed: 0.4, shape: "pumpkin", type: "good", emoji: "🎃" },
  { id: "peanut",  name: "Đậu Phộng", color: 0xf0b840, glow: 0xd99820, points: 150, size: 65, speed: 0.9, shape: "peanut", type: "good", emoji: "🥜" },
  
  // Bad targets
  { id: "worm",    name: "Sâu Bọ",    color: 0x88cc44, glow: 0x55aa22, points: 0,   size: 70, speed: 0.6, shape: "bug", type: "bad", emoji: "🐛" },
  { id: "rotten",  name: "Quả Hỏng",  color: 0x8b5a2b, glow: 0x5c3a21, points: 0,   size: 80, speed: 0.7, shape: "melon", type: "bad", emoji: "🤢" },
] as const;

export type TargetDef = typeof TARGETS[number];
export const CREATURES = TARGETS; // Compatibility alias
export type CreatureDef = TargetDef;

