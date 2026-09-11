if (typeof globalThis.navigator === 'undefined') {
  (globalThis as any).navigator = { userAgent: 'node' };
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({ getContext: () => null }),
    fonts: { load: () => Promise.resolve(), ready: Promise.resolve() }
  };
}
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
