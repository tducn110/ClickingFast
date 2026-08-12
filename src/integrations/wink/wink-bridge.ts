export type WinkBridgePhase =
  | 'booting'
  | 'loading_config'
  | 'waiting_parent_hello'
  | 'waiting_session'
  | 'ready_anonymous'
  | 'ready_authenticated'
  | 'renewing'
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
}

export interface WinkBridgeState {
  phase: WinkBridgePhase;
  gameId: string | null;
  environment: 'dev' | 'prod' | null;
  sessionId: string | null;
  identityType: 'anonymous' | 'user' | null;
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

export interface CompletionInput {
  roundId: string;
  playDurationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface LeaderboardEntry {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  score: number;
  playTime: number | null;
  gameMode: string | null;
  counter: number | null;
  metadata: Record<string, unknown> | null;
  rank: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

export interface SubmitScoreResponse {
  entry: LeaderboardEntry;
  isNewBest: boolean;
  previousBest: number | null;
}

export interface WinkBridgeDiagnostics {
  bridgeVersion: string;
  protocolVersion: number;
  phase: WinkBridgePhase;
  gameId: string | null;
  environment: 'dev' | 'prod' | null;
  hasSession: boolean;
  capabilities: WinkBridgeCapabilities;
  lifecycle: {
    paused: boolean;
    muted: boolean;
  };
  errorCode: WinkBridgeErrorCode | null;
}

export interface WinkBridgeApi {
  subscribe(listener: (state: WinkBridgeState) => void): () => void;
  getState(): WinkBridgeState;
  getCapabilities(): WinkBridgeCapabilities;
  getLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardResponse>;
  submitScore(input: SubmitScoreInput): Promise<SubmitScoreResponse>;
  complete(input: CompletionInput): void;
  onPause(listener: () => void): () => void;
  onResume(listener: () => void): () => void;
  onMute(listener: () => void): () => void;
  onUnmute(listener: () => void): () => void;
  help(): WinkBridgeDiagnostics;
}

declare global {
  interface Window {
    WinkBridge?: WinkBridgeApi;
    WinkBridgeVersion?: string;
  }
}

const EMPTY_CAPABILITIES: WinkBridgeCapabilities = Object.freeze({
  getLeaderboard: false,
  submitScore: false,
  complete: false,
});
const NOOP_UNSUBSCRIBE = () => {};

export function getWinkBridge(): WinkBridgeApi | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.WinkBridge ?? null;
}

export const WinkBridge: WinkBridgeApi | null = getWinkBridge();

function requireBridge(): WinkBridgeApi {
  const current = getWinkBridge();
  if (!current) {
    throw new Error('WinkBridge is not installed');
  }
  return current;
}

export function subscribe(
  listener: (state: WinkBridgeState) => void,
): () => void {
  return getWinkBridge()?.subscribe(listener) ?? NOOP_UNSUBSCRIBE;
}

export function getState(): WinkBridgeState | null {
  return getWinkBridge()?.getState() ?? null;
}

export function getCapabilities(): WinkBridgeCapabilities {
  return getWinkBridge()?.getCapabilities() ?? EMPTY_CAPABILITIES;
}

export function getLeaderboard(
  options?: LeaderboardOptions,
): Promise<LeaderboardResponse> {
  return Promise.resolve().then(() =>
    requireBridge().getLeaderboard(options),
  );
}

export function submitScore(
  input: SubmitScoreInput,
): Promise<SubmitScoreResponse> {
  return Promise.resolve().then(() => requireBridge().submitScore(input));
}

export function complete(input: CompletionInput): void {
  getWinkBridge()?.complete(input);
}

export function onPause(listener: () => void): () => void {
  return getWinkBridge()?.onPause(listener) ?? NOOP_UNSUBSCRIBE;
}

export function onResume(listener: () => void): () => void {
  return getWinkBridge()?.onResume(listener) ?? NOOP_UNSUBSCRIBE;
}

export function onMute(listener: () => void): () => void {
  return getWinkBridge()?.onMute(listener) ?? NOOP_UNSUBSCRIBE;
}

export function onUnmute(listener: () => void): () => void {
  return getWinkBridge()?.onUnmute(listener) ?? NOOP_UNSUBSCRIBE;
}

export function help(): WinkBridgeDiagnostics | null {
  return getWinkBridge()?.help() ?? null;
}
