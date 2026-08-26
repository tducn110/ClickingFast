import { useState, useEffect } from 'react';
import { winkGame } from './client';
import type { WinkBridgeState } from './wink-bridge';

export type WinkUiState = 'connecting' | 'anonymous' | 'signed-in' | 'error' | 'local';

export interface WinkPlatformModel {
  connection: WinkUiState;
  canReadLeaderboard: boolean;
  canSubmitScore: boolean;
  errorCode: string | null;
}

export function shouldUseLocalFallback(
  state: WinkBridgeState | null,
  isTopLevel: boolean,
): boolean {
  return isTopLevel && state?.error?.code === 'PARENT_REQUIRED';
}

function isTopLevelWindow(): boolean {
  if (typeof window === 'undefined') return false;
  return window.top === window.self;
}

function mapWinkState(state: WinkBridgeState | null): WinkUiState {
  if (!state) return 'local';

  if (shouldUseLocalFallback(state, isTopLevelWindow())) {
    return 'local';
  }

  if (state.phase === 'error') {
    return 'error';
  }
  if (state.phase === 'ready_anonymous') {
    return 'anonymous';
  }
  if (
    state.phase === 'ready_authenticated' &&
    state.capabilities.submitScore
  ) {
    return 'signed-in';
  }
  return 'connecting';
}

export function useWinkPlatform(): WinkPlatformModel {
  const [model, setModel] = useState<WinkPlatformModel>(() => {
    const initialState = winkGame.state;
    const localFallback = shouldUseLocalFallback(initialState, isTopLevelWindow());
    return {
      connection: mapWinkState(initialState),
      canReadLeaderboard: localFallback
        ? false
        : initialState?.capabilities.getLeaderboard ?? true,
      canSubmitScore: localFallback
        ? false
        : initialState?.capabilities.submitScore ?? true,
      errorCode: localFallback ? null : initialState?.error?.code ?? null,
    };
  });

  useEffect(() => {
    return winkGame.observe((state) => {
      const localFallback = shouldUseLocalFallback(state, isTopLevelWindow());
      setModel({
        connection: mapWinkState(state),
        canReadLeaderboard: localFallback ? false : state.capabilities.getLeaderboard,
        canSubmitScore: localFallback ? false : state.capabilities.submitScore,
        errorCode: localFallback ? null : state.error?.code ?? null,
      });
    });
  }, []);

  return model;
}
