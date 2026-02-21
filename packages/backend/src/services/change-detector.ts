/**
 * Change Detector
 * Processes agent results to detect changes
 * Identifies new, updated, and deleted events
 */

import { AgentResult } from '../agents/types';

export interface ExternalEvent {
  sourceId: string;
  externalId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  rawData?: any;
}

export interface StoredEvent {
  id: string;
  externalId?: string;
  sourceId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular' | 'internal';
  isDeleted: boolean;
  updatedAt: Date;
}

export interface ChangeDetectionResult {
  newEvents: ExternalEvent[];
  updatedEvents: Array<{
    externalEvent: ExternalEvent;
    storedEvent: StoredEvent;
    changedFields: string[];
  }>;
  deletedEvents: Array<{
    storedEvent: StoredEvent;
    reason: string;
  }>;
  totalChanges: number;
}

export class ChangeDetector {
  /**
   * Detect changes from agent results
   */
  detectChanges(
    agentResult: AgentResult,
    storedEvents: StoredEvent[]
  ): ChangeDetectionResult {
    if (agentResult.status === 'failed') {
      return {
        newEvents: [],
        updatedEvents: [],
        deletedEvents: [],
        totalChanges: 0
      };
    }

    const externalEvents: ExternalEvent[] = agentResult.data || [];
    const newEvents: ExternalEvent[] = [];
    const updatedEvents: Array<{
      externalEvent: ExternalEvent;
      storedEvent: StoredEvent;
      changedFields: string[];
    }> = [];
    const deletedEvents: Array<{
      storedEvent: StoredEvent;
      reason: string;
    }> = [];

    // Create a map of external events by externalId for quick lookup
    const externalEventMap = new Map<string, ExternalEvent>();
    for (const event of externalEvents) {
      externalEventMap.set(event.externalId, event);
    }

    // Check for new and updated events
    for (const externalEvent of externalEvents) {
      const storedEvent = storedEvents.find(
        e => e.externalId === externalEvent.externalId && e.sourceId === externalEvent.sourceId
      );

      if (!storedEvent) {
        // New event
        newEvents.push(externalEvent);
      } else {
        // Check for updates
        const changedFields = this.detectFieldChanges(externalEvent, storedEvent);
        if (changedFields.length > 0) {
          updatedEvents.push({
            externalEvent,
            storedEvent,
            changedFields
          });
        }
      }
    }

    // Check for deleted events
    for (const storedEvent of storedEvents) {
      // Only check events from the same source
      if (storedEvent.source !== agentResult.data?.[0]?.source) {
        continue;
      }

      const externalEvent = externalEventMap.get(storedEvent.externalId || '');
      if (!externalEvent && !storedEvent.isDeleted) {
        // Event was deleted in external source
        deletedEvents.push({
          storedEvent,
          reason: 'Event no longer exists in external source'
        });
      }
    }

    return {
      newEvents,
      updatedEvents,
      deletedEvents,
      totalChanges: newEvents.length + updatedEvents.length + deletedEvents.length
    };
  }

  /**
   * Detect which fields have changed between external and stored events
   */
  private detectFieldChanges(externalEvent: ExternalEvent, storedEvent: StoredEvent): string[] {
    const changedFields: string[] = [];

    // Compare title
    if (externalEvent.title !== storedEvent.title) {
      changedFields.push('title');
    }

    // Compare description
    if ((externalEvent.description || '') !== (storedEvent.description || '')) {
      changedFields.push('description');
    }

    // Compare start time
    if (new Date(externalEvent.startTime).getTime() !== new Date(storedEvent.startTime).getTime()) {
      changedFields.push('startTime');
    }

    // Compare end time
    if (new Date(externalEvent.endTime).getTime() !== new Date(storedEvent.endTime).getTime()) {
      changedFields.push('endTime');
    }

    // Compare location
    if ((externalEvent.location || '') !== (storedEvent.location || '')) {
      changedFields.push('location');
    }

    // Compare attendees
    if (!this.arraysEqual(externalEvent.attendees || [], storedEvent.attendees || [])) {
      changedFields.push('attendees');
    }

    return changedFields;
  }

  /**
   * Compare two arrays for equality
   */
  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }

    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();

    return sorted1.every((val, idx) => val === sorted2[idx]);
  }

  /**
   * Merge multiple change detection results
   */
  mergeResults(...results: ChangeDetectionResult[]): ChangeDetectionResult {
    const merged: ChangeDetectionResult = {
      newEvents: [],
      updatedEvents: [],
      deletedEvents: [],
      totalChanges: 0
    };

    for (const result of results) {
      merged.newEvents.push(...result.newEvents);
      merged.updatedEvents.push(...result.updatedEvents);
      merged.deletedEvents.push(...result.deletedEvents);
      merged.totalChanges += result.totalChanges;
    }

    return merged;
  }

  /**
   * Filter changes by source
   */
  filterBySource(
    result: ChangeDetectionResult,
    source: string
  ): ChangeDetectionResult {
    return {
      newEvents: result.newEvents.filter(e => e.source === source),
      updatedEvents: result.updatedEvents.filter(e => e.externalEvent.source === source),
      deletedEvents: result.deletedEvents.filter(e => e.storedEvent.source === source),
      totalChanges: result.newEvents.filter(e => e.source === source).length +
                    result.updatedEvents.filter(e => e.externalEvent.source === source).length +
                    result.deletedEvents.filter(e => e.storedEvent.source === source).length
    };
  }

  /**
   * Get summary of changes
   */
  getSummary(result: ChangeDetectionResult): {
    newCount: number;
    updatedCount: number;
    deletedCount: number;
    totalCount: number;
  } {
    return {
      newCount: result.newEvents.length,
      updatedCount: result.updatedEvents.length,
      deletedCount: result.deletedEvents.length,
      totalCount: result.totalChanges
    };
  }
}
