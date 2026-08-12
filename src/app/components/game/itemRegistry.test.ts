import { describe, expect, it } from "vitest";
import { ITEM_REGISTRY } from "./itemRegistry";

describe("ITEM_REGISTRY art assets", () => {
  it("assigns one real static texture to every gameplay item", () => {
    const texturePaths = ITEM_REGISTRY.map(({ texturePath }) => texturePath);

    expect(texturePaths).toEqual([
      "/assets/fruits/mango.webp",
      "/assets/fruits/apple.webp",
      "/assets/fruits/pear.webp",
      "/assets/fruits/strawberry.webp",
      "/assets/fruits/guava.webp",
      "/assets/items/bee.webp",
      "/assets/items/worm.webp",
      "/assets/items/rotten.webp",
      "/assets/items/heart.webp",
      "/assets/items/lightning.webp",
      "/assets/items/slow-time.webp",
    ]);
    expect(new Set(texturePaths).size).toBe(ITEM_REGISTRY.length);
  });
});
