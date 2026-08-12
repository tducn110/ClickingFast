/**
 * Contract tests for the game's Wink adapter.
 *
 * These cover the boundaries the handoff matrix checks that a unit test can
 * reach. The remaining rows (top-level PARENT_REQUIRED, the secret boundary,
 * and real pause/resume behaviour) must still be exercised against the running
 * game through the local harness.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WinkGameIntegration } from '../client';
import type { WinkBridgeApi, WinkBridgeCapabilities } from '../wink-bridge';

type LifecycleKind = 'pause' | 'resume' | 'mute' | 'unmute';

function makeBridge(capabilities: WinkBridgeCapabilities) {
  const lifecycle: Record<LifecycleKind, Array<() => void>> = {
    pause: [],
    resume: [],
    mute: [],
    unmute: [],
  };
  const register =
    (kind: LifecycleKind) =>
    (listener: () => void) => {
      lifecycle[kind].push(listener);
      return () => {
        lifecycle[kind] = lifecycle[kind].filter((fn) => fn !== listener);
      };
    };

  const api = {
    subscribe: vi.fn(() => () => {}),
    getState: vi.fn(() => ({ capabilities }) as never),
    getCapabilities: vi.fn(() => capabilities),
    getLeaderboard: vi.fn(async () => ({ entries: [], total: 0 })),
    submitScore: vi.fn(async () => {
      if (!capabilities.submitScore) {
        throw Object.assign(new Error('Capability denied'), {
          code: 'CAPABILITY_DENIED',
        });
      }
      return { entry: {}, isNewBest: true, previousBest: null };
    }),
    complete: vi.fn(),
    onPause: vi.fn(register('pause')),
    onResume: vi.fn(register('resume')),
    onMute: vi.fn(register('mute')),
    onUnmute: vi.fn(register('unmute')),
    help: vi.fn(() => ({}) as never),
  } as unknown as WinkBridgeApi;

  const emit = (kind: LifecycleKind) =>
    lifecycle[kind].forEach((listener) => listener());
  return { api, emit };
}

const ANONYMOUS: WinkBridgeCapabilities = {
  getLeaderboard: true,
  submitScore: false,
  complete: true,
};
const AUTHENTICATED: WinkBridgeCapabilities = {
  getLeaderboard: true,
  submitScore: true,
  complete: true,
};

function install(capabilities: WinkBridgeCapabilities) {
  const bridge = makeBridge(capabilities);
  vi.stubGlobal('window', { WinkBridge: bridge.api });
  return bridge;
}

beforeEach(() => {
  // Start every case with a window that has no bridge installed, so the
  // facade's "not installed" behaviour is the default rather than leakage
  // from a previous test.
  vi.stubGlobal('window', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('without the certified bridge installed', () => {
  it('denies every capability instead of inventing one', () => {
    const wink = new WinkGameIntegration();
    expect(wink.capabilities).toEqual({
      getLeaderboard: false,
      submitScore: false,
      complete: false,
    });
    expect(wink.canSubmitScore).toBe(false);
  });

  it('rejects leaderboard reads rather than returning fake data', async () => {
    const wink = new WinkGameIntegration();
    await expect(wink.refreshLeaderboard()).rejects.toThrow(
      /WinkBridge is not installed/,
    );
  });
});

describe('anonymous identity', () => {
  it('can read the leaderboard and complete a round', async () => {
    const { api } = install(ANONYMOUS);
    const wink = new WinkGameIntegration();

    await expect(wink.refreshLeaderboard({ limit: 10 })).resolves.toEqual({
      entries: [],
      total: 0,
    });

    const round = wink.startRound();
    expect(wink.completeRound(round)).toBe(true);
    expect(api.complete).toHaveBeenCalledTimes(1);
  });

  it('surfaces CAPABILITY_DENIED for score submission', async () => {
    install(ANONYMOUS);
    const wink = new WinkGameIntegration();

    await expect(wink.submitFinalScore({ score: 100 })).rejects.toMatchObject({
      code: 'CAPABILITY_DENIED',
    });
    expect(wink.canSubmitScore).toBe(false);
  });
});

describe('round semantics', () => {
  it('keeps one stable round id for the whole round', () => {
    const { api } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();

    const round = wink.startRound();
    wink.completeRound(round);

    expect(api.complete).toHaveBeenCalledWith(
      expect.objectContaining({ roundId: round.roundId }),
    );
  });

  it('gives different rounds different ids', () => {
    install(AUTHENTICATED);
    const wink = new WinkGameIntegration();
    expect(wink.startRound().roundId).not.toBe(wink.startRound().roundId);
  });

  it('reports completion exactly once per round', () => {
    const { api } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();

    const round = wink.startRound();
    expect(wink.completeRound(round)).toBe(true);
    expect(wink.completeRound(round)).toBe(false);
    expect(wink.completeRound(round)).toBe(false);
    expect(api.complete).toHaveBeenCalledTimes(1);
  });

  it('never emits a negative play duration', () => {
    const { api } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();

    wink.completeRound(wink.startRound(), { playDurationMs: -1 });

    expect(api.complete).toHaveBeenCalledWith(
      expect.objectContaining({ playDurationMs: 0 }),
    );
  });
});

describe('completion and score stay independent', () => {
  it('does not submit a score when a round completes', () => {
    const { api } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();

    wink.completeRound(wink.startRound());

    expect(api.complete).toHaveBeenCalledTimes(1);
    expect(api.submitScore).not.toHaveBeenCalled();
  });

  it('does not complete a round when a score is submitted', async () => {
    const { api } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();

    await wink.submitFinalScore({ score: 1500, playTime: 42 });

    expect(api.submitScore).toHaveBeenCalledTimes(1);
    expect(api.complete).not.toHaveBeenCalled();
  });
});

describe('lifecycle', () => {
  it('forwards parent pause/resume and mute/unmute to the game', () => {
    const { emit } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();
    const calls: string[] = [];

    wink.bindLifecycle({
      onPause: () => calls.push('pause'),
      onResume: () => calls.push('resume'),
      onMute: () => calls.push('mute'),
      onUnmute: () => calls.push('unmute'),
    });

    emit('pause');
    emit('resume');
    emit('mute');
    emit('unmute');

    expect(calls).toEqual(['pause', 'resume', 'mute', 'unmute']);
  });

  it('stops forwarding after dispose', () => {
    const { emit } = install(AUTHENTICATED);
    const wink = new WinkGameIntegration();
    const onPause = vi.fn();

    wink.bindLifecycle({ onPause });
    wink.dispose();
    emit('pause');

    expect(onPause).not.toHaveBeenCalled();
  });
});
