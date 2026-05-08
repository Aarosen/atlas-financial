import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  logAuditEvent,
  logPrivacyModeChange,
  logDataAccess,
  logDataModification,
  logDataDeletion,
  logEncryptionOperation,
  logDecryptionOperation,
  logCloudSyncUpload,
  logCloudSyncDownload,
  logSessionStart,
  logSessionEnd,
  logComplianceCheck,
  logDataExport,
  getAuditLogs,
  getAuditLogsForUser,
  getAuditLogsForSession,
  getAuditLogsForAction,
  getAuditLogsInPeriod,
  generateAuditReport,
  clearAuditLogs,
  exportAuditLogsAsJSON,
  exportAuditLogsAsCSV,
  type AuditLogEntry,
} from '../auditLogging';

describe('Audit Logging (T1.6)', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  afterEach(() => {
    clearAuditLogs();
  });

  describe('logAuditEvent', () => {
    it('creates audit log entry with unique ID', () => {
      const entry = logAuditEvent({
        timestamp: Date.now(),
        action: 'session_start',
        privacyMode: 'guest_local',
        status: 'success',
      });

      expect(entry.id).toBeTruthy();
      expect(entry.id).toMatch(/^audit_/);
    });

    it('stores audit log in memory', () => {
      logAuditEvent({
        timestamp: Date.now(),
        action: 'session_start',
        privacyMode: 'guest_local',
        status: 'success',
      });

      const logs = getAuditLogs();
      expect(logs).toHaveLength(1);
    });

    it('maintains maximum of 1000 entries', () => {
      for (let i = 0; i < 1100; i++) {
        logAuditEvent({
          timestamp: Date.now(),
          action: 'data_access',
          privacyMode: 'guest_local',
          status: 'success',
        });
      }

      const logs = getAuditLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Privacy Mode Change Logging', () => {
    it('logs privacy mode change', () => {
      logPrivacyModeChange('guest_local', 'signed_in_cloud', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('privacy_mode_change');
      expect(logs[0].privacyMode).toBe('signed_in_cloud');
      expect(logs[0].details?.oldMode).toBe('guest_local');
    });
  });

  describe('Data Operation Logging', () => {
    it('logs data access', () => {
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('data_access');
      expect(logs[0].dataType).toBe('financial_state');
      expect(logs[0].dataSize).toBe(1024);
    });

    it('logs data modification', () => {
      logDataModification('financial_state', 2048, 'guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('data_modification');
      expect(logs[0].dataSize).toBe(2048);
    });

    it('logs data deletion', () => {
      logDataDeletion('financial_state', 512, 'guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('data_deletion');
      expect(logs[0].dataSize).toBe(512);
    });
  });

  describe('Encryption Operation Logging', () => {
    it('logs encryption operation', () => {
      logEncryptionOperation(1024, 'guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('encryption_operation');
      expect(logs[0].dataSize).toBe(1024);
    });

    it('logs decryption operation', () => {
      logDecryptionOperation(1024, 'guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('decryption_operation');
    });
  });

  describe('Cloud Sync Logging', () => {
    it('logs cloud sync upload', () => {
      logCloudSyncUpload('financial_state', 2048, 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('cloud_sync_upload');
      expect(logs[0].privacyMode).toBe('signed_in_cloud');
    });

    it('logs cloud sync download', () => {
      logCloudSyncDownload('financial_state', 2048, 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('cloud_sync_download');
      expect(logs[0].privacyMode).toBe('signed_in_cloud');
    });
  });

  describe('Session Logging', () => {
    it('logs session start', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('session_start');
    });

    it('logs session end', () => {
      logSessionEnd('guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('session_end');
    });
  });

  describe('Compliance Logging', () => {
    it('logs compliance check (compliant)', () => {
      logComplianceCheck('guest_local', true, []);

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('compliance_check');
      expect(logs[0].status).toBe('success');
    });

    it('logs compliance check (non-compliant)', () => {
      logComplianceCheck('guest_local', false, ['Issue 1', 'Issue 2']);

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('compliance_check');
      expect(logs[0].status).toBe('failure');
    });
  });

  describe('Data Export Logging', () => {
    it('logs data export', () => {
      logDataExport(5120, 'guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs[0].action).toBe('data_export');
      expect(logs[0].dataSize).toBe(5120);
    });
  });

  describe('Audit Log Retrieval', () => {
    it('retrieves all audit logs', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');
      logSessionEnd('guest_local', 'user_1', 'session_1');

      const logs = getAuditLogs();
      expect(logs).toHaveLength(3);
    });

    it('retrieves logs for specific user', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logSessionStart('guest_local', 'user_2', 'session_2');

      const user1Logs = getAuditLogsForUser('user_1');
      expect(user1Logs).toHaveLength(1);
      expect(user1Logs[0].userId).toBe('user_1');
    });

    it('retrieves logs for specific session', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');
      logSessionStart('guest_local', 'user_1', 'session_2');

      const session1Logs = getAuditLogsForSession('session_1');
      expect(session1Logs).toHaveLength(2);
    });

    it('retrieves logs for specific action', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');
      logDataAccess('goals', 512, 'guest_local', 'user_1', 'session_1');

      const accessLogs = getAuditLogsForAction('data_access');
      expect(accessLogs).toHaveLength(2);
    });

    it('retrieves logs within time period', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      logAuditEvent({
        timestamp: twoHoursAgo,
        action: 'session_start',
        privacyMode: 'guest_local',
        status: 'success',
      });

      logAuditEvent({
        timestamp: oneHourAgo,
        action: 'data_access',
        privacyMode: 'guest_local',
        status: 'success',
      });

      const recentLogs = getAuditLogsInPeriod(oneHourAgo - 1000, now);
      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0].action).toBe('data_access');
    });
  });

  describe('Audit Report Generation', () => {
    it('generates audit report for privacy mode', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');
      logSessionEnd('guest_local', 'user_1', 'session_1');

      const report = generateAuditReport('guest_local');

      expect(report.privacyMode).toBe('guest_local');
      expect(report.summary.totalActions).toBe(3);
      expect(report.summary.successfulActions).toBe(3);
      expect(report.summary.failedActions).toBe(0);
    });

    it('generates report with action breakdown', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');
      logDataModification('financial_state', 512, 'guest_local', 'user_1', 'session_1');

      const report = generateAuditReport('guest_local');

      expect(report.summary.actionBreakdown.session_start).toBe(1);
      expect(report.summary.actionBreakdown.data_access).toBe(1);
      expect(report.summary.actionBreakdown.data_modification).toBe(1);
    });

    it('calculates data handling metrics', () => {
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');
      logDataModification('financial_state', 512, 'guest_local', 'user_1', 'session_1');
      logDataDeletion('financial_state', 256, 'guest_local', 'user_1', 'session_1');

      const report = generateAuditReport('guest_local');

      expect(report.dataHandling.totalDataAccessed).toBe(1024);
      expect(report.dataHandling.totalDataModified).toBe(512);
      expect(report.dataHandling.totalDataDeleted).toBe(256);
    });

    it('assesses compliance', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');

      const report = generateAuditReport('guest_local');

      expect(report.compliance.isCompliant).toBe(true);
      expect(report.compliance.issues).toHaveLength(0);
    });

    it('detects compliance issues', () => {
      logAuditEvent({
        timestamp: Date.now(),
        action: 'data_access',
        privacyMode: 'guest_local',
        status: 'failure',
      });

      const report = generateAuditReport('guest_local');

      expect(report.compliance.isCompliant).toBe(false);
      expect(report.compliance.issues.length).toBeGreaterThan(0);
    });

    it('filters report by user', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logSessionStart('guest_local', 'user_2', 'session_2');

      const report = generateAuditReport('guest_local', 'user_1');

      expect(report.userId).toBe('user_1');
      expect(report.summary.totalActions).toBe(1);
    });
  });

  describe('Audit Log Export', () => {
    it('exports logs as JSON', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');

      const json = exportAuditLogsAsJSON();

      expect(json).toBeTruthy();
      expect(json).toContain('session_start');
      expect(JSON.parse(json)).toBeInstanceOf(Array);
    });

    it('exports logs as CSV', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');

      const csv = exportAuditLogsAsCSV();

      expect(csv).toBeTruthy();
      expect(csv).toContain('id,timestamp');
      expect(csv).toContain('session_start');
    });

    it('CSV export includes headers', () => {
      const csv = exportAuditLogsAsCSV();

      expect(csv).toContain('id');
      expect(csv).toContain('timestamp');
      expect(csv).toContain('action');
      expect(csv).toContain('privacyMode');
    });
  });

  describe('Audit Log Clearing', () => {
    it('clears all audit logs', () => {
      logSessionStart('guest_local', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'guest_local', 'user_1', 'session_1');

      expect(getAuditLogs()).toHaveLength(2);

      clearAuditLogs();

      expect(getAuditLogs()).toHaveLength(0);
    });
  });

  describe('T1.6 Integration Tests', () => {
    it('complete audit trail for user session', () => {
      const userId = 'user_1';
      const sessionId = 'session_1';

      // Session lifecycle
      logSessionStart('guest_local', userId, sessionId);
      logDataAccess('financial_state', 1024, 'guest_local', userId, sessionId);
      logDataModification('financial_state', 512, 'guest_local', userId, sessionId);
      logDataExport(1536, 'guest_local', userId, sessionId);
      logSessionEnd('guest_local', userId, sessionId);

      // Verify complete trail
      const sessionLogs = getAuditLogsForSession(sessionId);
      expect(sessionLogs).toHaveLength(5);
      expect(sessionLogs[0].action).toBe('session_start');
      expect(sessionLogs[4].action).toBe('session_end');

      // Generate report
      const report = generateAuditReport('guest_local', userId);
      expect(report.summary.totalActions).toBe(5);
      expect(report.dataHandling.totalDataAccessed).toBe(1024);
      expect(report.dataHandling.totalDataModified).toBe(512);
    });

    it('tracks privacy mode migration', () => {
      const userId = 'user_1';

      logSessionStart('guest_local', userId, 'session_1');
      logPrivacyModeChange('guest_local', 'signed_in_cloud', userId, 'session_1');
      logCloudSyncUpload('financial_state', 2048, userId, 'session_1');
      logSessionEnd('signed_in_cloud', userId, 'session_1');

      const userLogs = getAuditLogsForUser(userId);
      expect(userLogs).toHaveLength(4);
      expect(userLogs[1].action).toBe('privacy_mode_change');
      expect(userLogs[2].action).toBe('cloud_sync_upload');
    });

    it('compliance audit for ZDR mode', () => {
      logSessionStart('enterprise_zdr', 'user_1', 'session_1');
      logDataAccess('financial_state', 1024, 'enterprise_zdr', 'user_1', 'session_1');
      logComplianceCheck('enterprise_zdr', true, []);
      logSessionEnd('enterprise_zdr', 'user_1', 'session_1');

      const report = generateAuditReport('enterprise_zdr');

      expect(report.privacyMode).toBe('enterprise_zdr');
      expect(report.compliance.isCompliant).toBe(true);
      expect(report.summary.totalActions).toBe(4);
    });
  });
});
