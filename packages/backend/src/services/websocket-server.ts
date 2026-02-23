/**
 * WebSocket Server Service
 * Manages real-time connections and broadcasts updates to connected clients
 */

import { Server as HTTPServer } from 'http';

// Mock WebSocket for development/testing when package is not available
let WebSocket: any;
let WebSocketServer: any;
try {
  const ws = require('ws');
  WebSocket = ws.WebSocket;
  WebSocketServer = ws.Server;
} catch (e) {
  // Fallback mock for testing
  WebSocket = class MockWebSocket {
    readyState = 1;
    send() {}
    close() {}
  };
  WebSocketServer = class MockWebSocketServer {
    constructor() {}
    on() {}
    close() {}
  };
}

export interface WebSocketMessage {
  type: 'event_created' | 'event_updated' | 'event_deleted' | 'metrics_updated';
  data: any;
  timestamp: number;
}

export interface WebSocketClient {
  id: string;
  userId?: string;
  familyId?: string;
  ws: any;
  isAlive: boolean;
}

/**
 * WebSocketServer manages real-time connections and message broadcasting
 */
export class WebSocketServerService {
  private wss: any;
  private clients: Map<string, WebSocketClient> = new Map();
  private clientIdCounter = 0;

  constructor(private httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    this.setupServer();
  }

  /**
   * Setup WebSocket server
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: any) => {
      const clientId = `client-${++this.clientIdCounter}`;
      const client: WebSocketClient = {
        id: clientId,
        ws,
        isAlive: true,
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });

      // Heartbeat
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Heartbeat interval to detect dead connections
    setInterval(() => {
      this.wss.clients?.forEach((ws: any) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Handle authentication/subscription messages
    if (message.type === 'subscribe') {
      client.userId = message.userId;
      client.familyId = message.familyId;
      console.log(`Client ${clientId} subscribed to family ${message.familyId}`);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.ws.readyState === 1) {
        // WebSocket.OPEN
        client.ws.send(payload);
      }
    });
  }

  /**
   * Broadcast message to specific family
   */
  broadcastToFamily(familyId: string, message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.familyId === familyId && client.ws.readyState === 1) {
        client.ws.send(payload);
      }
    });
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId: string, message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === 1) {
        client.ws.send(payload);
      }
    });
  }

  /**
   * Notify event creation
   */
  notifyEventCreated(familyId: string, eventData: any): void {
    this.broadcastToFamily(familyId, {
      type: 'event_created',
      data: eventData,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify event update
   */
  notifyEventUpdated(familyId: string, eventData: any): void {
    this.broadcastToFamily(familyId, {
      type: 'event_updated',
      data: eventData,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify event deletion
   */
  notifyEventDeleted(familyId: string, eventId: string): void {
    this.broadcastToFamily(familyId, {
      type: 'event_deleted',
      data: { eventId },
      timestamp: Date.now(),
    });
  }

  /**
   * Notify metrics update
   */
  notifyMetricsUpdated(familyId: string, metricsData: any): void {
    this.broadcastToFamily(familyId, {
      type: 'metrics_updated',
      data: metricsData,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients for a family
   */
  getFamilyClientsCount(familyId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.familyId === familyId) {
        count++;
      }
    });
    return count;
  }

  /**
   * Close server
   */
  close(): void {
    this.wss.close();
    this.clients.clear();
  }
}

// Singleton instance
let wsServerInstance: WebSocketServerService | null = null;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketServerService {
  if (!wsServerInstance) {
    wsServerInstance = new WebSocketServerService(httpServer);
  }
  return wsServerInstance;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServerService | null {
  return wsServerInstance;
}
