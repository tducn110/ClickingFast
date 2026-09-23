import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveGlobalWink, resetGlobalWinkInit, normalizeWinkLocale } from '../useWinkIntegration';
import type { WinkSDK } from '../types';

describe('Wink SDK v1 Integration (03_muavu)', () => {
  let originalWink: unknown;

  beforeEach(() => {
    resetGlobalWinkInit();
    originalWink = (globalThis as any).Wink;
  });

  afterEach(() => {
    resetGlobalWinkInit();
    (globalThis as any).Wink = originalWink;
  });

  it('normalizes locale correctly to vi or en', () => {
    expect(normalizeWinkLocale('vi')).toBe('vi');
    expect(normalizeWinkLocale('vi-VN')).toBe('vi');
    expect(normalizeWinkLocale('VI')).toBe('vi');
    expect(normalizeWinkLocale('en')).toBe('en');
    expect(normalizeWinkLocale('en-US')).toBe('en');
    expect(normalizeWinkLocale('fr')).toBe('en');
    expect(normalizeWinkLocale(null)).toBe('en');
    expect(normalizeWinkLocale(undefined)).toBe('en');
  });

  it('resolves safely when window.Wink is absent (standalone mode)', async () => {
    delete (globalThis as any).Wink;
    const sdk = await resolveGlobalWink();
    expect(sdk).toBeNull();
  });

  it('resolves and initializes window.Wink SDK v1 when present', async () => {
    const mockSdk: Partial<WinkSDK> = {
      init: vi.fn(async () => mockSdk as WinkSDK),
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      can: vi.fn(() => true),
      status: 'online',
    };

    (globalThis as any).window = globalThis;
    (globalThis as any).Wink = mockSdk;

    const sdk = await resolveGlobalWink();
    expect(mockSdk.init).toHaveBeenCalled();
    expect(sdk).toBe(mockSdk);
  });
});
