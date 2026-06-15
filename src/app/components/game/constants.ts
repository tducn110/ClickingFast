// ── Shared game constants ─────────────────────────────────────────────────────

export const MAX_MISSES = 5;
export const WATERLINE_RATIO = 0.44; // fraction of screen height where water surface sits

// Palette — dusk fishing scene
export const SKY_TOP    = 0x1a0533; // deep indigo (borrowed from design system hero)
export const SKY_MID    = 0x5c1a6e; // purple dusk
export const SKY_HOR    = 0xd4601a; // warm orange horizon
export const WATER_SURF = 0x1a4a6e; // dark teal surface
export const WATER_DEEP = 0x000d1a; // near-black deep ocean

export const CREATURES = [
  { name: "Jellyfish",  color: 0xff88cc, glow: 0xff44aa, points: 10,  size: 36, speed: 1.8, shape: "jelly"  },
  { name: "Clownfish",  color: 0xff6600, glow: 0xffaa00, points: 15,  size: 30, speed: 2.2, shape: "fish"   },
  { name: "Seahorse",   color: 0xffdd00, glow: 0xffaa00, points: 30,  size: 28, speed: 2.8, shape: "horse"  },
  { name: "Octopus",    color: 0xcc44ff, glow: 0xaa00ff, points: 40,  size: 38, speed: 1.5, shape: "octo"   },
  { name: "Blue Whale", color: 0x44aaff, glow: 0x0066ff, points: 80,  size: 52, speed: 1.0, shape: "whale"  },
  { name: "Sea Turtle", color: 0x44cc88, glow: 0x00aa44, points: 35,  size: 34, speed: 2.0, shape: "turtle" },
  { name: "Anglerfish", color: 0xff4444, glow: 0xff0000, points: 100, size: 32, speed: 3.5, shape: "angler" },
  { name: "Starfish",   color: 0xffcc00, glow: 0xff8800, points: 20,  size: 32, speed: 2.5, shape: "star"   },
  { name: "Dolphin",    color: 0x66ccff, glow: 0x00aaff, points: 50,  size: 46, speed: 1.2, shape: "whale"  },
] as const;

export type CreatureDef = typeof CREATURES[number];
