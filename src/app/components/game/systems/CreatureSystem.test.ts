import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { HAZARD_ITEMS, PRODUCE_ITEMS, type ItemDefinition } from "../itemRegistry";
import {
  collectHitCandidates,
  collectSwipeHitCandidates,
  hitTestCreatures,
  type ActiveCreature,
} from "./CreatureSystem";

function makeCreature(
  id: number,
  def: ItemDefinition,
  x: number,
  y: number,
  scaleX = 1,
  scaleY = scaleX,
): ActiveCreature {
  const container = new Container();
  container.position.set(x, y);
  container.scale.set(scaleX, scaleY);
  return {
    id,
    def,
    x,
    y,
    startY: 0,
    endY: 1000,
    laneIndex: 0,
    laneOffsetNormalized: 0,
    minX: 0,
    maxX: 1000,
    fallProgressNormalized: 0.5,
    popinElapsedMs: 200,
    popoutElapsedMs: 0,
    container,
    body: {} as ActiveCreature["body"],
    born: 0,
    lifeMs: 1000,
    phase: "alive",
    tapped: false,
    guided: false,
    worldScale: 1,
  };
}

describe("collectHitCandidates", () => {
  it("derives gameplay hit bounds from the creature's current visual scale", () => {
    const apple = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100, 2);

    const candidates = collectHitCandidates(
      [apple],
      180,
      100,
      new Set(["apple"]),
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      creature: apple,
      role: "target",
      zOrder: 0,
    });
    expect(candidates[0]?.visualBounds.radiusX).toBeCloseTo(96, 6);
    expect(candidates[0]?.gameplayHitBounds.radiusX).toBeCloseTo(91.2, 6);
  });

  it("collects every containing candidate and assigns its gameplay role", () => {
    const target = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100);
    const distractor = makeCreature(2, PRODUCE_ITEMS[0]!, 104, 100);
    const hazard = makeCreature(3, HAZARD_ITEMS[0]!, 98, 100);

    const candidates = collectHitCandidates(
      [target, distractor, hazard],
      100,
      100,
      new Set(["apple"]),
    );

    expect(candidates.map(({ role }) => role)).toEqual([
      "target",
      "distractor",
      "hazard",
    ]);
    expect(candidates.map(({ zOrder }) => zOrder)).toEqual([0, 1, 2]);
    expect(candidates.every(({ normalizedDistance }) => normalizedDistance <= 1)).toBe(true);
  });

  it("resolves overlapping candidates through interaction policy", () => {
    const target = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100);
    const hazard = makeCreature(2, HAZARD_ITEMS[0]!, 104, 100);

    expect(
      hitTestCreatures([target, hazard], 103, 100, new Set(["apple"])),
    ).toBe(target);
  });

  it("uses a minimum target touch radius when the visual is temporarily small", () => {
    const target = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100, 0.2);

    expect(
      collectHitCandidates([target], 131, 100, new Set(["apple"])),
    ).toHaveLength(1);
    expect(
      collectHitCandidates([target], 133, 100, new Set(["apple"])),
    ).toHaveLength(0);
  });

  it("tests sway and buzz creatures at their current rendered position", () => {
    const sway = makeCreature(1, PRODUCE_ITEMS[2]!, 100, 100);
    const buzz = makeCreature(2, HAZARD_ITEMS[0]!, 200, 100);
    sway.container.x = 140;
    buzz.container.x = 240;

    const candidates = collectHitCandidates(
      [sway, buzz],
      140,
      100,
      new Set(["pear"]),
    );
    const buzzCandidates = collectHitCandidates(
      [sway, buzz],
      240,
      100,
      new Set(["pear"]),
    );

    expect(candidates.map(({ creature }) => creature)).toContain(sway);
    expect(buzzCandidates.map(({ creature }) => creature)).toContain(buzz);
  });

  it("keeps a rotated non-uniform hit ellipse aligned with the visual", () => {
    const target = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100, 2, 0.5);
    target.container.rotation = Math.PI / 2;

    expect(
      collectHitCandidates([target], 100, 180, new Set(["apple"])),
    ).toHaveLength(1);
    expect(
      collectHitCandidates([target], 180, 100, new Set(["apple"])),
    ).toHaveLength(0);
  });
});

describe("collectSwipeHitCandidates", () => {
  it("collects a creature intersected by the newest segment", () => {
    const apple = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100);
    const candidates = collectSwipeHitCandidates(
      [apple],
      20,
      100,
      180,
      100,
      new Set(["apple"]),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ creature: apple, role: "target" });
  });

  it("does not walk historical points or hit an entity outside the segment", () => {
    const apple = makeCreature(1, PRODUCE_ITEMS[1]!, 100, 100);
    expect(
      collectSwipeHitCandidates([apple], 20, 20, 180, 20, new Set(["apple"])),
    ).toHaveLength(0);
  });
});
