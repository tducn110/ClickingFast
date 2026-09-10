export type WinkBridgePhase =
  | 'booting'
  | 'ready_anonymous'
  | 'ready_authenticated'
  | 'error';

export type WinkBridgeErrorCode =
  | 'GAME_NOT_FOUND'
  | 'GAME_IFRAME_DISABLED'
  | 'GAME_ORIGIN_INVALID'
  | 'RUNTIME_CONFIG_INVALID'
  | 'FRAME_LOAD_TIMEOUT'
  | 'BRIDGE_READY_TIMEOUT'
  | 'PROTOCOL_MISMATCH'
  | 'SESSION_CREATE_FAILED'
  | 'SESSION_RENEWAL_FAILED'
  | 'SESSION_EXPIRED'
  | 'CAPABILITY_DENIED'
  | 'PARENT_REQUIRED'
  | 'API_NETWORK_ERROR'
  | 'MESSAGE_REJECTED';

export interface WinkBridgeErrorState {
  code: WinkBridgeErrorCode;
  message: string;
  recoverable: boolean;
}

export interface WinkBridgeCapabilities {
  getLeaderboard: boolean;
  submitScore: boolean;
  complete: boolean;
  track?: boolean;
}

export interface WinkBridgeState {
  phase: WinkBridgePhase;
  gameId: string | null;
  environment: 'dev' | 'prod' | null;
  sessionId: string | null;
  identityType: 'anonymous' | 'user' | null;
  displayName: string | null;
  capabilities: WinkBridgeCapabilities;
  expiresAt: string | null;
  lifecycle: {
    paused: boolean;
    muted: boolean;
  };
  error: WinkBridgeErrorState | null;
}

export interface LeaderboardOptions {
  limit?: number;
  offset?: number;
}

export interface SubmitScoreInput {
  score: number;
  playTime?: number;
  gameMode?: string;
  counter?: number;
  metadata?: Record<string, unknown>;
}

export interface LeaderboardEntry {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  score: number;
  playTime: number | null;
  rank: number;
  createdAt: string | null;
}

export interface SubmitScoreResponse {
  entry: LeaderboardEntry | null;
  isNewBest: boolean;
  previousBest: number | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total?: number;
  me?: LeaderboardEntry | null;
}

export interface CompletionInput {
  roundId: string;
  playDurationMs: number;
  [key: string]: unknown;
}

declare global {
  interface Window {
    Wink?: any;
    WinkBridge?: any;
  }
}

let activeState: WinkBridgeState = {
  phase: 'ready_anonymous',
  gameId: null,
  environment: null,
  sessionId: null,
  identityType: 'anonymous',
  displayName: null,
  capabilities: {
    getLeaderboard: true,
    submitScore: true,
    complete: true,
    track: true,
  },
  expiresAt: null,
  lifecycle: {
    paused: false,
    muted: false,
  },
  error: null,
};

const listeners = new Set<(state: WinkBridgeState) => void>();

export function getWinkBridge(): any {
  if (typeof window === 'undefined') return null;
  return window.Wink || window.WinkBridge || null;
}

export function getState(): WinkBridgeState | null {
  const sdk = getWinkBridge();
  if (sdk?.player) {
    activeState.displayName = sdk.player.displayName ?? null;
    activeState.identityType = sdk.player.isGuest ? 'anonymous' : 'user';
    activeState.phase = sdk.player.isGuest ? 'ready_anonymous' : 'ready_authenticated';
  }
  if (sdk?.can) {
    activeState.capabilities.submitScore = sdk.can('submitScore');
    activeState.capabilities.getLeaderboard = sdk.can('getLeaderboard');
    activeState.capabilities.track = sdk.can('track');
  }
  return activeState;
}

export function getCapabilities(): WinkBridgeCapabilities | null {
  const sdk = getWinkBridge();
  if (sdk?.can) {
    return {
      getLeaderboard: sdk.can('getLeaderboard'),
      submitScore: sdk.can('submitScore'),
      complete: true,
      track: sdk.can('track'),
    };
  }
  return activeState.capabilities;
}

export function subscribe(listener: (state: WinkBridgeState) => void): () => void {
  listeners.add(listener);
  listener(getState() || activeState);
  return () => listeners.delete(listener);
}

export function onPause(listener: () => void): () => void {
  const sdk = getWinkBridge();
  if (sdk?.on) {
    return sdk.on('pause', listener);
  }
  return () => {};
}

export function onResume(listener: () => void): () => void {
  const sdk = getWinkBridge();
  if (sdk?.on) {
    return sdk.on('resume', listener);
  }
  return () => {};
}

export function onMute(listener: () => void): () => void {
  const sdk = getWinkBridge();
  if (sdk?.on) {
    return sdk.on('mute', listener);
  }
  return () => {};
}

export function onUnmute(listener: () => void): () => void {
  const sdk = getWinkBridge();
  if (sdk?.on) {
    return sdk.on('unmute', listener);
  }
  return () => {};
}

export async function submitScore(input: SubmitScoreInput): Promise<SubmitScoreResponse> {
  const sdk = getWinkBridge();
  if (sdk?.submitScore) {
    const res = await sdk.submitScore(input);
    return {
      entry: res.entry ? {
        id: res.entry.id ?? 'entry-1',
        userId: res.entry.userId ?? null,
        isAnonymous: !res.entry.displayName,
        displayName: res.entry.displayName ?? null,
        score: res.entry.score ?? input.score,
        playTime: res.entry.playTime ?? input.playTime ?? null,
        rank: res.entry.rank ?? 1,
        createdAt: res.entry.createdAt ?? new Date().toISOString(),
      } : null,
      isNewBest: res.isNewBest ?? false,
      previousBest: res.previousBest ?? null,
    };
  }
  return { entry: null, isNewBest: false, previousBest: null };
}

export async function getLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardResponse> {
  const sdk = getWinkBridge();
  if (sdk?.getLeaderboard) {
    const res = await sdk.getLeaderboard(options);
    return {
      entries: (res.entries || []).map((e: any, idx: number) => ({
        id: e.id ?? `e-${idx}`,
        userId: e.userId ?? null,
        isAnonymous: !e.displayName,
        displayName: e.displayName ?? null,
        score: e.score ?? 0,
        playTime: e.playTime ?? null,
        rank: e.rank ?? idx + 1,
        createdAt: e.createdAt ?? null,
      })),
      total: res.total,
      me: res.me,
    };
  }
  return { entries: [], total: 0, me: null };
}

export async function getPersonalBest(): Promise<LeaderboardEntry | null> {
  const sdk = getWinkBridge();
  if (sdk?.getPersonalBest) {
    const res = await sdk.getPersonalBest();
    return res.me ?? null;
  }
  return null;
}

export function complete(input: CompletionInput): void {
  const sdk = getWinkBridge();
  if (sdk?.gameplayStop) {
    sdk.gameplayStop();
  } else if (sdk?.complete) {
    sdk.complete(input);
  }
}
