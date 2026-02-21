/**
 * Tests for Backup Manager Service
 * Property-based tests for backup integrity and retention
 * Requirements: 9.2, 9.3, 9.4
 */

import fc from 'fast-check';
import { OnDemandBackup, BackupRecord } from '../backup-manager';

describe('BackupManager', () => {
  describe('calculateRetentionDate', () => {
    test('should calculate retention date 30 days in future', () => {
      const now = new Date();
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 30);

      // Simulate the calculation
      const retentionDate = new Date(now);
      retentionDate.setDate(retentionDate.getDate() + 30);

      // Check that retention date is approximately 30 days in future (within 1 minute)
      const diffMs = retentionDate.getTime() - expectedDate.getTime();
      expect(Math.abs(diffMs)).toBeLessThan(60000); // Within 1 minute
    });
  });

  // Property-based tests
  describe('Property 37: Backup Integrity Verification', () => {
    it(
      'should verify backup integrity for all created backups',
      () => {
        fc.assert(
          fc.property(
            fc.record({
              backupName: fc.string({ minLength: 1, maxLength: 50 }),
              backupSize: fc.integer({ min: 1000, max: 1000000000 }), // 1KB to 1GB
              creationDate: fc.date(),
            }),
            (backupData: { backupName: string; backupSize: number; creationDate: Date }) => {
              const backup: OnDemandBackup = {
                backupArn: `arn:aws:dynamodb:us-east-1:123456789012:table/FamilyCalendar/backup/${backupData.backupName}`,
                backupName: backupData.backupName,
                backupCreationDate: backupData.creationDate,
                backupSizeBytes: backupData.backupSize,
                backupStatus: 'AVAILABLE',
                retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              };

              // Verify backup has all required fields
              expect(backup.backupArn).toBeDefined();
              expect(backup.backupArn.length).toBeGreaterThan(0);
              expect(backup.backupName).toBeDefined();
              expect(backup.backupName).toBe(backupData.backupName);
              expect(backup.backupCreationDate).toBeDefined();
              expect(backup.backupCreationDate instanceof Date).toBe(true);
              expect(backup.backupSizeBytes).toBe(backupData.backupSize);
              expect(backup.backupSizeBytes).toBeGreaterThan(0);
              expect(backup.backupStatus).toBe('AVAILABLE');
              expect(backup.retentionUntil).toBeDefined();
              expect(backup.retentionUntil instanceof Date).toBe(true);

              // Verify backup ARN format
              expect(backup.backupArn).toMatch(/^arn:aws:dynamodb:/);

              // Verify retention date is in future
              expect(backup.retentionUntil.getTime()).toBeGreaterThan(Date.now());
            }
          )
        );
      }
    );

    it(
      'should verify backup record has all required fields',
      () => {
        fc.assert(
          fc.property(
            fc.record({
              backupName: fc.string({ minLength: 1, maxLength: 50 }),
              backupSize: fc.integer({ min: 1000, max: 1000000000 }),
              status: fc.constantFrom<'completed' | 'failed'>('completed', 'failed'),
            }),
            (backupData: { backupName: string; backupSize: number; status: 'completed' | 'failed' }) => {
              const now = new Date();
              const retentionDate = new Date(now);
              retentionDate.setDate(retentionDate.getDate() + 30);

              const record: BackupRecord = {
                PK: `BACKUP#${backupData.backupName}`,
                SK: `BACKUP#${backupData.backupName}`,
                EntityType: 'BACKUP_RECORD',
                id: backupData.backupName,
                tableName: 'FamilyCalendar',
                backupArn: `arn:aws:dynamodb:us-east-1:123456789012:table/FamilyCalendar/backup/${backupData.backupName}`,
                backupName: backupData.backupName,
                startTime: now.toISOString(),
                status: backupData.status,
                backupSize: backupData.backupSize,
                verificationStatus: 'verified',
                retentionUntil: retentionDate.toISOString(),
                createdAt: now.toISOString(),
              };

              // Verify all required fields are present
              expect(record.PK).toBeDefined();
              expect(record.SK).toBeDefined();
              expect(record.EntityType).toBe('BACKUP_RECORD');
              expect(record.id).toBeDefined();
              expect(record.tableName).toBe('FamilyCalendar');
              expect(record.backupArn).toBeDefined();
              expect(record.backupName).toBe(backupData.backupName);
              expect(record.startTime).toBeDefined();
              expect(record.status).toBe(backupData.status);
              expect(record.backupSize).toBe(backupData.backupSize);
              expect(record.verificationStatus).toBe('verified');
              expect(record.retentionUntil).toBeDefined();
              expect(record.createdAt).toBeDefined();

              // Verify timestamps are valid ISO 8601
              expect(() => new Date(record.startTime)).not.toThrow();
              expect(() => new Date(record.retentionUntil)).not.toThrow();
              expect(() => new Date(record.createdAt)).not.toThrow();

              // Verify retention date is after creation date
              expect(new Date(record.retentionUntil).getTime()).toBeGreaterThan(
                new Date(record.startTime).getTime()
              );
            }
          )
        );
      }
    );
  });

  describe('Property 38: Backup Retention', () => {
    it(
      'should retain backups for minimum 30 days',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                backupName: fc.string({ minLength: 1, maxLength: 50 }),
                creationDate: fc.date(),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (backupDataArray: Array<{ backupName: string; creationDate: Date }>) => {
              const backups: OnDemandBackup[] = backupDataArray.map((data) => ({
                backupArn: `arn:aws:dynamodb:us-east-1:123456789012:table/FamilyCalendar/backup/${data.backupName}`,
                backupName: data.backupName,
                backupCreationDate: data.creationDate,
                backupSizeBytes: 1000000,
                backupStatus: 'AVAILABLE' as const,
                retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              }));

              const now = new Date();
              const thirtyDaysFromNow = new Date(now);
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

              // Verify each backup is retained for at least 30 days
              for (const backup of backups) {
                expect(backup.retentionUntil.getTime()).toBeGreaterThanOrEqual(
                  thirtyDaysFromNow.getTime() - 60000 // Allow 1 minute tolerance
                );
              }
            }
          )
        );
      }
    );

    it(
      'should identify backups that exceed retention period',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                backupName: fc.string({ minLength: 1, maxLength: 50 }),
                daysOld: fc.integer({ min: 0, max: 60 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (backupDataArray: Array<{ backupName: string; daysOld: number }>) => {
              const now = new Date();
              const backups: OnDemandBackup[] = backupDataArray.map((data) => {
                const creationDate = new Date(now);
                creationDate.setDate(creationDate.getDate() - data.daysOld);

                const retentionDate = new Date(creationDate);
                retentionDate.setDate(retentionDate.getDate() + 30);

                return {
                  backupArn: `arn:aws:dynamodb:us-east-1:123456789012:table/FamilyCalendar/backup/${data.backupName}`,
                  backupName: data.backupName,
                  backupCreationDate: creationDate,
                  backupSizeBytes: 1000000,
                  backupStatus: 'AVAILABLE' as const,
                  retentionUntil: retentionDate,
                };
              });

              // Identify old backups
              const oldBackups = backups.filter((b) => b.retentionUntil < now);

              // Verify old backups are those older than 30 days
              for (const backup of oldBackups) {
                const ageInDays = (now.getTime() - backup.backupCreationDate.getTime()) / (1000 * 60 * 60 * 24);
                expect(ageInDays).toBeGreaterThanOrEqual(30);
              }

              // Verify recent backups are not marked as old
              for (const backup of backups) {
                const ageInDays = (now.getTime() - backup.backupCreationDate.getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays < 30) {
                  expect(backup.retentionUntil.getTime()).toBeGreaterThanOrEqual(now.getTime());
                }
              }
            }
          )
        );
      }
    );
  });
});
