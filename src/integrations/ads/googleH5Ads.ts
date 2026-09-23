// Mock Ads adapter - No external Google SDK required.
// Preserves UI triggers and reward mechanics without external blockers.
// ponytail: simple mock provider without over-engineered queue

export type AdSound = "on" | "off";

export interface AdLifecycle {
  beforeAd?: () => void;
  afterAd?: () => void;
}

export interface RewardedAdOptions extends AdLifecycle {
  name: string;
}

export interface InterstitialAdOptions extends AdLifecycle {
  name: string;
  type?: "next" | "start" | "pause" | "browse";
}

let activeBreak = false;
let configuredSound: AdSound = "on";

export function bootstrapGoogleH5Ads(): Promise<boolean> {
  return Promise.resolve(true);
}

export function setGoogleH5AdSound(sound: AdSound): void {
  configuredSound = sound;
}

export function getGoogleH5AdSound(): AdSound {
  return configuredSound;
}

export async function showRewardedVideo(options: RewardedAdOptions): Promise<boolean> {
  if (activeBreak) return false;
  activeBreak = true;
  options.beforeAd?.();
  
  await new Promise((resolve) => setTimeout(resolve, 250));
  
  options.afterAd?.();
  activeBreak = false;
  return true;
}

export async function showInterstitial(options: InterstitialAdOptions): Promise<void> {
  if (activeBreak) return;
  activeBreak = true;
  options.beforeAd?.();
  
  await new Promise((resolve) => setTimeout(resolve, 150));
  
  options.afterAd?.();
  activeBreak = false;
}

export function isAdBreakActive(): boolean {
  return activeBreak;
}
