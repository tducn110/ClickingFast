import { describe, expect, it } from "vitest";
import { ITEM_REGISTRY } from "./itemRegistry";

describe("ITEM_REGISTRY art assets", () => {
  it("assigns one real static texture to every gameplay item", () => {
    const texturePaths = ITEM_REGISTRY.map(({ texturePath }) => texturePath);

    expect(texturePaths).toEqual([
      "/assets/fruits/mango.png",
      "/assets/fruits/apple.png",
      "/assets/fruits/pear.png",
      "/assets/fruits/strawberry.png",
      "/assets/fruits/guava.png",
      "/assets/items/bee.png",
      "/assets/items/worm.png",
      "/assets/items/rotten.png",
      "/assets/items/heart.png",
      "/assets/items/lightning.png",
      "/assets/items/slow-time.png",
    ]);
    expect(new Set(texturePaths).size).toBe(ITEM_REGISTRY.length);
  });
});
