import { useCallback, useEffect, useState } from "react";
import {
  type BackendNotificationChannel,
  type BackendNotificationChannelType,
  api,
} from "../api/client";
import { createDefaultBackendNotificationChannel } from "../components/backendNotificationChannelConfig";

interface BackendNotificationChannelsState {
  channels: BackendNotificationChannel[];
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  error: string | null;
}

interface UseBackendNotificationChannelsResult
  extends BackendNotificationChannelsState {
  setChannels: (channels: BackendNotificationChannel[]) => void;
  saveChannels: () => Promise<void>;
  testChannel: (channelId: string, message?: string) => Promise<boolean>;
  addChannel: (type: BackendNotificationChannelType) => void;
  removeChannel: (channelId: string) => void;
}

function createDefaultChannel(
  type: BackendNotificationChannelType,
): BackendNotificationChannel {
  const id = `channel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return createDefaultBackendNotificationChannel(type, id);
}

export function useBackendNotificationChannels(): UseBackendNotificationChannelsResult {
  const [state, setState] = useState<BackendNotificationChannelsState>({
    channels: [],
    isLoading: true,
    isSaving: false,
    isTesting: false,
    error: null,
  });

  const fetchChannels = useCallback(async () => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      const { channels } = await api.getBackendNotificationChannels();
      setState((s) => ({
        ...s,
        channels,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load channels",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  const setChannels = useCallback((channels: BackendNotificationChannel[]) => {
    setState((s) => ({ ...s, channels, error: null }));
  }, []);

  const saveChannels = useCallback(async () => {
    try {
      setState((s) => ({ ...s, isSaving: true, error: null }));
      const { channels } = await api.updateBackendNotificationChannels(
        state.channels,
      );
      setState((s) => ({
        ...s,
        channels,
        isSaving: false,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isSaving: false,
        error: err instanceof Error ? err.message : "Failed to save channels",
      }));
      throw err;
    }
  }, [state.channels]);

  const testChannel = useCallback(
    async (channelId: string, message?: string) => {
      try {
        setState((s) => ({ ...s, isTesting: true, error: null }));
        const result = await api.testBackendNotificationChannel(
          channelId,
          message,
        );
        setState((s) => ({ ...s, isTesting: false }));
        return result.success;
      } catch (err) {
        setState((s) => ({
          ...s,
          isTesting: false,
          error: err instanceof Error ? err.message : "Failed to send test",
        }));
        return false;
      }
    },
    [],
  );

  const addChannel = useCallback((type: BackendNotificationChannelType) => {
    setState((s) => ({
      ...s,
      channels: [...s.channels, createDefaultChannel(type)],
      error: null,
    }));
  }, []);

  const removeChannel = useCallback((channelId: string) => {
    setState((s) => ({
      ...s,
      channels: s.channels.filter((channel) => channel.id !== channelId),
      error: null,
    }));
  }, []);

  return {
    ...state,
    setChannels,
    saveChannels,
    testChannel,
    addChannel,
    removeChannel,
  };
}
