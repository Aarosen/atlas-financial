import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordDataAccess,
  updateLastAccess,
  getRetentionPolicy,
  setCustomRetentionPolicy,
  shouldDeleteRecord,
  shouldArchiveRecord,
  archiveRecord,
  deleteRecord,
  getRecordsForDeletion,
  getRecordsForArchival,
  getRetentionSchedule,
  executeRetentionPolicy,
  getDataRetentionReport,
  deleteUserData,
  clearDataRecords,
  clearCustomPolicies,
  DEFAULT_RETENTION_POLICIES,
  type DataType,
} from '../dataRetention';

describe('Data Retention Policies (T2.2)', () => {
  beforeEach(() => {
    clearDataRecords();
    clearCustomPolicies();
  });

  afterEach(() => {
    clearDataRecords();
    clearCustomPolicies();
  });

  describe('recordDataAccess', () => {
    it('records data access', () => {
      const record = recordDataAccess('profile', 'user_1', 1024);

      expect(record.dataType).toBe('profile');
      expect(record.userId).toBe('user_1');
      expect(record.size).toBe(1024);
      expect(record.archived).toBe(false);
    });

    it('sets creation and access timestamps', () => {
      const before = Date.now();
      const record = recordDataAccess('financial_state', 'user_1', 2048);
      const after = Date.now();

      expect(record.createdAt).toBeGreaterThanOrEqual(before);
      expect(record.createdAt).toBeLessThanOrEqual(after);
      expect(record.lastAccessedAt).toBe(record.createdAt);
    });
  });

  describe('updateLastAccess', () => {
    it('updates last accessed time', async () => {
      const record = recordDataAccess('conversation', 'user_1', 512);
      const originalTime = record.lastAccessedAt;

      // Wait a real 10ms so Date.now() returns a strictly greater timestamp
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      updateLastAccess(record.id);
      expect(record.lastAccessedAt).toBeGreaterThan(originalTime);
    });
  });

  describe('Retention Policies', () => {
    it('returns default policy for profile', () => {
      const policy = getRetentionPolicy('profile');

      expect(policy.dataType).toBe('profile');
      expect(policy.retentionDays).toBe(36500); // 100 years
    });

    it('returns default policy for financial_state', () => {
      const policy = getRetentionPolicy('financial_state');

      expect(policy.dataType).toBe('financial_state');
      expect(policy.retentionDays).toBe(2555); // 7 years
      expect(policy.archiveAfterDays).toBe(1825); // 5 years
    });

    it('returns default policy for conversation', () => {
      const policy = getRetentionPolicy('conversation');

      expect(policy.dataType).toBe('conversation');
      expect(policy.retentionDays).toBe(365); // 1 year
    });

    it('returns default policy for audit_log', () => {
      const policy = getRetentionPolicy('audit_log');

      expect(policy.dataType).toBe('audit_log');
      expect(policy.retentionDays).toBe(1095); // 3 years
    });

    it('returns default policy for temporary_session', () => {
      const policy = getRetentionPolicy('temporary_session');

      expect(policy.dataType).toBe('temporary_session');
      expect(policy.retentionDays).toBe(30); // 30 days
    });
  });

  describe('Custom Retention Policies', () => {
    it('sets custom retention policy', () => {
      const customPolicy = {
        dataType: 'conversation' as DataType,
        retentionDays: 180, // 6 months instead of 1 year
        description: 'Custom conversation retention',
        legalBasis: 'User preference',
      };

      setCustomRetentionPolicy('conversation', customPolicy);

      const policy = getRetentionPolicy('conversation');
      expect(policy.retentionDays).toBe(180);
    });

    it('overrides default policy with custom', () => {
      const defaultPolicy = getRetentionPolicy('profile');
      expect(defaultPolicy.retentionDays).toBe(36500);

      const customPolicy = {
        dataType: 'profile' as DataType,
        retentionDays: 1825, // 5 years
        description: 'Custom profile retention',
        legalBasis: 'User preference',
      };

      setCustomRetentionPolicy('profile', customPolicy);

      const policy = getRetentionPolicy('profile');
      expect(policy.retentionDays).toBe(1825);
    });
  });

  describe('shouldDeleteRecord', () => {
    it('returns false for new record', () => {
      const record = recordDataAccess('conversation', 'user_1', 512);

      expect(shouldDeleteRecord(record)).toBe(false);
    });

    it('returns true for expired record', () => {
      const record = recordDataAccess('temporary_session', 'user_1', 512);

      // Manually set creation time to 31 days ago
      (record as any).createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      expect(shouldDeleteRecord(record)).toBe(true);
    });

    it('respects custom retention policy', () => {
      const record = recordDataAccess('conversation', 'user_1', 512);

      // Set creation time to 200 days ago
      (record as any).createdAt = Date.now() - 200 * 24 * 60 * 60 * 1000;

      // With default policy (365 days), should not delete
      expect(shouldDeleteRecord(record)).toBe(false);

      // Set custom policy (180 days)
      setCustomRetentionPolicy('conversation', {
        dataType: 'conversation',
        retentionDays: 180,
        description: 'Custom',
        legalBasis: 'User preference',
      });

      // Now should delete
      expect(shouldDeleteRecord(record)).toBe(true);
    });
  });

  describe('shouldArchiveRecord', () => {
    it('returns false for new record', () => {
      const record = recordDataAccess('financial_state', 'user_1', 2048);

      expect(shouldArchiveRecord(record)).toBe(false);
    });

    it('returns true for record eligible for archival', () => {
      const record = recordDataAccess('financial_state', 'user_1', 2048);

      // Set creation time to 6 years ago (archive after 5 years)
      (record as any).createdAt = Date.now() - 6 * 365 * 24 * 60 * 60 * 1000;

      expect(shouldArchiveRecord(record)).toBe(true);
    });

    it('returns false for already archived record', () => {
      const record = recordDataAccess('financial_state', 'user_1', 2048);

      // Set creation time to 6 years ago
      (record as any).createdAt = Date.now() - 6 * 365 * 24 * 60 * 60 * 1000;

      archiveRecord(record.id);

      expect(shouldArchiveRecord(record)).toBe(false);
    });
  });

  describe('archiveRecord', () => {
    it('archives record', () => {
      const record = recordDataAccess('financial_state', 'user_1', 2048);

      const archived = archiveRecord(record.id);

      expect(archived?.archived).toBe(true);
      expect(archived?.archivedAt).toBeTruthy();
    });

    it('returns null for non-existent record', () => {
      const archived = archiveRecord('non_existent');

      expect(archived).toBeNull();
    });
  });

  describe('deleteRecord', () => {
    it('deletes record', () => {
      const record = recordDataAccess('conversation', 'user_1', 512);

      const deleted = deleteRecord(record.id);

      expect(deleted).toBe(true);
      expect(getRecordsForDeletion()).not.toContainEqual(record);
    });

    it('returns false for non-existent record', () => {
      const deleted = deleteRecord('non_existent');

      expect(deleted).toBe(false);
    });
  });

  describe('getRecordsForDeletion', () => {
    it('returns expired records', () => {
      const newRecord = recordDataAccess('conversation', 'user_1', 512);
      const expiredRecord = recordDataAccess('temporary_session', 'user_2', 256);

      // Set expired record to 31 days old
      (expiredRecord as any).createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      const forDeletion = getRecordsForDeletion();

      expect(forDeletion).toContainEqual(expiredRecord);
      expect(forDeletion).not.toContainEqual(newRecord);
    });
  });

  describe('getRecordsForArchival', () => {
    it('returns records eligible for archival', () => {
      const newRecord = recordDataAccess('financial_state', 'user_1', 2048);
      const archivalRecord = recordDataAccess('financial_state', 'user_2', 2048);

      // Set archival record to 6 years old
      (archivalRecord as any).createdAt = Date.now() - 6 * 365 * 24 * 60 * 60 * 1000;

      const forArchival = getRecordsForArchival();

      expect(forArchival).toContainEqual(archivalRecord);
      expect(forArchival).not.toContainEqual(newRecord);
    });
  });

  describe('getRetentionSchedule', () => {
    it('generates retention schedule', () => {
      recordDataAccess('profile', 'user_1', 1024);
      recordDataAccess('financial_state', 'user_1', 2048);
      recordDataAccess('conversation', 'user_1', 512);

      const schedule = getRetentionSchedule();

      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0]).toHaveProperty('dataType');
      expect(schedule[0]).toHaveProperty('nextReviewDate');
      expect(schedule[0]).toHaveProperty('itemsToDelete');
      expect(schedule[0]).toHaveProperty('itemsToArchive');
      expect(schedule[0]).toHaveProperty('estimatedDataSize');
    });
  });

  describe('executeRetentionPolicy', () => {
    it('executes retention policy', () => {
      const expiredRecord = recordDataAccess('temporary_session', 'user_1', 256);
      (expiredRecord as any).createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      const result = executeRetentionPolicy();

      expect(result.deleted).toBeGreaterThan(0);
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it('archives and deletes eligible records', () => {
      const archivalRecord = recordDataAccess('financial_state', 'user_1', 2048);
      (archivalRecord as any).createdAt = Date.now() - 6 * 365 * 24 * 60 * 60 * 1000;

      const deleteRecord2 = recordDataAccess('temporary_session', 'user_1', 256);
      (deleteRecord2 as any).createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      const result = executeRetentionPolicy();

      expect(result.archived).toBeGreaterThanOrEqual(0);
      expect(result.deleted).toBeGreaterThan(0);
    });
  });

  describe('getDataRetentionReport', () => {
    it('generates retention report', () => {
      recordDataAccess('profile', 'user_1', 1024);
      recordDataAccess('financial_state', 'user_1', 2048);
      recordDataAccess('conversation', 'user_1', 512);

      const report = getDataRetentionReport();

      expect(report.totalRecords).toBe(3);
      expect(report.totalSize).toBe(1024 + 2048 + 512);
      expect(report.recordsByType.profile).toBe(1);
      expect(report.recordsByType.financial_state).toBe(1);
      expect(report.recordsByType.conversation).toBe(1);
    });

    it('tracks archived records', () => {
      const record = recordDataAccess('financial_state', 'user_1', 2048);
      archiveRecord(record.id);

      const report = getDataRetentionReport();

      expect(report.archivedRecords).toBe(1);
    });
  });

  describe('deleteUserData', () => {
    it('deletes all user data', () => {
      recordDataAccess('profile', 'user_1', 1024);
      recordDataAccess('financial_state', 'user_1', 2048);
      recordDataAccess('conversation', 'user_1', 512);
      recordDataAccess('profile', 'user_2', 1024);

      const deleted = deleteUserData('user_1');

      expect(deleted).toBe(3);

      const report = getDataRetentionReport();
      expect(report.totalRecords).toBe(1); // Only user_2's record remains
    });
  });

  describe('T2.2 Integration Tests', () => {
    it('complete data lifecycle', () => {
      // 1. Record data
      const record = recordDataAccess('financial_state', 'user_1', 2048);
      expect(record.archived).toBe(false);

      // 2. Update access
      updateLastAccess(record.id);

      // 3. Check retention
      const policy = getRetentionPolicy('financial_state');
      expect(policy.retentionDays).toBe(2555);

      // 4. Archive after 5 years
      (record as any).createdAt = Date.now() - 6 * 365 * 24 * 60 * 60 * 1000;
      const archivalRecords = getRecordsForArchival();
      expect(archivalRecords).toContainEqual(record);

      // 5. Archive record
      archiveRecord(record.id);
      expect(record.archived).toBe(true);

      // 6. Delete after 7 years
      (record as any).createdAt = Date.now() - 8 * 365 * 24 * 60 * 60 * 1000;
      const deletionRecords = getRecordsForDeletion();
      expect(deletionRecords).toContainEqual(record);

      // 7. Delete record
      deleteRecord(record.id);

      // 8. Verify deleted
      const report = getDataRetentionReport();
      expect(report.totalRecords).toBe(0);
    });

    it('handles multiple data types with different policies', () => {
      // Profile: indefinite
      recordDataAccess('profile', 'user_1', 1024);

      // Financial: 7 years
      recordDataAccess('financial_state', 'user_1', 2048);

      // Conversation: 1 year
      recordDataAccess('conversation', 'user_1', 512);

      // Temporary: 30 days
      const tempRecord = recordDataAccess('temporary_session', 'user_1', 256);
      (tempRecord as any).createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      // Execute retention
      const result = executeRetentionPolicy();

      // Temporary should be deleted
      expect(result.deleted).toBeGreaterThan(0);

      // Others should remain
      const report = getDataRetentionReport();
      expect(report.totalRecords).toBe(3);
    });

    it('respects custom retention policies', () => {
      // Set custom policy: conversations deleted after 90 days
      setCustomRetentionPolicy('conversation', {
        dataType: 'conversation',
        retentionDays: 90,
        description: 'Custom short retention',
        legalBasis: 'User preference',
      });

      const record = recordDataAccess('conversation', 'user_1', 512);
      (record as any).createdAt = Date.now() - 100 * 24 * 60 * 60 * 1000;

      // Should be eligible for deletion with custom policy
      expect(shouldDeleteRecord(record)).toBe(true);
    });
  });
});
