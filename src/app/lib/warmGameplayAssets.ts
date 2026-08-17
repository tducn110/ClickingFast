import {
  HAZARD_ITEMS,
  POWERUP_ITEMS,
  PRODUCE_ITEMS,
} from "../components/game/itemRegistry";

const WARM_IMAGE_URLS = [
  ...PRODUCE_ITEMS,
  ...HAZARD_ITEMS,
  ...POWERUP_ITEMS,
]
  .map((item) => item.texturePath)
  .concat(["/bg_game.webp"]);

let imagesWarmed = false;

export function warmCriticalImages() {
  if (imagesWarmed || typeof Image === "undefined") return;
  imagesWarmed = true;
  for (const url of WARM_IMAGE_URLS) {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  }
}

export function shouldSkipPixiWarmUp() {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  const type = connection.effectiveType;
  return type === "slow-2g" || type === "2g";
}

export function scheduleIdle(callback: () => void, fallbackMs = 2000) {
  const windowWithIdle = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
  };
  if (typeof windowWithIdle.requestIdleCallback === "function") {
    windowWithIdle.requestIdleCallback(callback, { timeout: fallbackMs });
    return;
  }
  windowWithIdle.setTimeout(callback, fallbackMs);
}