// Preload strictly CRITICAL resources required for the initial game view.
// ponytail: standard font and essential asset barrier without bloated queues

let criticalPreloadPromise: Promise<void> | null = null;

async function preloadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load('400 16px "Be Vietnam Pro"'),
      document.fonts.load('700 16px "Be Vietnam Pro"'),
      document.fonts.load('800 16px "Be Vietnam Pro"'),
      document.fonts.load('500 16px "Plus Jakarta Sans"'),
      document.fonts.load('700 16px "Plus Jakarta Sans"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Non-fatal font load fallback
  }
}

export function preloadCriticalResources(onProgress?: (pct: number) => void): Promise<void> {
  if (criticalPreloadPromise) return criticalPreloadPromise;

  criticalPreloadPromise = (async () => {
    onProgress?.(30);
    await preloadFonts().catch(() => {});
    onProgress?.(70);
    await new Promise((r) => setTimeout(r, 60));
    onProgress?.(95);
  })()
    .then(() => undefined)
    .catch((error) => {
      criticalPreloadPromise = null;
      throw error;
    });

  return criticalPreloadPromise;
}

export function preloadNonCriticalResources(): void {
  // Deferred non-critical tasks
}
