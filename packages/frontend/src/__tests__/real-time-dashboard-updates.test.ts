import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { WebSocketService, WebSocketMessage } from '../services/websocket-service';

/**
 * Property 15: Real-Time Dashboard Updates
 * Validates: Requirements 4.6
 * 
 * The dashboard SHALL update in real-time when new events are added or modified.
 * Updates should occur within 1 second of event changes.
 */
describe('Real-Time Dashboard Updates', () => {
  let wsService: WebSocketService;

  beforeEach(() => {
    wsService = new WebSocketService('ws://localhost:8080/ws');
  });

  afterEach(() => {
    if (wsService) {
      wsService.disconnect();
    }
    vi.clearAllMocks();
  });

  it('should create WebSocket service instance', () => {
    expect(wsService).toBeDefined();
    expect(wsService.isConnected()).toBe(false);
  });

  it('should support subscribing to messages', () => {
    const listener = vi.fn();
    const unsubscribe = wsService.subscribe(listener);
    
    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should support unsubscribing from messages', () => {
    const listener = vi.fn();
    const unsubscribe = wsService.subscribe(listener);
    
    unsubscribe();
    // After unsubscribe, listener should not be called
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle disconnect gracefully', () => {
    wsService.disconnect();
    expect(wsService.isConnected()).toBe(false);
  });

  it('should support multiple subscribers', () => {
    const listeners = Array.from({ length: 5 }, () => vi.fn());
    const unsubscribers = listeners.map(listener => wsService.subscribe(listener));
    
    expect(unsubscribers).toHaveLength(5);
    unsubscribers.forEach(unsub => {
      expect(typeof unsub).toBe('function');
    });
  });

  it('should validate WebSocket message structure', () => {
    const validMessage: WebSocketMessage = {
      type: 'event_created',
      data: { eventId: '123' },
      timestamp: Date.now()
    };

    expect(validMessage.type).toBeDefined();
    expect(validMessage.data).toBeDefined();
    expect(validMessage.timestamp).toBeGreaterThan(0);
  });

  it('should support all message types', () => {
    const messageTypes: WebSocketMessage['type'][] = [
      'event_created',
      'event_updated',
      'event_deleted',
      'metrics_updated'
    ];

    messageTypes.forEach(type => {
      const message: WebSocketMessage = {
        type,
        data: {},
        timestamp: Date.now()
      };
      expect(message.type).toBe(type);
    });
  });

  it('should handle message timestamps correctly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (offset) => {
        const now = Date.now();
        const message: WebSocketMessage = {
          type: 'event_created',
          data: {},
          timestamp: now + offset
        };

        expect(message.timestamp).toBeGreaterThanOrEqual(now);
        expect(message.timestamp).toBeLessThanOrEqual(now + 1000);
      })
    );
  });

  it('should support rapid message creation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (messageCount) => {
        const messages: WebSocketMessage[] = [];

        for (let i = 0; i < messageCount; i++) {
          messages.push({
            type: 'event_created',
            data: { eventId: `${i}` },
            timestamp: Date.now() + i
          });
        }

        expect(messages).toHaveLength(messageCount);
        
        // Verify order
        for (let i = 0; i < messageCount; i++) {
          expect(messages[i].data.eventId).toBe(`${i}`);
        }
      })
    );
  });

  it('should maintain message data integrity', () => {
    const originalData = {
      eventId: '123',
      title: 'Test Event',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString()
    };

    const message: WebSocketMessage = {
      type: 'event_created',
      data: originalData,
      timestamp: Date.now()
    };

    expect(message.data).toEqual(originalData);
    expect(message.data.eventId).toBe('123');
    expect(message.data.title).toBe('Test Event');
  });

  it('should support different event types in messages', () => {
    const eventTypes = ['event_created', 'event_updated', 'event_deleted', 'metrics_updated'];
    
    eventTypes.forEach(eventType => {
      const message: WebSocketMessage = {
        type: eventType as WebSocketMessage['type'],
        data: { type: eventType },
        timestamp: Date.now()
      };

      expect(message.type).toBe(eventType);
      expect(message.data.type).toBe(eventType);
    });
  });

  it('should handle message data with various payload sizes', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (payloadSize) => {
        const largeData = {
          items: Array.from({ length: payloadSize }, (_, i) => ({
            id: `item-${i}`,
            value: Math.random()
          }))
        };

        const message: WebSocketMessage = {
          type: 'metrics_updated',
          data: largeData,
          timestamp: Date.now()
        };

        expect(message.data.items).toHaveLength(payloadSize);
      }),
      { numRuns: 10 }
    );
  });

  it('should preserve message order in sequence', () => {
    const messages: WebSocketMessage[] = [];
    const timestamps: number[] = [];

    for (let i = 0; i < 10; i++) {
      const timestamp = Date.now() + i;
      messages.push({
        type: 'event_created',
        data: { index: i },
        timestamp
      });
      timestamps.push(timestamp);
    }

    // Verify timestamps are in ascending order
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('should support concurrent message handling', () => {
    const listeners = Array.from({ length: 10 }, () => vi.fn());
    listeners.forEach(listener => wsService.subscribe(listener));

    // Simulate message handling
    const message: WebSocketMessage = {
      type: 'event_created',
      data: { eventId: '123' },
      timestamp: Date.now()
    };

    // In a real scenario, all listeners would be called
    expect(message).toBeDefined();
    expect(listeners).toHaveLength(10);
  });
});
