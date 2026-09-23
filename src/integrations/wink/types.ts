export type WinkStatus = "connecting" | "connected" | "online" | "standalone"
export type WinkMode = "wink" | "offline"
export type WinkPhase = "booting" | "ready_anonymous" | "ready_authenticated"
export type WinkLocale = "vi" | "en"

export type WinkCapability = "getLeaderboard" | "submitScore" | "track"
export type WinkEvent = "pause" | "resume" | "mute" | "unmute" | "locale"

export type WinkIntegrationErrorCode = "API_NETWORK_ERROR" | "INVALID_SCORE"

export interface WinkIntegrationError {
  code: WinkIntegrationErrorCode
  message: string
  retryable: boolean
}

export interface WinkLeaderboardEntry {
  id?: string
  userId?: string | null
  isAnonymous?: boolean
  rank: number
  score: number
  playTime: number | null
  displayName: string | null
  avatarUrl: string | null
  createdAt?: string | null
}

export interface WinkLeaderboard {
  entries: readonly WinkLeaderboardEntry[]
  me: WinkLeaderboardEntry | null
  total?: number
}

export interface WinkPlayer {
  isGuest: boolean
  displayName: string | null
  avatarUrl: string | null
}

export interface WinkSubmitScoreResult {
  entry: WinkLeaderboardEntry | null
  isNewBest: boolean
  previousBest?: number | null
}

export interface WinkScoreInput {
  score: number
  playTime?: number
}

/** The public SDK surface used by this game; no custom transport is allowed. */
export interface WinkSDK {
  init(): Promise<WinkSDK>
  gameplayStart(): void
  gameplayStop(): void
  submitScore(input: number | WinkScoreInput): Promise<{
    entry: WinkLeaderboardEntry | null
    isNewBest: boolean
    previousBest: number | null
  }>
  getLeaderboard(options?: { limit?: number; offset?: number }): Promise<WinkLeaderboard>
  getPersonalBest(options?: unknown): Promise<{ me: WinkLeaderboardEntry | null }>
  track(eventName: string, properties?: Record<string, unknown>): Promise<unknown>
  on(event: WinkEvent, listener: (data?: unknown) => void): () => void
  can(capability: WinkCapability): boolean
  setLocale(locale: WinkLocale): void
  readonly player: WinkPlayer | null
  readonly locale: string
  readonly muted: boolean
  readonly status: WinkStatus
  destroy(): void
}

declare global {
  interface Window {
    Wink?: WinkSDK
  }
}

/** Application-facing projection. Only the adapter itself accesses window.Wink. */
export interface WinkIntegration {
  readyPromise: Promise<WinkSDK | null>
  status: WinkStatus
  isReady: boolean
  mode: WinkMode
  phase: WinkPhase
  hostPaused: boolean
  hostMuted: boolean
  locale: WinkLocale
  error: WinkIntegrationError | null
  leaderboard: readonly WinkLeaderboardEntry[]
  personalBest: WinkLeaderboardEntry | null
  displayName: string | null
  canGetLeaderboard: boolean
  canSubmitScore: boolean
  setLocale(locale: WinkLocale): void
  track(eventName: string, properties?: Record<string, unknown>): Promise<void>
  gameplayStart(): void
  gameplayStop(): void
  refreshLeaderboard(options?: { force?: boolean }): Promise<void>
  refreshPersonalBest(options?: { force?: boolean }): Promise<void>
  submitFinalScore(input: { score: number; playTimeSec?: number }): Promise<WinkSubmitScoreResult | null>
}
