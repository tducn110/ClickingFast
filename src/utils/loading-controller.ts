export interface PapaLoadingAPI {
  setProgress: (percent: number, label?: string, tip?: string) => void;
  complete: () => void;
  dismiss: () => void;
  isComplete: () => boolean;
}

declare global {
  interface Window {
    PapaLoading?: PapaLoadingAPI;
  }
}

export function setGameLoadingProgress(pct: number, label?: string, tip?: string): void {
  if (typeof window !== "undefined" && window.PapaLoading) {
    window.PapaLoading.setProgress(pct, label, tip);
  }
}

export function completeGameLoading(): void {
  if (typeof window !== "undefined" && window.PapaLoading) {
    window.PapaLoading.complete();
  }
}

export function dismissGameLoading(): void {
  if (typeof window !== "undefined" && window.PapaLoading) {
    window.PapaLoading.dismiss();
  }
}

export function onGameLoadingDismiss(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    callback();
  };
  window.addEventListener("papa-loading-dismiss", handler);
  return () => {
    window.removeEventListener("papa-loading-dismiss", handler);
  };
}
