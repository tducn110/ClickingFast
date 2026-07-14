export const MAX_MISSES = 5;
export const GROUND_RATIO = 0.22;
export const GROUND_TOP = 0xc8d68a;
export const GROUND_DEEP = 0x4c6630;
export const WATERLINE_RATIO = 1 - GROUND_RATIO;
export const WATER_SURF = GROUND_TOP;
export const WATER_DEEP = GROUND_DEEP;
export const SKY_TOP = 0xf5ecd7;
export { CREATURES } from "./itemRegistry";
export type { CreatureDef } from "./itemRegistry";
import { ITEM_REGISTRY, type CreatureDef } from "./itemRegistry";

export const TARGETS = ITEM_REGISTRY;
export const ORDERABLE_TARGETS = ITEM_REGISTRY.filter(
  (item) => item.canAppearInOrder
) as CreatureDef[];
export type TargetDef = CreatureDef;
