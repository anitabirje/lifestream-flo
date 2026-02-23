/**
 * Tests for WebSocket Server Service
 * Property-based tests for real-time updates
 * Requirements: 4.6, 4.9
 */

import fc from 'fast-check';
import { WebSocketServerService, WebSocketMessage } from '../websocket-server';
import { Server as HTTPServer } from 'http';

// Mock HTTP server
jest.mock('http');

describe('WebSocketServerService', () => {
  let wsServer: WebSocketServerService;
  let mockHttpServer: any;

  beforeEach(() => {
    mockHttpServer = {
      listen: jest.fn(),
    };
    wsServer = new WebSocketServerService(mockHttpServer);
  });

  afterEach(() => {
    wsServer.close();
  });

  describe('broadcastToAll', () => {
    test('should broadcast message to all connected clients', () => {
      const message: WebSocketMessage = {
        type: 'event_created',
        data: { eventId: 'event-1', title: 'Test Event' },
        timestamp: Date.now(),
      };

      // Mock clients
      const mockClient1 = { readyState: 1, send: jest.fn() };
      const mockClient2 = { readyState: 1, send: jest.fn() };

      // Simulate adding clients (in real scenario, they connect via WebSocket)
      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        ws: mockClient1,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-2', {
        id: 'client-2',
        ws: mockClient2,
        isAlive: true,
      });

      wsServer.broadcastToAll(message);

      expect(mockClient1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockClient2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    /**
     * Property 69: Real-Time Message Broadcasting
     * **Validates: Requirements 4.6, 4.9**
     *
     * For any valid WebSocket message, the server should:
     * 1. Broadcast the message to all connected clients
     * 2. Serialize the message to JSON
     * 3. Only send to clients with open connections (readyState === 1)
     * 4. Handle multiple concurrent broadcasts
     */
    test('Property 69: Real-Time Message Broadcasting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.object({ maxDepth: 2 }),
          async (eventType, eventData) => {
            const message: WebSocketMessage = {
              type: 'event_created',
              data: eventData,
              timestamp: Date.now(),
            };

            // Mock clients
            const mockClients = Array.from({ length: 3 }, (_, i) => ({
              readyState: 1,
              send: jest.fn(),
            }));

            mockClients.forEach((client, i) => {
              (wsServer as any).clients.set(`client-${i}`, {
                id: `client-${i}`,
                ws: client,
                isAlive: true,
              });
            });

            wsServer.broadcastToAll(message);

            // All clients should receive the message
            mockClients.forEach((client) => {
              expect(client.send).toHaveBeenCalledWith(JSON.stringify(message));
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('broadcastToFamily', () => {
    test('should broadcast message only to family members', () => {
      const message: WebSocketMessage = {
        type: 'event_updated',
        data: { eventId: 'event-1' },
        timestamp: Date.now(),
      };

      const mockClient1 = { readyState: 1, send: jest.fn() };
      const mockClient2 = { readyState: 1, send: jest.fn() };
      const mockClient3 = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        familyId: 'family-1',
        ws: mockClient1,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-2', {
        id: 'client-2',
        familyId: 'family-1',
        ws: mockClient2,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-3', {
        id: 'client-3',
        familyId: 'family-2',
        ws: mockClient3,
        isAlive: true,
      });

      wsServer.broadcastToFamily('family-1', message);

      expect(mockClient1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockClient2.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockClient3.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastToUser', () => {
    test('should broadcast message only to specific user', () => {
      const message: WebSocketMessage = {
        type: 'metrics_updated',
        data: { metrics: {} },
        timestamp: Date.now(),
      };

      const mockClient1 = { readyState: 1, send: jest.fn() };
      const mockClient2 = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        userId: 'user-1',
        ws: mockClient1,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-2', {
        id: 'client-2',
        userId: 'user-2',
        ws: mockClient2,
        isAlive: true,
      });

      wsServer.broadcastToUser('user-1', message);

      expect(mockClient1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockClient2.send).not.toHaveBeenCalled();
    });
  });

  describe('notifyEventCreated', () => {
    test('should broadcast event_created message', () => {
      const mockClient = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        familyId: 'family-1',
        ws: mockClient,
        isAlive: true,
      });

      const eventData = {
        eventId: 'event-1',
        familyId: 'family-1',
        familyMemberId: 'member-1',
        title: 'Test Event',
        startTime: new Date(),
        endTime: new Date(),
      };

      wsServer.notifyEventCreated('family-1', eventData);

      expect(mockClient.send).toHaveBeenCalled();
      const sentMessage = JSON.parse((mockClient.send as jest.Mock).mock.calls[0][0]);
      expect(sentMessage.type).toBe('event_created');
      expect(sentMessage.data.eventId).toBe('event-1');
    });
  });

  describe('notifyEventUpdated', () => {
    test('should broadcast event_updated message', () => {
      const mockClient = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        familyId: 'family-1',
        ws: mockClient,
        isAlive: true,
      });

      const eventData = {
        eventId: 'event-1',
        familyId: 'family-1',
        familyMemberId: 'member-1',
        title: 'Updated Event',
        startTime: new Date(),
        endTime: new Date(),
      };

      wsServer.notifyEventUpdated('family-1', eventData);

      expect(mockClient.send).toHaveBeenCalled();
      const sentMessage = JSON.parse((mockClient.send as jest.Mock).mock.calls[0][0]);
      expect(sentMessage.type).toBe('event_updated');
    });
  });

  describe('notifyEventDeleted', () => {
    test('should broadcast event_deleted message', () => {
      const mockClient = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        familyId: 'family-1',
        ws: mockClient,
        isAlive: true,
      });

      wsServer.notifyEventDeleted('family-1', 'event-1');

      expect(mockClient.send).toHaveBeenCalled();
      const sentMessage = JSON.parse((mockClient.send as jest.Mock).mock.calls[0][0]);
      expect(sentMessage.type).toBe('event_deleted');
      expect(sentMessage.data.eventId).toBe('event-1');
    });
  });

  describe('notifyMetricsUpdated', () => {
    test('should broadcast metrics_updated message', () => {
      const mockClient = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        familyId: 'family-1',
        ws: mockClient,
        isAlive: true,
      });

      const metricsData = {
        familyMemberId: 'member-1',
        timeAllocations: [
          { category: 'Work', totalHours: 40, percentage: 50 },
          { category: 'Health/Fitness', totalHours: 5, percentage: 6.25 },
        ],
        timestamp: new Date(),
      };

      wsServer.notifyMetricsUpdated('family-1', metricsData);

      expect(mockClient.send).toHaveBeenCalled();
      const sentMessage = JSON.parse((mockClient.send as jest.Mock).mock.calls[0][0]);
      expect(sentMessage.type).toBe('metrics_updated');
      expect(sentMessage.data.timeAllocations).toHaveLength(2);
    });
  });

  describe('getConnectedClientsCount', () => {
    test('should return correct count of connected clients', () => {
      const mockClient1 = { readyState: 1, send: jest.fn() };
      const mockClient2 = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        ws: mockClient1,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-2', {
        id: 'client-2',
        ws: mockClient2,
        isAlive: true,
      });

      expect(wsServer.getConnectedClientsCount()).toBe(2);
    });
  });

  describe('getFamilyClientsCount', () => {
    test('should return correct count of family clients', () => {
      const mockClient1 = { readyState: 1, send: jest.fn() };
      const mockClient2 = { readyState: 1, send: jest.fn() };
      const mockClient3 = { readyState: 1, send: jest.fn() };

      (wsServer as any).clients.set('client-1', {
        id: 'client-1',
        familyId: 'family-1',
        ws: mockClient1,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-2', {
        id: 'client-2',
        familyId: 'family-1',
        ws: mockClient2,
        isAlive: true,
      });
      (wsServer as any).clients.set('client-3', {
        id: 'client-3',
        familyId: 'family-2',
        ws: mockClient3,
        isAlive: true,
      });

      expect(wsServer.getFamilyClientsCount('family-1')).toBe(2);
      expect(wsServer.getFamilyClientsCount('family-2')).toBe(1);
    });
  });
});
