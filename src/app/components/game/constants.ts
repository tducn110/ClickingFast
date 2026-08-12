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
import { PRODUCE_ITEMS, type ProduceDefinition } from "./itemRegistry";

export const TARGETS = PRODUCE_ITEMS;
export const ORDERABLE_TARGETS = PRODUCE_ITEMS;
export type TargetDef = ProduceDefinition;
