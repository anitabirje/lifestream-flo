/**
 * Conflict Detector
 * Detects overlapping events for same family member
 * Generates conflict warnings
 */

export interface Event {
  id: string;
  familyMemberId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  source: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingEvents: Event[];
  familyMemberId: string;
  timeRange: { start: Date; end: Date };
  conflictType: 'overlap' | 'adjacent' | 'none';
  severity: 'high' | 'medium' | 'low' | 'none';
}

export interface ConflictWarning {
  id: string;
  familyMemberId: string;
  event1: Event;
  event2: Event;
  conflictType: 'overlap' | 'adjacent';
  severity: 'high' | 'medium' | 'low';
  overlapDurationMs: number;
  detectedAt: Date;
}

export class ConflictDetector {
  /**
   * Detect conflicts for a new event
   */
  detectConflicts(newEvent: Event, existingEvents: Event[]): ConflictDetectionResult {
    const conflictingEvents: Event[] = [];
    let conflictType: 'overlap' | 'adjacent' | 'none' = 'none';
    let severity: 'high' | 'medium' | 'low' | 'none' = 'none';

    // Filter events for the same family member
    const memberEvents = existingEvents.filter(e => e.familyMemberId === newEvent.familyMemberId);

    for (const existingEvent of memberEvents) {
      const conflict = this.checkEventConflict(newEvent, existingEvent);

      if (conflict.hasConflict) {
        conflictingEvents.push(existingEvent);

        // Determine conflict type and severity
        if (conflict.type === 'overlap') {
          conflictType = 'overlap';
          severity = this.calculateSeverity(conflict.overlapDurationMs);
        } else if (conflict.type === 'adjacent' && conflictType !== 'overlap') {
          conflictType = 'adjacent';
          if (severity === 'none') {
            severity = 'low';
          }
        }
      }
    }

    return {
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents,
      familyMemberId: newEvent.familyMemberId,
      timeRange: {
        start: newEvent.startTime,
        end: newEvent.endTime
      },
      conflictType,
      severity
    };
  }

  /**
   * Detect all conflicts in a set of events
   */
  detectAllConflicts(events: Event[]): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        // Skip if different family members
        if (event1.familyMemberId !== event2.familyMemberId) {
          continue;
        }

        // Skip if already processed
        const pairKey = `${event1.id}-${event2.id}`;
        if (processedPairs.has(pairKey)) {
          continue;
        }
        processedPairs.add(pairKey);

        const conflict = this.checkEventConflict(event1, event2);

        if (conflict.hasConflict && conflict.type !== 'none') {
          const warning: ConflictWarning = {
            id: `${event1.id}-${event2.id}`,
            familyMemberId: event1.familyMemberId,
            event1,
            event2,
            conflictType: conflict.type as 'overlap' | 'adjacent',
            severity: this.calculateSeverity(conflict.overlapDurationMs),
            overlapDurationMs: conflict.overlapDurationMs,
            detectedAt: new Date()
          };

          warnings.push(warning);
        }
      }
    }

    return warnings;
  }

  /**
   * Check if two events conflict
   */
  private checkEventConflict(
    event1: Event,
    event2: Event
  ): {
    hasConflict: boolean;
    type: 'overlap' | 'adjacent' | 'none';
    overlapDurationMs: number;
  } {
    const start1 = event1.startTime.getTime();
    const end1 = event1.endTime.getTime();
    const start2 = event2.startTime.getTime();
    const end2 = event2.endTime.getTime();

    // Check for overlap
    if (start1 < end2 && start2 < end1) {
      const overlapStart = Math.max(start1, start2);
      const overlapEnd = Math.min(end1, end2);
      const overlapDurationMs = overlapEnd - overlapStart;

      return {
        hasConflict: true,
        type: 'overlap',
        overlapDurationMs
      };
    }

    // Check for adjacent events (back-to-back with no gap)
    if (end1 === start2 || end2 === start1) {
      return {
        hasConflict: true,
        type: 'adjacent',
        overlapDurationMs: 0
      };
    }

    return {
      hasConflict: false,
      type: 'none',
      overlapDurationMs: 0
    };
  }

  /**
   * Calculate severity based on overlap duration
   */
  private calculateSeverity(overlapDurationMs: number): 'high' | 'medium' | 'low' {
    // High severity: overlap > 30 minutes
    if (overlapDurationMs > 30 * 60 * 1000) {
      return 'high';
    }

    // Medium severity: overlap > 5 minutes
    if (overlapDurationMs > 5 * 60 * 1000) {
      return 'medium';
    }

    // Low severity: overlap <= 5 minutes
    return 'low';
  }

  /**
   * Get conflicts for a specific family member
   */
  getConflictsForMember(familyMemberId: string, events: Event[]): ConflictWarning[] {
    const memberEvents = events.filter(e => e.familyMemberId === familyMemberId);
    return this.detectAllConflicts(memberEvents);
  }

  /**
   * Get high-severity conflicts
   */
  getHighSeverityConflicts(warnings: ConflictWarning[]): ConflictWarning[] {
    return warnings.filter(w => w.severity === 'high');
  }

  /**
   * Get conflicts within a time range
   */
  getConflictsInTimeRange(
    warnings: ConflictWarning[],
    startTime: Date,
    endTime: Date
  ): ConflictWarning[] {
    return warnings.filter(w => {
      const eventStart = Math.min(w.event1.startTime.getTime(), w.event2.startTime.getTime());
      const eventEnd = Math.max(w.event1.endTime.getTime(), w.event2.endTime.getTime());
      const rangeStart = startTime.getTime();
      const rangeEnd = endTime.getTime();

      return eventStart < rangeEnd && eventEnd > rangeStart;
    });
  }

  /**
   * Format conflict warning for display
   */
  formatWarning(warning: ConflictWarning): string {
    const overlapMinutes = Math.round(warning.overlapDurationMs / (60 * 1000));
    const severity = warning.severity.toUpperCase();

    if (warning.conflictType === 'overlap') {
      return `[${severity}] "${warning.event1.title}" overlaps with "${warning.event2.title}" by ${overlapMinutes} minutes`;
    } else {
      return `[${severity}] "${warning.event1.title}" is immediately followed by "${warning.event2.title}"`;
    }
  }

  /**
   * Get summary of conflicts
   */
  getSummary(warnings: ConflictWarning[]): {
    totalConflicts: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    overlapConflicts: number;
    adjacentConflicts: number;
  } {
    return {
      totalConflicts: warnings.length,
      highSeverity: warnings.filter(w => w.severity === 'high').length,
      mediumSeverity: warnings.filter(w => w.severity === 'medium').length,
      lowSeverity: warnings.filter(w => w.severity === 'low').length,
      overlapConflicts: warnings.filter(w => w.conflictType === 'overlap').length,
      adjacentConflicts: warnings.filter(w => w.conflictType === 'adjacent').length
    };
  }
}
