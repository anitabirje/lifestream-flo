/**
 * Offline Sync Service
 * Queues changes made offline and syncs when connectivity is restored
 */

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'event' | 'preference' | 'threshold';
  data: any;
  timestamp: string;
  retryCount: number;
}

const PENDING_CHANGES_KEY = 'flo_pending_changes';
const MAX_RETRY_COUNT = 3;

export class OfflineSyncService {
  private syncInProgress = false;
  private onlineListener: (() => void) | null = null;

  constructor() {
    this.setupOnlineListener();
  }

  /**
   * Setup listener for online/offline events
   */
  private setupOnlineListener(): void {
    this.onlineListener = () => {
      if (navigator.onLine) {
        this.syncPendingChanges();
      }
    };
    
    window.addEventListener('online', this.onlineListener);
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
  }

  /**
   * Queue a change to be synced when online
   */
  async queueChange(
    type: PendingChange['type'],
    entity: PendingChange['entity'],
    data: any
  ): Promise<void> {
    const change: PendingChange = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    try {
      const pending = this.getPendingChanges();
      pending.push(change);
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pending));
    } catch (error) {
      console.error('Failed to queue change:', error);
      throw new Error('Failed to queue offline change');
    }
  }

  /**
   * Get all pending changes
   */
  private getPendingChanges(): PendingChange[] {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve pending changes:', error);
      return [];
    }
  }

  /**
   * Save pending changes
   */
  private savePendingChanges(changes: PendingChange[]): void {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
    } catch (error) {
      console.error('Failed to save pending changes:', error);
    }
  }

  /**
   * Sync all pending changes
   */
  async syncPendingChanges(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const pending = this.getPendingChanges();
    
    if (pending.length === 0) {
      this.syncInProgress = false;
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;
    const remainingChanges: PendingChange[] = [];

    for (const change of pending) {
      try {
        await this.syncChange(change);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync change ${change.id}:`, error);
        
        change.retryCount++;
        
        if (change.retryCount < MAX_RETRY_COUNT) {
          remainingChanges.push(change);
        } else {
          failedCount++;
          console.error(`Change ${change.id} exceeded max retries, discarding`);
        }
      }
    }

    this.savePendingChanges(remainingChanges);
    this.syncInProgress = false;

    return { success: successCount, failed: failedCount };
  }

  /**
   * Sync a single change to the server
   */
  private async syncChange(change: PendingChange): Promise<void> {
    const endpoint = this.getEndpoint(change.entity);
    const method = this.getHttpMethod(change.type);
    
    let url = endpoint;
    if (change.type === 'update' || change.type === 'delete') {
      url = `${endpoint}/${change.data.id}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: change.type !== 'delete' ? JSON.stringify(change.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Get API endpoint for entity type
   */
  private getEndpoint(entity: PendingChange['entity']): string {
    const baseUrl = '/api';
    
    switch (entity) {
      case 'event':
        return `${baseUrl}/events`;
      case 'preference':
        return `${baseUrl}/preferences`;
      case 'threshold':
        return `${baseUrl}/thresholds`;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  /**
   * Get HTTP method for change type
   */
  private getHttpMethod(type: PendingChange['type']): string {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        throw new Error(`Unknown change type: ${type}`);
    }
  }

  /**
   * Get count of pending changes
   */
  getPendingCount(): number {
    return this.getPendingChanges().length;
  }

  /**
   * Clear all pending changes (use with caution)
   */
  clearPendingChanges(): void {
    try {
      localStorage.removeItem(PENDING_CHANGES_KEY);
    } catch (error) {
      console.error('Failed to clear pending changes:', error);
    }
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.getPendingCount() > 0;
  }
}

export const offlineSync = new OfflineSyncService();
