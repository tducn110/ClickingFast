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

function mapWinkState(state: WinkBridgeState | null): WinkUiState {
  if (!state) return 'local';

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
    return {
      connection: mapWinkState(initialState),
      canReadLeaderboard: initialState?.capabilities.getLeaderboard ?? true,
      canSubmitScore: initialState?.capabilities.submitScore ?? true,
      errorCode: initialState?.error?.code ?? null,
    };
  });

  useEffect(() => {
    return winkGame.observe((state) => {
      setModel({
        connection: mapWinkState(state),
        canReadLeaderboard: state.capabilities.getLeaderboard,
        canSubmitScore: state.capabilities.submitScore,
        errorCode: state.error?.code ?? null,
      });
    });
  }, []);

  return model;
}
