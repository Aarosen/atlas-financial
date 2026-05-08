/**
 * T2.2: Data Retention Policies
 *
 * Implements automatic data retention and deletion schedules.
 * Different data types have different retention periods based on:
 * - Legal requirements
 * - Business needs
 * - User preferences
 * - Privacy regulations (GDPR, CCPA, etc.)
 *
 * Retention periods:
 * - Profile data: Indefinite (until user deletes account)
 * - Financial data: 7 years (tax/audit requirements)
 * - Conversations: 1 year (user preference)
 * - Audit logs: 3 years (compliance)
 * - Temporary data: 30 days (session data)
 */

import { logAuditEvent } from './auditLogging';
import type { PrivacyMode } from './privacyModes';

export interface RetentionPolicy {
  dataType: DataType;
  retentionDays: number;
  archiveAfterDays?: number;
  description: string;
  legalBasis: string;
}

export interface DataRecord {
  id: string;
  dataType: DataType;
  userId: string;
  createdAt: number;
  lastAccessedAt: number;
  size: number;
  archived: boolean;
  archivedAt?: number;
}

export interface RetentionSchedule {
  dataType: DataType;
  nextReviewDate: number;
  itemsToDelete: number;
  itemsToArchive: number;
  estimatedDataSize: number;
}

export type DataType =
  | 'profile'
  | 'financial_state'
  | 'conversation'
  | 'audit_log'
  | 'temporary_session'
  | 'goal'
  | 'action';

/**
 * Default retention policies (in days)
 */
export const DEFAULT_RETENTION_POLICIES: Record<DataType, RetentionPolicy> = {
  profile: {
    dataType: 'profile',
    retentionDays: 36500, // 100 years (indefinite)
    description: 'User profile data',
    legalBasis: 'User consent, contract performance',
  },
  financial_state: {
    dataType: 'financial_state',
    retentionDays: 2555, // 7 years
    archiveAfterDays: 1825, // 5 years
    description: 'Financial data for tax/audit compliance',
    legalBasis: 'Legal obligation (tax records)',
  },
  conversation: {
    dataType: 'conversation',
    retentionDays: 365, // 1 year
    archiveAfterDays: 180, // 6 months
    description: 'Conversation history',
    legalBasis: 'User consent, legitimate interest',
  },
  audit_log: {
    dataType: 'audit_log',
    retentionDays: 1095, // 3 years
    description: 'Audit logs for compliance',
    legalBasis: 'Legal obligation (compliance)',
  },
  temporary_session: {
    dataType: 'temporary_session',
    retentionDays: 30, // 30 days
    description: 'Temporary session data',
    legalBasis: 'Legitimate interest (system operation)',
  },
  goal: {
    dataType: 'goal',
    retentionDays: 2555, // 7 years
    description: 'Financial goals and progress',
    legalBasis: 'User consent',
  },
  action: {
    dataType: 'action',
    retentionDays: 365, // 1 year
    description: 'User actions and commitments',
    legalBasis: 'User consent, legitimate interest',
  },
};

/**
 * In-memory storage for data records
 */
const dataRecords: Map<string, DataRecord> = new Map();

/**
 * In-memory storage for custom retention policies
 */
const customPolicies: Map<string, RetentionPolicy> = new Map();

/**
 * Record data creation/access
 */
export function recordDataAccess(
  dataType: DataType,
  userId: string,
  size: number
): DataRecord {
  const now = Date.now();
  const id = `data_${dataType}_${userId}_${now}`;

  const record: DataRecord = {
    id,
    dataType,
    userId,
    createdAt: now,
    lastAccessedAt: now,
    size,
    archived: false,
  };

  dataRecords.set(id, record);

  return record;
}

/**
 * Update last accessed time
 */
export function updateLastAccess(recordId: string): void {
  const record = dataRecords.get(recordId);
  if (record) {
    record.lastAccessedAt = Date.now();
  }
}

/**
 * Get retention policy for data type
 */
export function getRetentionPolicy(dataType: DataType): RetentionPolicy {
  // Check for custom policy first
  const customPolicy = customPolicies.get(dataType);
  if (customPolicy) {
    return customPolicy;
  }

  // Fall back to default
  return DEFAULT_RETENTION_POLICIES[dataType];
}

/**
 * Set custom retention policy
 */
export function setCustomRetentionPolicy(
  dataType: DataType,
  policy: RetentionPolicy
): void {
  customPolicies.set(dataType, policy);

  logAuditEvent({
    timestamp: Date.now(),
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      dataType,
      retentionDays: policy.retentionDays,
    },
  });
}

/**
 * Check if data record should be deleted
 */
export function shouldDeleteRecord(record: DataRecord): boolean {
  const policy = getRetentionPolicy(record.dataType);
  const ageInDays = (Date.now() - record.createdAt) / (24 * 60 * 60 * 1000);

  return ageInDays > policy.retentionDays;
}

/**
 * Check if data record should be archived
 */
export function shouldArchiveRecord(record: DataRecord): boolean {
  const policy = getRetentionPolicy(record.dataType);
  if (!policy.archiveAfterDays) {
    return false;
  }

  const ageInDays = (Date.now() - record.createdAt) / (24 * 60 * 60 * 1000);
  return ageInDays > policy.archiveAfterDays && !record.archived;
}

/**
 * Archive data record
 */
export function archiveRecord(recordId: string): DataRecord | null {
  const record = dataRecords.get(recordId);
  if (!record) {
    return null;
  }

  record.archived = true;
  record.archivedAt = Date.now();

  logAuditEvent({
    timestamp: Date.now(),
    userId: record.userId,
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    dataType: record.dataType,
    status: 'success',
    details: {
      action: 'archive',
      recordId,
    },
  });

  return record;
}

/**
 * Delete data record
 */
export function deleteRecord(recordId: string): boolean {
  const record = dataRecords.get(recordId);
  if (!record) {
    return false;
  }

  const size = record.size;
  dataRecords.delete(recordId);

  logAuditEvent({
    timestamp: Date.now(),
    userId: record.userId,
    action: 'data_deletion',
    privacyMode: 'guest_local',
    dataType: record.dataType,
    dataSize: size,
    status: 'success',
    details: {
      recordId,
      reason: 'retention_policy_expiration',
    },
  });

  return true;
}

/**
 * Get records eligible for deletion
 */
export function getRecordsForDeletion(): DataRecord[] {
  return Array.from(dataRecords.values()).filter(shouldDeleteRecord);
}

/**
 * Get records eligible for archival
 */
export function getRecordsForArchival(): DataRecord[] {
  return Array.from(dataRecords.values()).filter(shouldArchiveRecord);
}

/**
 * Get retention schedule for next 30 days
 */
export function getRetentionSchedule(): RetentionSchedule[] {
  const schedules: RetentionSchedule[] = [];
  const dataTypes: DataType[] = [
    'profile',
    'financial_state',
    'conversation',
    'audit_log',
    'temporary_session',
    'goal',
    'action',
  ];

  dataTypes.forEach(dataType => {
    const records = Array.from(dataRecords.values()).filter(
      r => r.dataType === dataType
    );

    const itemsToDelete = records.filter(shouldDeleteRecord).length;
    const itemsToArchive = records.filter(shouldArchiveRecord).length;
    const estimatedDataSize = records.reduce((sum, r) => sum + r.size, 0);

    const policy = getRetentionPolicy(dataType);
    const nextReviewDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

    schedules.push({
      dataType,
      nextReviewDate,
      itemsToDelete,
      itemsToArchive,
      estimatedDataSize,
    });
  });

  return schedules;
}

/**
 * Execute retention policy (delete/archive eligible records)
 */
export function executeRetentionPolicy(): {
  deleted: number;
  archived: number;
  totalSize: number;
} {
  let deleted = 0;
  let archived = 0;
  let totalSize = 0;

  // Archive eligible records
  const archiveRecords = getRecordsForArchival();
  archiveRecords.forEach(record => {
    archiveRecord(record.id);
    archived++;
  });

  // Delete eligible records
  const deleteRecords = getRecordsForDeletion();
  deleteRecords.forEach(record => {
    totalSize += record.size;
    deleteRecord(record.id);
    deleted++;
  });

  logAuditEvent({
    timestamp: Date.now(),
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      action: 'execute_retention_policy',
      deleted,
      archived,
      totalSize,
    },
  });

  return { deleted, archived, totalSize };
}

/**
 * Get data retention report
 */
export function getDataRetentionReport(): {
  totalRecords: number;
  totalSize: number;
  recordsByType: Record<DataType, number>;
  sizeByType: Record<DataType, number>;
  archivedRecords: number;
  recordsEligibleForDeletion: number;
  recordsEligibleForArchival: number;
} {
  const records = Array.from(dataRecords.values());
  const recordsByType: Record<DataType, number> = {
    profile: 0,
    financial_state: 0,
    conversation: 0,
    audit_log: 0,
    temporary_session: 0,
    goal: 0,
    action: 0,
  };
  const sizeByType: Record<DataType, number> = {
    profile: 0,
    financial_state: 0,
    conversation: 0,
    audit_log: 0,
    temporary_session: 0,
    goal: 0,
    action: 0,
  };

  records.forEach(record => {
    recordsByType[record.dataType]++;
    sizeByType[record.dataType] += record.size;
  });

  return {
    totalRecords: records.length,
    totalSize: records.reduce((sum, r) => sum + r.size, 0),
    recordsByType,
    sizeByType,
    archivedRecords: records.filter(r => r.archived).length,
    recordsEligibleForDeletion: getRecordsForDeletion().length,
    recordsEligibleForArchival: getRecordsForArchival().length,
  };
}

/**
 * Delete all records for user (account deletion)
 */
export function deleteUserData(userId: string): number {
  const userRecords = Array.from(dataRecords.values()).filter(
    r => r.userId === userId
  );

  let deleted = 0;
  userRecords.forEach(record => {
    if (deleteRecord(record.id)) {
      deleted++;
    }
  });

  logAuditEvent({
    timestamp: Date.now(),
    userId,
    action: 'data_deletion',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      action: 'delete_user_data',
      recordsDeleted: deleted,
    },
  });

  return deleted;
}

/**
 * Clear all data records (for testing)
 */
export function clearDataRecords(): void {
  dataRecords.clear();
}

/**
 * Clear custom policies (for testing)
 */
export function clearCustomPolicies(): void {
  customPolicies.clear();
}
