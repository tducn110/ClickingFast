import { Point, type Container } from "pixi.js";

export interface ClientPoint {
  clientX: number;
  clientY: number;
}

export interface InputViewport {
  left: number;
  top: number;
  cssWidth: number;
  cssHeight: number;
  rendererWidth: number;
  rendererHeight: number;
}

export function screenToGameplayPoint(
  pointer: ClientPoint,
  viewport: InputViewport,
  presentationRoot: Container,
  rendererPoint = new Point(),
  gameplayPoint = new Point(),
) {
  rendererPoint.set(
    (pointer.clientX - viewport.left) *
      (viewport.rendererWidth / Math.max(1, viewport.cssWidth)),
    (pointer.clientY - viewport.top) *
      (viewport.rendererHeight / Math.max(1, viewport.cssHeight)),
  );
  return presentationRoot.toLocal(rendererPoint, undefined, gameplayPoint);
}
