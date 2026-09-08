import { Container, Point } from "pixi.js";
import { describe, expect, it } from "vitest";
import { screenToGameplayPoint } from "./coordinateAdapter";

describe("screenToGameplayPoint", () => {
  it("maps a CSS-scaled canvas point into renderer gameplay coordinates", () => {
    const presentationRoot = new Container();
    const result = screenToGameplayPoint(
      { clientX: 215, clientY: 170 },
      {
        left: 20,
        top: 40,
        cssWidth: 390,
        cssHeight: 260,
        rendererWidth: 780,
        rendererHeight: 520,
      },
      presentationRoot,
    );

    expect(result.x).toBeCloseTo(390, 6);
    expect(result.y).toBeCloseTo(260, 6);
  });

  it("inverts presentation shake translation and scale at the visual point", () => {
    const presentationRoot = new Container();
    presentationRoot.position.set(13, -9);
    presentationRoot.scale.set(1.018);
    const logicalCenter = new Point(240, 310);
    const visualRendererPoint = presentationRoot.toGlobal(logicalCenter);

    const result = screenToGameplayPoint(
      {
        clientX: 50 + visualRendererPoint.x / 2,
        clientY: 30 + visualRendererPoint.y / 2,
      },
      {
        left: 50,
        top: 30,
        cssWidth: 400,
        cssHeight: 300,
        rendererWidth: 800,
        rendererHeight: 600,
      },
      presentationRoot,
    );

    expect(result.x).toBeCloseTo(logicalCenter.x, 6);
    expect(result.y).toBeCloseTo(logicalCenter.y, 6);
  });

  it.each([
    ["mobile portrait", 390, 844],
    ["mobile landscape", 844, 390],
  ])("preserves the visual center in %s", (_label, width, height) => {
    const presentationRoot = new Container();
    const logicalCenter = new Point(width * 0.72, height * 0.61);
    const result = screenToGameplayPoint(
      { clientX: logicalCenter.x, clientY: logicalCenter.y },
      {
        left: 0,
        top: 0,
        cssWidth: width,
        cssHeight: height,
        rendererWidth: width,
        rendererHeight: height,
      },
      presentationRoot,
    );

    expect(result.x).toBeCloseTo(logicalCenter.x, 6);
    expect(result.y).toBeCloseTo(logicalCenter.y, 6);
  });
});
