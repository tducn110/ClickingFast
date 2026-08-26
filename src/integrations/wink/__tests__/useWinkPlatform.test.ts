import { describe, expect, it } from 'vitest';
import { shouldUseLocalFallback } from '../useWinkPlatform';
import type { WinkBridgeState } from '../wink-bridge';

const parentRequiredState = {
  phase: 'error',
  capabilities: {
    getLeaderboard: false,
    submitScore: false,
    complete: false,
  },
  error: {
    code: 'PARENT_REQUIRED',
    message: 'Wink bridge requires an iframe parent',
    recoverable: false,
  },
} as WinkBridgeState;

describe('direct-play Wink fallback', () => {
  it('uses local mode for top-level local or Vercel play', () => {
    expect(shouldUseLocalFallback(parentRequiredState, true)).toBe(true);
  });

  it('keeps PARENT_REQUIRED visible to iframe diagnostics', () => {
    expect(shouldUseLocalFallback(parentRequiredState, false)).toBe(false);
  });

  it('does not hide unrelated Wink errors', () => {
    const state = {
      ...parentRequiredState,
      error: { ...parentRequiredState.error, code: 'RUNTIME_CONFIG_INVALID' },
    } as WinkBridgeState;
    expect(shouldUseLocalFallback(state, true)).toBe(false);
  });
});
