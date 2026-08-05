/**
 * The single Wink adapter for this game.
 *
 * Everything the game needs from the platform goes through here, and this file
 * touches nothing but the public `window.WinkBridge` surface exposed by the
 * TypeScript facade. It deliberately holds no credential, no network authority,
 * no browser storage, and no message protocol of its own — the certified bridge
 * owns all of that.
 *
 * What this adapter adds on top of the raw SDK are the four game-side rules the
 * handoff matrix checks:
 *
 *   1. one stable round id per semantic round;
 *   2. completion is reported exactly once per round;
 *   3. completion and score submission stay independent;
 *   4. score submission is capability-aware and never silently faked.
 *
 * Wire your game into `startRound` / `completeRound` / `submitFinalScore` at the
 * boundaries you documented in `wink-integration.json`.
 */

import {
  complete,
  getCapabilities,
  getLeaderboard,
  getState,
  onMute,
  onPause,
  onResume,
  onUnmute,
  submitScore,
  subscribe,
  type CompletionInput,
  type LeaderboardOptions,
  type LeaderboardResponse,
  type SubmitScoreInput,
  type SubmitScoreResponse,
  type WinkBridgeCapabilities,
  type WinkBridgeState,
} from './wink-bridge';

export interface WinkRound {
  readonly roundId: string;
  readonly startedAtMs: number;
}

export interface WinkLifecycleHandlers {
  onPause?: () => void;
  onResume?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
}

const DENIED: WinkBridgeCapabilities = Object.freeze({
  getLeaderboard: false,
  submitScore: false,
  complete: false,
});

function newRoundId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  // Non-secret correlation id; only used to keep one round's events together.
  const random = Math.random().toString(16).slice(2, 10);
  return `round-${Date.now().toString(16)}-${random}`;
}

export class WinkGameIntegration {
  #completedRounds = new Set<string>();

  #disposers: Array<() => void> = [];

  /**
   * Open a new semantic round. Keep the returned handle for the whole round —
   * including through any revive, bonus, or continue step — so completion and
   * score refer to the same round id.
   */
  startRound(): WinkRound {
    return Object.freeze({
      roundId: newRoundId(),
      startedAtMs: Date.now(),
    });
  }

  /**
   * Report the semantic end of a round. Safe to call more than once: only the
   * first call per round reaches the parent, which is what "exactly once"
   * means in the handoff matrix. This never submits a score.
   */
  completeRound(
    round: WinkRound,
    extra: Omit<CompletionInput, 'roundId' | 'playDurationMs'> & {
      playDurationMs?: number;
    } = {},
  ): boolean {
    if (this.#completedRounds.has(round.roundId)) {
      return false;
    }
    this.#completedRounds.add(round.roundId);

    const { playDurationMs, ...rest } = extra;
    complete({
      roundId: round.roundId,
      playDurationMs: Math.max(
        0,
        Math.round(playDurationMs ?? Date.now() - round.startedAtMs),
      ),
      ...rest,
    });
    return true;
  }

  /**
   * Submit the final qualifying score. Call this only at the boundary you
   * documented — never automatically on completion.
   *
   * An anonymous player has no submit capability: the bridge rejects the call
   * with `CAPABILITY_DENIED` before any network activity. Let that rejection
   * surface in the UI. Do not substitute a local success.
   */
  submitFinalScore(input: SubmitScoreInput): Promise<SubmitScoreResponse> {
    return submitScore(input);
  }

  refreshLeaderboard(
    options?: LeaderboardOptions,
  ): Promise<LeaderboardResponse> {
    return getLeaderboard(options);
  }

  get capabilities(): WinkBridgeCapabilities {
    return getCapabilities() ?? DENIED;
  }

  get state(): WinkBridgeState | null {
    return getState();
  }

  /** True when the current identity may persist a score. */
  get canSubmitScore(): boolean {
    return this.capabilities.submitScore === true;
  }

  observe(listener: (state: WinkBridgeState) => void): () => void {
    const stop = subscribe(listener);
    this.#disposers.push(stop);
    return stop;
  }

  /**
   * Bind the parent's pause/resume and mute/unmute signals to the game.
   *
   * Pause must stop the engine ticker and every gameplay timer without
   * resetting the round or jumping time forward on resume. Mute must not
   * overwrite the player's own persisted music/SFX preferences.
   */
  bindLifecycle(handlers: WinkLifecycleHandlers): () => void {
    const stops: Array<() => void> = [];
    if (handlers.onPause) stops.push(onPause(handlers.onPause));
    if (handlers.onResume) stops.push(onResume(handlers.onResume));
    if (handlers.onMute) stops.push(onMute(handlers.onMute));
    if (handlers.onUnmute) stops.push(onUnmute(handlers.onUnmute));

    const stopAll = () => stops.forEach((stop) => stop());
    this.#disposers.push(stopAll);
    return stopAll;
  }

  dispose(): void {
    this.#disposers.forEach((stop) => stop());
    this.#disposers = [];
    this.#completedRounds.clear();
  }
}

export const winkGame = new WinkGameIntegration();
