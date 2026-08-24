/** Google H5 Game Ads adapter. Ads are intentionally separate from WinkBridge. */
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

type AdBreakOptions = Record<string, unknown>;
type AdBreakFunction = (options: AdBreakOptions) => void;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: AdBreakFunction;
    adConfig?: AdBreakFunction;
  }
}

const SDK_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
const SCRIPT_MARKER = "google-h5-game-ads";

let bootstrapPromise: Promise<boolean> | null = null;
let activeBreak = false;
let configuredSound: AdSound = "on";

function devMockOutcome(): "viewed" | "dismissed" | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("winkAdsMock");
  if (value === "viewed" || value === "dismissed") return value;
  return null;
}

function installQueueApi(): void {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak = window.adBreak || ((options) => window.adsbygoogle!.push(options));
  window.adConfig = window.adConfig || ((options) => window.adsbygoogle!.push(options));
}

export function bootstrapGoogleH5Ads(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }
  if (devMockOutcome()) return Promise.resolve(true);
  if (bootstrapPromise) return bootstrapPromise;

  installQueueApi();
  let publisherId = import.meta.env.VITE_GOOGLE_H5_AD_CLIENT?.trim();
  if (import.meta.env.DEV && !publisherId) {
    publisherId = "ca-pub-3940256099942544";
  }
  if (!publisherId) {
    console.warn("[Ads] VITE_GOOGLE_H5_AD_CLIENT is required in production; Ads disabled.");
    return Promise.resolve(false);
  }

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-wink-ads="' + SCRIPT_MARKER + '"]',
  );
  if (existing?.dataset.loaded === "true") return Promise.resolve(true);

  bootstrapPromise = new Promise<boolean>((resolve) => {
    const script = existing || document.createElement("script");
    const finish = (loaded: boolean) => {
      script.dataset.loaded = loaded ? "true" : "false";
      resolve(loaded);
    };
    script.addEventListener("load", () => finish(true), { once: true });
    script.addEventListener("error", () => finish(false), { once: true });

    if (!existing) {
      script.async = true;
      script.src = SDK_SRC;
      script.crossOrigin = "anonymous";
      script.dataset.winkAds = SCRIPT_MARKER;
      script.dataset.adClient = publisherId;
      if (import.meta.env.DEV) script.dataset.adbreakTest = "on";
      document.head.appendChild(script);
    }

    window.adConfig?.({ preloadAdBreaks: "on", sound: configuredSound });
  });

  return bootstrapPromise;
}

export function setGoogleH5AdSound(sound: AdSound): void {
  configuredSound = sound;
  if (typeof window !== "undefined") window.adConfig?.({ sound });
}

function runLifecycleMock(
  lifecycle: AdLifecycle,
  outcome: "viewed" | "dismissed",
): Promise<boolean> {
  lifecycle.beforeAd?.();
  return new Promise((resolve) => {
    window.setTimeout(() => {
      lifecycle.afterAd?.();
      resolve(outcome === "viewed");
    }, 120);
  });
}

export async function showRewardedVideo(options: RewardedAdOptions): Promise<boolean> {
  if (activeBreak) return false;
  const mock = devMockOutcome();
  if (mock) {
    activeBreak = true;
    try {
      return await runLifecycleMock(options, mock);
    } finally {
      activeBreak = false;
    }
  }

  if (!(await bootstrapGoogleH5Ads()) || !window.adBreak) return false;
  activeBreak = true;

  return new Promise<boolean>((resolve) => {
    let viewed = false;
    let started = false;
    let restored = false;
    let settled = false;
    const beforeAd = () => {
      if (started) return;
      started = true;
      options.beforeAd?.();
    };
    const afterAd = () => {
      if (!started || restored) return;
      restored = true;
      options.afterAd?.();
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      afterAd();
      activeBreak = false;
      resolve(viewed);
    };

    try {
      window.adBreak!({
        type: "reward",
        name: options.name,
        beforeAd,
        afterAd,
        beforeReward: (showAd: () => void) => showAd(),
        adViewed: () => { viewed = true; },
        adDismissed: () => { viewed = false; },
        adBreakDone: finish,
      });
    } catch (error) {
      console.error("[Ads] Rewarded request failed", error);
      finish();
    }
  });
}

export async function showInterstitial(options: InterstitialAdOptions): Promise<void> {
  if (activeBreak) return;
  const mock = devMockOutcome();
  if (mock) {
    activeBreak = true;
    try {
      await runLifecycleMock(options, "dismissed");
    } finally {
      activeBreak = false;
    }
    return;
  }

  if (!(await bootstrapGoogleH5Ads()) || !window.adBreak) return;
  activeBreak = true;
  await new Promise<void>((resolve) => {
    let started = false;
    let restored = false;
    let settled = false;
    const beforeAd = () => {
      if (started) return;
      started = true;
      options.beforeAd?.();
    };
    const afterAd = () => {
      if (!started || restored) return;
      restored = true;
      options.afterAd?.();
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      afterAd();
      activeBreak = false;
      resolve();
    };
    try {
      window.adBreak!({
        type: options.type || "next",
        name: options.name,
        beforeAd,
        afterAd,
        adBreakDone: finish,
      });
    } catch (error) {
      console.error("[Ads] Interstitial request failed", error);
      finish();
    }
  });
}

export function isAdBreakActive(): boolean {
  return activeBreak;
}
