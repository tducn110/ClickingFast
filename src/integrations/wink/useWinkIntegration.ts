import { useCallback, useEffect, useRef, useState } from "react"
import type {
  WinkIntegration,
  WinkIntegrationError,
  WinkIntegrationErrorCode,
  WinkLeaderboardEntry,
  WinkLocale,
  WinkMode,
  WinkPhase,
  WinkSDK,
  WinkStatus,
  WinkSubmitScoreResult,
} from "./types"
import { applyHostLocale } from "../../i18n"

const SAFE_ERROR_MESSAGES: Record<WinkIntegrationErrorCode, string> = {
  API_NETWORK_ERROR: "Không thể kết nối dịch vụ Wink.",
  INVALID_SCORE: "Điểm số cuối không hợp lệ.",
}

function safeError(code: WinkIntegrationErrorCode, retryable = false): WinkIntegrationError {
  return Object.freeze({ code, message: SAFE_ERROR_MESSAGES[code], retryable })
}

/** Host locales are normalized before they reach the single shared i18n instance. */
export function normalizeWinkLocale(value: string | null | undefined): WinkLocale {
  return value?.toLowerCase().startsWith("vi") ? "vi" : "en"
}

let globalInitPromise: Promise<WinkSDK | null> | null = null
let lastTargetWink: unknown = undefined

export function resetGlobalWinkInit(): void {
  globalInitPromise = null
  lastTargetWink = undefined
}

export function resolveGlobalWink(): Promise<WinkSDK | null> {
  const currentWink = typeof window === "undefined" ? undefined : window.Wink
  if (globalInitPromise && lastTargetWink === currentWink) return globalInitPromise

  lastTargetWink = currentWink
  globalInitPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null)
      return
    }

    const initialize = () => {
      const sdk = window.Wink
      if (!sdk?.init) return false
      void sdk.init().then(resolve).catch(() => resolve(null))
      return true
    }

    if (initialize()) return

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const maxWaitMs = typeof process !== "undefined" && process.env.NODE_ENV === "test" ? 100 : 2000
    let elapsed = 0
    const interval = window.setInterval(() => {
      elapsed += 25
      if (initialize() || elapsed >= maxWaitMs) {
        window.clearInterval(interval)
        resolve(null)
      }
    }, 25)
  })

  return globalInitPromise
}

export function useWinkIntegration(): WinkIntegration {
  const [status, setStatus] = useState<WinkStatus>("connecting")
  const [isReady, setIsReady] = useState(false)
  const [hostPaused, setHostPaused] = useState(false)
  const [hostMuted, setHostMuted] = useState(false)
  const [locale, setLocale] = useState<WinkLocale>(() =>
    normalizeWinkLocale(typeof window === "undefined" ? undefined : window.Wink?.locale),
  )
  const [error, setError] = useState<WinkIntegrationError | null>(null)
  const [personalBest, setPersonalBest] = useState<WinkLeaderboardEntry | null>(null)
  const [leaderboard, setLeaderboard] = useState<readonly WinkLeaderboardEntry[]>([])
  const sdkRef = useRef<WinkSDK | null>(null)

  useEffect(() => {
    let active = true
    let activeSdk: WinkSDK | null = null
    const cleanups: Array<() => void> = []

    void resolveGlobalWink().then((resolvedSdk) => {
      if (!active) return
      activeSdk = resolvedSdk
      sdkRef.current = resolvedSdk

      if (!resolvedSdk) {
        setStatus("standalone")
        setIsReady(true)
        return
      }

      setStatus(resolvedSdk.status)
      setHostMuted(Boolean(resolvedSdk.muted))
      const initialLocale = normalizeWinkLocale(resolvedSdk.locale)
      setLocale(initialLocale)
      if (resolvedSdk.locale) {
        applyHostLocale(resolvedSdk.locale)
      }

      cleanups.push(
        resolvedSdk.on("pause", () => setHostPaused(true)),
        resolvedSdk.on("resume", () => setHostPaused(false)),
        resolvedSdk.on("mute", () => setHostMuted(true)),
        resolvedSdk.on("unmute", () => setHostMuted(false)),
        resolvedSdk.on("locale", (nextLocale) => {
          const normalizedLocale = normalizeWinkLocale(typeof nextLocale === "string" ? nextLocale : undefined)
          setLocale(normalizedLocale)
          applyHostLocale(typeof nextLocale === "string" ? nextLocale : undefined)
        }),
      )
      setIsReady(true)
      // Personal best is a read operation and is independent of submitScore permission.
      void resolvedSdk.getPersonalBest().then((result) => {
        if (active) setPersonalBest(result?.me ?? null)
      }).catch(() => undefined)
    })

    return () => {
      active = false
      for (const cleanup of cleanups) {
        try {
          cleanup()
        } catch {
          // SDK cleanup is best-effort and must not affect the game runtime.
        }
      }
      if (sdkRef.current === activeSdk) sdkRef.current = null
      if (activeSdk) {
        try {
          activeSdk.destroy()
        } catch {
          // Disposal failure must not crash React unmount.
        }
      }
      resetGlobalWinkInit()
    }
  }, [])

  const gameplayStart = useCallback(() => {
    try {
      sdkRef.current?.gameplayStart()
    } catch {
      // Standalone or an SDK failure must not block local play.
    }
  }, [])

  const gameplayStop = useCallback(() => {
    try {
      sdkRef.current?.gameplayStop()
    } catch {
      // The semantic round is still ended locally if the SDK is unavailable.
    }
  }, [])

  const refreshLeaderboard = useCallback(async () => {
    const sdk = sdkRef.current
    if (!sdk || !sdk.can("getLeaderboard")) {
      setLeaderboard([])
      setPersonalBest(null)
      return
    }

    try {
      const board = await sdk.getLeaderboard({ limit: 30 })
      setLeaderboard(board.entries ?? [])
      setPersonalBest(board.me ?? null)
      setError(null)
    } catch {
      setError(safeError("API_NETWORK_ERROR", true))
      setLeaderboard([])
    }
  }, [])

  const refreshPersonalBest = useCallback(async () => {
    const sdk = sdkRef.current
    if (!sdk) {
      setPersonalBest(null)
      return
    }

    try {
      const result = await sdk.getPersonalBest()
      setPersonalBest(result?.me ?? null)
    } catch {
      // A dashboard can still render remote leaderboard data when this optional read fails.
    }
  }, [])

  const setWinkLocale = useCallback((nextLocale: WinkLocale) => {
    const sdk = sdkRef.current
    if (sdk) {
      sdk.setLocale(nextLocale)
    } else {
      // Keep local development usable if the SDK itself failed to initialize.
      applyHostLocale(nextLocale)
    }
  }, [])

  const track = useCallback(async (eventName: string, properties?: Record<string, unknown>) => {
    const sdk = sdkRef.current
    if (!sdk || !sdk.can("track")) return
    try {
      await sdk.track(eventName, properties)
    } catch (trackingError) {
      const code =
        typeof trackingError === "object" && trackingError !== null && "code" in trackingError
          ? String(trackingError.code)
          : "UNKNOWN"
      console.warn("Wink tracking unavailable", code)
    }
  }, [])

  const submitFinalScore = useCallback(async (input: { score: number; playTimeSec?: number }): Promise<WinkSubmitScoreResult | null> => {
    const score = Math.trunc(input.score)
    if (!Number.isFinite(score) || score < 0) {
      setError(safeError("INVALID_SCORE"))
      return null
    }

    const sdk = sdkRef.current
    if (!sdk || !sdk.can("submitScore")) return null

    try {
      const response = await sdk.submitScore({ score, playTime: Math.max(0, Math.trunc(input.playTimeSec ?? 0)) })
      setPersonalBest(response.entry ?? null)
      setError(null)
      return {
        entry: response.entry ?? null,
        isNewBest: Boolean(response.isNewBest),
        previousBest: response.previousBest ?? null,
      }
    } catch {
      setError(safeError("API_NETWORK_ERROR", true))
      return null
    }
  }, [])

  const mode: WinkMode = status === "standalone" ? "offline" : "wink"
  const phase: WinkPhase = !isReady
    ? "booting"
    : sdkRef.current?.player?.isGuest === false
      ? "ready_authenticated"
      : "ready_anonymous"

  return {
    readyPromise: resolveGlobalWink(),
    status,
    isReady,
    mode,
    phase,
    hostPaused,
    hostMuted,
    locale,
    error,
    leaderboard,
    personalBest,
    displayName: sdkRef.current?.player?.displayName ?? null,
    canGetLeaderboard: sdkRef.current?.can("getLeaderboard") ?? false,
    canSubmitScore: sdkRef.current?.can("submitScore") ?? false,
    setLocale: setWinkLocale,
    track,
    gameplayStart,
    gameplayStop,
    refreshLeaderboard,
    refreshPersonalBest,
    submitFinalScore,
  }
}
