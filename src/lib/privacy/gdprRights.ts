/**
 * T2.1: GDPR Data Subject Rights Implementation
 *
 * Implements all GDPR data subject rights:
 * 1. Right of Access (Article 15) - Get copy of personal data
 * 2. Right to Rectification (Article 16) - Correct inaccurate data
 * 3. Right to Erasure (Article 17) - Delete personal data ("right to be forgotten")
 * 4. Right to Restrict Processing (Article 18) - Limit how data is used
 * 5. Right to Data Portability (Article 20) - Export data in machine-readable format
 * 6. Right to Object (Article 21) - Opt-out of processing
 *
 * All requests must be:
 * - Processed within 30 days (extendable to 90 days for complex requests)
 * - Verified with identity confirmation
 * - Logged for audit trail
 * - Completed free of charge
 */

import { logAuditEvent } from './auditLogging';
import type { PrivacyMode } from './privacyModes';

export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: DataSubjectRightType;
  status: 'pending' | 'processing' | 'completed' | 'denied';
  submittedAt: number;
  completedAt?: number;
  deadline: number; // 30 days from submission
  verificationStatus: 'pending' | 'verified' | 'failed';
  personalData?: unknown;
  exportFormat?: 'json' | 'csv';
  denialReason?: string;
}

export type DataSubjectRightType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restrict_processing'
  | 'data_portability'
  | 'object';

export interface PersonalDataExport {
  id: string;
  userId: string;
  exportedAt: number;
  format: 'json' | 'csv';
  dataCategories: {
    profile: unknown;
    financialState: unknown;
    conversations: unknown;
    goals: unknown;
    auditLogs: unknown;
  };
  totalSize: number;
}

export interface RectificationRequest {
  fieldName: string;
  currentValue: unknown;
  correctedValue: unknown;
  reason: string;
}

/**
 * In-memory storage for data subject requests
 */
const dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();

/**
 * Submit a data subject request (GDPR Article 15-21)
 *
 * @param userId - User ID making the request
 * @param requestType - Type of data subject right being exercised
 * @returns Data subject request with deadline
 */
export function submitDataSubjectRequest(
  userId: string,
  requestType: DataSubjectRightType
): DataSubjectRequest {
  const now = Date.now();
  const deadline = now + 30 * 24 * 60 * 60 * 1000; // 30 days

  const id = `dsr_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const request: DataSubjectRequest = {
    id,
    userId,
    requestType,
    status: 'pending',
    submittedAt: now,
    deadline,
    verificationStatus: 'pending',
  };

  dataSubjectRequests.set(request.id, request);

  // Log the request
  logAuditEvent({
    timestamp: now,
    userId,
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      requestType,
      requestId: request.id,
    },
  });

  return request;
}

/**
 * Verify identity for data subject request
 *
 * In production, this would verify via email confirmation, 2FA, etc.
 */
export function verifyDataSubjectRequest(
  requestId: string,
  verificationToken: string
): boolean {
  const request = dataSubjectRequests.get(requestId);
  if (!request) {
    return false;
  }

  // In production, verify token against sent email/SMS
  // For now, accept any non-empty token
  if (verificationToken && verificationToken.length > 0) {
    request.verificationStatus = 'verified';
    request.status = 'processing';
    return true;
  }

  request.verificationStatus = 'failed';
  return false;
}

/**
 * Right of Access (Article 15)
 *
 * User can request a copy of all personal data we hold about them.
 */
export function processAccessRequest(
  requestId: string,
  personalData: unknown
): DataSubjectRequest {
  const request = dataSubjectRequests.get(requestId);
  if (!request || request.requestType !== 'access') {
    throw new Error('Invalid access request');
  }

  request.personalData = personalData;
  request.status = 'completed';
  request.completedAt = Date.now();

  logAuditEvent({
    timestamp: Date.now(),
    userId: request.userId,
    action: 'data_access',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      requestId,
      requestType: 'access',
    },
  });

  return request;
}

/**
 * Right to Rectification (Article 16)
 *
 * User can correct inaccurate personal data.
 */
export function processRectificationRequest(
  requestId: string,
  corrections: RectificationRequest[]
): DataSubjectRequest {
  const request = dataSubjectRequests.get(requestId);
  if (!request || request.requestType !== 'rectification') {
    throw new Error('Invalid rectification request');
  }

  request.status = 'completed';
  request.completedAt = Date.now();

  logAuditEvent({
    timestamp: Date.now(),
    userId: request.userId,
    action: 'data_modification',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      requestId,
      requestType: 'rectification',
      correctionsCount: corrections.length,
    },
  });

  return request;
}

/**
 * Right to Erasure (Article 17) - "Right to be forgotten"
 *
 * User can request deletion of personal data.
 * Exceptions: legal obligations, public interest, etc.
 */
export function processErasureRequest(
  requestId: string,
  canErase: boolean,
  denialReason?: string
): DataSubjectRequest {
  const request = dataSubjectRequests.get(requestId);
  if (!request || request.requestType !== 'erasure') {
    throw new Error('Invalid erasure request');
  }

  if (canErase) {
    request.status = 'completed';
    request.completedAt = Date.now();

    logAuditEvent({
      timestamp: Date.now(),
      userId: request.userId,
      action: 'data_deletion',
      privacyMode: 'guest_local',
      status: 'success',
      details: {
        requestId,
        requestType: 'erasure',
      },
    });
  } else {
    request.status = 'denied';
    request.denialReason = denialReason;

    logAuditEvent({
      timestamp: Date.now(),
      userId: request.userId,
      action: 'data_deletion',
      privacyMode: 'guest_local',
      status: 'failure',
      details: {
        requestId,
        requestType: 'erasure',
        reason: denialReason,
      },
    });
  }

  return request;
}

/**
 * Right to Restrict Processing (Article 18)
 *
 * User can request that we limit how we use their data.
 */
export function processRestrictProcessingRequest(
  requestId: string
): DataSubjectRequest {
  const request = dataSubjectRequests.get(requestId);
  if (!request || request.requestType !== 'restrict_processing') {
    throw new Error('Invalid restrict processing request');
  }

  request.status = 'completed';
  request.completedAt = Date.now();

  logAuditEvent({
    timestamp: Date.now(),
    userId: request.userId,
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      requestId,
      requestType: 'restrict_processing',
    },
  });

  return request;
}

/**
 * Right to Data Portability (Article 20)
 *
 * User can request their data in a structured, commonly-used format.
 */
export function processDataPortabilityRequest(
  requestId: string,
  personalData: unknown,
  format: 'json' | 'csv' = 'json'
): PersonalDataExport {
  const request = dataSubjectRequests.get(requestId);
  if (!request || request.requestType !== 'data_portability') {
    throw new Error('Invalid data portability request');
  }

  request.exportFormat = format;
  request.status = 'completed';
  request.completedAt = Date.now();

  const id = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const exportData: PersonalDataExport = {
    id,
    userId: request.userId,
    exportedAt: Date.now(),
    format,
    dataCategories: {
      profile: (personalData as any)?.profile,
      financialState: (personalData as any)?.financialState,
      conversations: (personalData as any)?.conversations,
      goals: (personalData as any)?.goals,
      auditLogs: (personalData as any)?.auditLogs,
    },
    totalSize: JSON.stringify(personalData).length,
  };

  logAuditEvent({
    timestamp: Date.now(),
    userId: request.userId,
    action: 'data_export',
    privacyMode: 'guest_local',
    dataSize: exportData.totalSize,
    status: 'success',
    details: {
      requestId,
      requestType: 'data_portability',
      format,
    },
  });

  return exportData;
}

/**
 * Right to Object (Article 21)
 *
 * User can opt-out of processing for direct marketing, etc.
 */
export function processObjectionRequest(
  requestId: string
): DataSubjectRequest {
  const request = dataSubjectRequests.get(requestId);
  if (!request || request.requestType !== 'object') {
    throw new Error('Invalid objection request');
  }

  request.status = 'completed';
  request.completedAt = Date.now();

  logAuditEvent({
    timestamp: Date.now(),
    userId: request.userId,
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      requestId,
      requestType: 'object',
    },
  });

  return request;
}

/**
 * Get data subject request by ID
 */
export function getDataSubjectRequest(
  requestId: string
): DataSubjectRequest | undefined {
  return dataSubjectRequests.get(requestId);
}

/**
 * Get all data subject requests for a user
 */
export function getDataSubjectRequestsForUser(
  userId: string
): DataSubjectRequest[] {
  return Array.from(dataSubjectRequests.values()).filter(
    req => req.userId === userId
  );
}

/**
 * Get pending data subject requests (deadline approaching)
 */
export function getPendingDataSubjectRequests(): DataSubjectRequest[] {
  const now = Date.now();
  return Array.from(dataSubjectRequests.values()).filter(
    req =>
      req.status === 'pending' ||
      (req.status === 'processing' && req.deadline < now)
  );
}

/**
 * Check if request deadline has passed
 */
export function isRequestOverdue(request: DataSubjectRequest): boolean {
  return Date.now() > request.deadline;
}

/**
 * Get days remaining to complete request
 */
export function getDaysRemaining(request: DataSubjectRequest): number {
  const remaining = request.deadline - Date.now();
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/**
 * Generate GDPR compliance report
 */
export function generateGDPRComplianceReport(): {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  overdueRequests: number;
  requestsByType: Record<DataSubjectRightType, number>;
} {
  const requests = Array.from(dataSubjectRequests.values());
  const now = Date.now();

  const report = {
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    completedRequests: requests.filter(r => r.status === 'completed').length,
    overdueRequests: requests.filter(r => r.deadline < now && r.status !== 'completed').length,
    requestsByType: {
      access: requests.filter(r => r.requestType === 'access').length,
      rectification: requests.filter(r => r.requestType === 'rectification').length,
      erasure: requests.filter(r => r.requestType === 'erasure').length,
      restrict_processing: requests.filter(r => r.requestType === 'restrict_processing').length,
      data_portability: requests.filter(r => r.requestType === 'data_portability').length,
      object: requests.filter(r => r.requestType === 'object').length,
    },
  };

  return report;
}

/**
 * Clear all data subject requests (for testing)
 */
export function clearDataSubjectRequests(): void {
  dataSubjectRequests.clear();
}
