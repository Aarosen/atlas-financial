/**
 * T1.6: Audit Logging for Compliance
 *
 * Comprehensive audit logging for privacy and compliance:
 * - Track all data access and modifications
 * - Log privacy mode changes
 * - Monitor encryption/decryption operations
 * - Record data retention actions
 * - Generate compliance reports
 *
 * Logs are stored locally (guest_local) or encrypted (signed_in_cloud).
 * Enterprise ZDR mode logs are in-memory only and cleared on session end.
 */

import type { PrivacyMode } from './privacyModes';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  privacyMode: PrivacyMode;
  dataType?: string;
  dataSize?: number;
  status: 'success' | 'failure';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | 'privacy_mode_change'
  | 'data_access'
  | 'data_modification'
  | 'data_deletion'
  | 'encryption_operation'
  | 'decryption_operation'
  | 'cloud_sync_upload'
  | 'cloud_sync_download'
  | 'session_start'
  | 'session_end'
  | 'compliance_check'
  | 'data_export'
  | 'data_retention_policy_change';

export interface AuditReport {
  generatedAt: number;
  userId?: string;
  privacyMode: PrivacyMode;
  period: {
    startTime: number;
    endTime: number;
  };
  summary: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionBreakdown: Record<AuditAction, number>;
  };
  dataHandling: {
    totalDataAccessed: number;
    totalDataModified: number;
    totalDataDeleted: number;
    encryptionOperations: number;
    decryptionOperations: number;
  };
  compliance: {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  };
}

/**
 * In-memory audit log storage
 */
const auditLogs: AuditLogEntry[] = [];

/**
 * Log an audit event
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, 'id'>): AuditLogEntry {
  const auditEntry: AuditLogEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  auditLogs.push(auditEntry);

  // Keep only last 1000 entries in memory
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }

  // Log to console in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', auditEntry);
  }

  return auditEntry;
}

/**
 * Log privacy mode change
 */
export function logPrivacyModeChange(
  oldMode: PrivacyMode,
  newMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'privacy_mode_change',
    privacyMode: newMode,
    status: 'success',
    details: {
      oldMode,
      newMode,
      reason: 'user_initiated',
    },
  });
}

/**
 * Log data access
 */
export function logDataAccess(
  dataType: string,
  dataSize: number,
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'data_access',
    privacyMode,
    dataType,
    dataSize,
    status: 'success',
  });
}

/**
 * Log data modification
 */
export function logDataModification(
  dataType: string,
  dataSize: number,
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'data_modification',
    privacyMode,
    dataType,
    dataSize,
    status: 'success',
  });
}

/**
 * Log data deletion
 */
export function logDataDeletion(
  dataType: string,
  dataSize: number,
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'data_deletion',
    privacyMode,
    dataType,
    dataSize,
    status: 'success',
  });
}

/**
 * Log encryption operation
 */
export function logEncryptionOperation(
  dataSize: number,
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'encryption_operation',
    privacyMode,
    dataSize,
    status: 'success',
  });
}

/**
 * Log decryption operation
 */
export function logDecryptionOperation(
  dataSize: number,
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'decryption_operation',
    privacyMode,
    dataSize,
    status: 'success',
  });
}

/**
 * Log cloud sync upload
 */
export function logCloudSyncUpload(
  dataType: string,
  dataSize: number,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'cloud_sync_upload',
    privacyMode: 'signed_in_cloud',
    dataType,
    dataSize,
    status: 'success',
  });
}

/**
 * Log cloud sync download
 */
export function logCloudSyncDownload(
  dataType: string,
  dataSize: number,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'cloud_sync_download',
    privacyMode: 'signed_in_cloud',
    dataType,
    dataSize,
    status: 'success',
  });
}

/**
 * Log session start
 */
export function logSessionStart(
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'session_start',
    privacyMode,
    status: 'success',
  });
}

/**
 * Log session end
 */
export function logSessionEnd(
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'session_end',
    privacyMode,
    status: 'success',
  });
}

/**
 * Log compliance check
 */
export function logComplianceCheck(
  privacyMode: PrivacyMode,
  isCompliant: boolean,
  issues: string[]
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    action: 'compliance_check',
    privacyMode,
    status: isCompliant ? 'success' : 'failure',
    details: {
      isCompliant,
      issues,
    },
  });
}

/**
 * Log data export
 */
export function logDataExport(
  dataSize: number,
  privacyMode: PrivacyMode,
  userId?: string,
  sessionId?: string
): AuditLogEntry {
  return logAuditEvent({
    timestamp: Date.now(),
    userId,
    sessionId,
    action: 'data_export',
    privacyMode,
    dataSize,
    status: 'success',
  });
}

/**
 * Get all audit logs
 */
export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLogs];
}

/**
 * Get audit logs for a specific user
 */
export function getAuditLogsForUser(userId: string): AuditLogEntry[] {
  return auditLogs.filter(log => log.userId === userId);
}

/**
 * Get audit logs for a specific session
 */
export function getAuditLogsForSession(sessionId: string): AuditLogEntry[] {
  return auditLogs.filter(log => log.sessionId === sessionId);
}

/**
 * Get audit logs for a specific action
 */
export function getAuditLogsForAction(action: AuditAction): AuditLogEntry[] {
  return auditLogs.filter(log => log.action === action);
}

/**
 * Get audit logs within a time period
 */
export function getAuditLogsInPeriod(
  startTime: number,
  endTime: number
): AuditLogEntry[] {
  return auditLogs.filter(
    log => log.timestamp >= startTime && log.timestamp <= endTime
  );
}

/**
 * Generate audit report
 */
export function generateAuditReport(
  privacyMode: PrivacyMode,
  userId?: string,
  startTime?: number,
  endTime?: number
): AuditReport {
  const now = Date.now();
  const start = startTime || now - 24 * 60 * 60 * 1000; // Last 24 hours
  const end = endTime || now;

  // Filter logs
  let filteredLogs = auditLogs.filter(
    log =>
      log.timestamp >= start &&
      log.timestamp <= end &&
      log.privacyMode === privacyMode
  );

  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }

  // Calculate summary
  const actionBreakdown: Record<AuditAction, number> = {
    privacy_mode_change: 0,
    data_access: 0,
    data_modification: 0,
    data_deletion: 0,
    encryption_operation: 0,
    decryption_operation: 0,
    cloud_sync_upload: 0,
    cloud_sync_download: 0,
    session_start: 0,
    session_end: 0,
    compliance_check: 0,
    data_export: 0,
    data_retention_policy_change: 0,
  };

  let totalDataAccessed = 0;
  let totalDataModified = 0;
  let totalDataDeleted = 0;
  let encryptionOperations = 0;
  let decryptionOperations = 0;

  filteredLogs.forEach(log => {
    actionBreakdown[log.action]++;

    if (log.action === 'data_access') {
      totalDataAccessed += log.dataSize || 0;
    } else if (log.action === 'data_modification') {
      totalDataModified += log.dataSize || 0;
    } else if (log.action === 'data_deletion') {
      totalDataDeleted += log.dataSize || 0;
    } else if (log.action === 'encryption_operation') {
      encryptionOperations++;
    } else if (log.action === 'decryption_operation') {
      decryptionOperations++;
    }
  });

  const successfulActions = filteredLogs.filter(
    log => log.status === 'success'
  ).length;
  const failedActions = filteredLogs.filter(
    log => log.status === 'failure'
  ).length;

  // Compliance checks
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (privacyMode === 'guest_local' && totalDataAccessed > 1000000) {
    recommendations.push('Consider using cloud sync for large data volumes');
  }

  if (privacyMode === 'signed_in_cloud' && encryptionOperations === 0) {
    issues.push('No encryption operations detected for cloud sync mode');
  }

  if (failedActions > 0) {
    issues.push(`${failedActions} failed operations detected`);
    recommendations.push('Review failed operations and retry if necessary');
  }

  const isCompliant = issues.length === 0;

  return {
    generatedAt: now,
    userId,
    privacyMode,
    period: {
      startTime: start,
      endTime: end,
    },
    summary: {
      totalActions: filteredLogs.length,
      successfulActions,
      failedActions,
      actionBreakdown,
    },
    dataHandling: {
      totalDataAccessed,
      totalDataModified,
      totalDataDeleted,
      encryptionOperations,
      decryptionOperations,
    },
    compliance: {
      isCompliant,
      issues,
      recommendations,
    },
  };
}

/**
 * Clear audit logs (for privacy reset or logout)
 */
export function clearAuditLogs(): void {
  auditLogs.length = 0;
}

/**
 * Export audit logs as JSON
 */
export function exportAuditLogsAsJSON(): string {
  return JSON.stringify(auditLogs, null, 2);
}

/**
 * Export audit logs as CSV
 */
export function exportAuditLogsAsCSV(): string {
  if (auditLogs.length === 0) {
    return 'id,timestamp,userId,sessionId,action,privacyMode,dataType,dataSize,status\n';
  }

  const headers = [
    'id',
    'timestamp',
    'userId',
    'sessionId',
    'action',
    'privacyMode',
    'dataType',
    'dataSize',
    'status',
  ];

  const rows = auditLogs.map(log =>
    [
      log.id,
      log.timestamp,
      log.userId || '',
      log.sessionId || '',
      log.action,
      log.privacyMode,
      log.dataType || '',
      log.dataSize || '',
      log.status,
    ]
      .map(v => `"${v}"`)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
