/**
 * Event Notification Service
 * Integrates WebSocket real-time updates with event management
 * Broadcasts event changes to connected clients
 */

import { getWebSocketServer } from './websocket-server';

export interface EventNotificationPayload {
  eventId: string;
  familyId: string;
  familyMemberId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  category?: string;
  [key: string]: any;
}

/**
 * EventNotificationService handles broadcasting event changes via WebSocket
 */
export class EventNotificationService {
  /**
   * Notify event creation
   */
  static notifyEventCreated(familyId: string, eventData: EventNotificationPayload): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.notifyEventCreated(familyId, {
        eventId: eventData.eventId,
        familyMemberId: eventData.familyMemberId,
        title: eventData.title,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
        category: eventData.category,
      });
    }
  }

  /**
   * Notify event update
   */
  static notifyEventUpdated(familyId: string, eventData: EventNotificationPayload): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.notifyEventUpdated(familyId, {
        eventId: eventData.eventId,
        familyMemberId: eventData.familyMemberId,
        title: eventData.title,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
        category: eventData.category,
      });
    }
  }

  /**
   * Notify event deletion
   */
  static notifyEventDeleted(familyId: string, eventId: string): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.notifyEventDeleted(familyId, eventId);
    }
  }

  /**
   * Notify metrics update
   */
  static notifyMetricsUpdated(
    familyId: string,
    metricsData: {
      familyMemberId?: string;
      timeAllocations: Array<{
        category: string;
        totalHours: number;
        percentage: number;
      }>;
      timestamp: Date;
    }
  ): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.notifyMetricsUpdated(familyId, {
        familyMemberId: metricsData.familyMemberId,
        timeAllocations: metricsData.timeAllocations,
        timestamp: metricsData.timestamp.toISOString(),
      });
    }
  }

  /**
   * Get WebSocket server status
   */
  static getStatus(): {
    connected: boolean;
    connectedClients: number;
  } {
    const wsServer = getWebSocketServer();
    return {
      connected: wsServer !== null,
      connectedClients: wsServer ? wsServer.getConnectedClientsCount() : 0,
    };
  }
}
