/**
 * useWebSocketUpdates Hook
 * Manages WebSocket connection and real-time updates for dashboard
 * Automatically connects/disconnects and handles message subscriptions
 */

import { useEffect, useCallback, useRef } from 'react';
import { getWebSocketService, WebSocketMessage } from './websocket-service';

export interface UseWebSocketUpdatesOptions {
  onEventCreated?: (data: any) => void;
  onEventUpdated?: (data: any) => void;
  onEventDeleted?: (data: any) => void;
  onMetricsUpdated?: (data: any) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

/**
 * Hook for managing WebSocket real-time updates
 * Handles connection lifecycle and message routing
 */
export function useWebSocketUpdates(options: UseWebSocketUpdatesOptions = {}) {
  const {
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onMetricsUpdated,
    onError,
    autoConnect = true,
  } = options;

  const wsServiceRef = useRef(getWebSocketService());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      const wsService = wsServiceRef.current;
      if (!wsService.isConnected()) {
        await wsService.connect();
        console.log('WebSocket connected for real-time updates');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to connect WebSocket:', err);
      onError?.(err);
    }
  }, [onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    try {
      const wsService = wsServiceRef.current;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      wsService.disconnect();
      console.log('WebSocket disconnected');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to disconnect WebSocket:', err);
      onError?.(err);
    }
  }, [onError]);

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      try {
        switch (message.type) {
          case 'event_created':
            onEventCreated?.(message.data);
            break;
          case 'event_updated':
            onEventUpdated?.(message.data);
            break;
          case 'event_deleted':
            onEventDeleted?.(message.data);
            break;
          case 'metrics_updated':
            onMetricsUpdated?.(message.data);
            break;
          default:
            console.warn('Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error handling WebSocket message:', err);
        onError?.(err);
      }
    },
    [onEventCreated, onEventUpdated, onEventDeleted, onMetricsUpdated, onError]
  );

  // Setup and cleanup
  useEffect(() => {
    if (autoConnect) {
      connect();

      // Subscribe to messages
      const wsService = wsServiceRef.current;
      unsubscribeRef.current = wsService.subscribe(handleMessage);

      // Cleanup on unmount
      return () => {
        disconnect();
      };
    }
  }, [autoConnect, connect, disconnect, handleMessage]);

  return {
    connect,
    disconnect,
    isConnected: () => wsServiceRef.current.isConnected(),
  };
}
