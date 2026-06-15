// ── Shared game constants ─────────────────────────────────────────────────────

export const MAX_MISSES = 5;
export const WATERLINE_RATIO = 0.44; // fraction of screen height where water surface sits

// Palette — Pastel Serenity scene
export const SKY_TOP    = 0xeef6f9; // off-white pastel sky
export const WATER_SURF = 0x88d4e0; // light pastel cyan/blue surface
export const WATER_DEEP = 0x2b8a9e; // calm deeper blue, not black

export const CREATURES = [
  // Sorted conceptually by size (smallest to largest)
  { name: "Seahorse",   color: 0xffdd00, glow: 0xffaa00, points: 100, size: 28, speed: 2.8, shape: "horse"  },
  { name: "Clownfish",  color: 0xff6600, glow: 0xffaa00, points: 90,  size: 30, speed: 2.2, shape: "fish"   },
  { name: "Anglerfish", color: 0xff4444, glow: 0xff0000, points: 80,  size: 32, speed: 3.5, shape: "angler" },
  { name: "Starfish",   color: 0xffcc00, glow: 0xff8800, points: 70,  size: 32, speed: 2.5, shape: "star"   },
  { name: "Sea Turtle", color: 0x44cc88, glow: 0x00aa44, points: 60,  size: 34, speed: 2.0, shape: "turtle" },
  { name: "Jellyfish",  color: 0xff88cc, glow: 0xff44aa, points: 50,  size: 36, speed: 1.8, shape: "jelly"  },
  { name: "Octopus",    color: 0xcc44ff, glow: 0xaa00ff, points: 40,  size: 38, speed: 1.5, shape: "octo"   },
  { name: "Dolphin",    color: 0x66ccff, glow: 0x00aaff, points: 20,  size: 46, speed: 1.2, shape: "whale"  },
  { name: "Blue Whale", color: 0x44aaff, glow: 0x0066ff, points: 10,  size: 52, speed: 1.0, shape: "whale"  },
] as const;

export type CreatureDef = typeof CREATURES[number];
