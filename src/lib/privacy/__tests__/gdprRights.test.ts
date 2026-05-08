import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  submitDataSubjectRequest,
  verifyDataSubjectRequest,
  processAccessRequest,
  processRectificationRequest,
  processErasureRequest,
  processRestrictProcessingRequest,
  processDataPortabilityRequest,
  processObjectionRequest,
  getDataSubjectRequest,
  getDataSubjectRequestsForUser,
  getPendingDataSubjectRequests,
  isRequestOverdue,
  getDaysRemaining,
  generateGDPRComplianceReport,
  clearDataSubjectRequests,
  type DataSubjectRequest,
} from '../gdprRights';

describe('GDPR Data Subject Rights (T2.1)', () => {
  beforeEach(() => {
    clearDataSubjectRequests();
  });

  afterEach(() => {
    clearDataSubjectRequests();
  });

  describe('submitDataSubjectRequest', () => {
    it('creates access request', () => {
      const request = submitDataSubjectRequest('user_1', 'access');

      expect(request.userId).toBe('user_1');
      expect(request.requestType).toBe('access');
      expect(request.status).toBe('pending');
      expect(request.verificationStatus).toBe('pending');
    });

    it('creates rectification request', () => {
      const request = submitDataSubjectRequest('user_1', 'rectification');

      expect(request.requestType).toBe('rectification');
    });

    it('creates erasure request', () => {
      const request = submitDataSubjectRequest('user_1', 'erasure');

      expect(request.requestType).toBe('erasure');
    });

    it('creates restrict processing request', () => {
      const request = submitDataSubjectRequest('user_1', 'restrict_processing');

      expect(request.requestType).toBe('restrict_processing');
    });

    it('creates data portability request', () => {
      const request = submitDataSubjectRequest('user_1', 'data_portability');

      expect(request.requestType).toBe('data_portability');
    });

    it('creates objection request', () => {
      const request = submitDataSubjectRequest('user_1', 'object');

      expect(request.requestType).toBe('object');
    });

    it('sets 30-day deadline', () => {
      const now = Date.now();
      const request = submitDataSubjectRequest('user_1', 'access');

      const deadline = request.deadline - now;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(deadline).toBeGreaterThan(thirtyDaysMs - 1000);
      expect(deadline).toBeLessThan(thirtyDaysMs + 1000);
    });

    it('generates unique request ID', () => {
      const request1 = submitDataSubjectRequest('user_1', 'access');
      const request2 = submitDataSubjectRequest('user_1', 'access');

      expect(request1.id).not.toBe(request2.id);
    });
  });

  describe('verifyDataSubjectRequest', () => {
    it('verifies request with valid token', () => {
      const request = submitDataSubjectRequest('user_1', 'access');
      const verified = verifyDataSubjectRequest(request.id, 'valid_token');

      expect(verified).toBe(true);
      const updatedRequest = getDataSubjectRequest(request.id);
      expect(updatedRequest?.verificationStatus).toBe('verified');
      expect(updatedRequest?.status).toBe('processing');
    });

    it('fails verification with empty token', () => {
      const request = submitDataSubjectRequest('user_1', 'access');
      const verified = verifyDataSubjectRequest(request.id, '');

      expect(verified).toBe(false);
      const updatedRequest = getDataSubjectRequest(request.id);
      expect(updatedRequest?.verificationStatus).toBe('failed');
    });

    it('fails verification for non-existent request', () => {
      const verified = verifyDataSubjectRequest('invalid_id', 'token');

      expect(verified).toBe(false);
    });
  });

  describe('Right of Access (Article 15)', () => {
    it('processes access request', () => {
      const request = submitDataSubjectRequest('user_1', 'access');
      verifyDataSubjectRequest(request.id, 'token');

      const personalData = {
        profile: { name: 'John Doe' },
        financialState: { income: 5000 },
      };

      const processed = processAccessRequest(request.id, personalData);

      expect(processed.status).toBe('completed');
      expect(processed.personalData).toEqual(personalData);
      expect(processed.completedAt).toBeTruthy();
    });

    it('throws error for non-access request', () => {
      const request = submitDataSubjectRequest('user_1', 'erasure');

      expect(() => {
        processAccessRequest(request.id, {});
      }).toThrow('Invalid access request');
    });
  });

  describe('Right to Rectification (Article 16)', () => {
    it('processes rectification request', () => {
      const request = submitDataSubjectRequest('user_1', 'rectification');
      verifyDataSubjectRequest(request.id, 'token');

      const corrections = [
        {
          fieldName: 'email',
          currentValue: 'old@example.com',
          correctedValue: 'new@example.com',
          reason: 'Email changed',
        },
      ];

      const processed = processRectificationRequest(request.id, corrections);

      expect(processed.status).toBe('completed');
      expect(processed.completedAt).toBeTruthy();
    });
  });

  describe('Right to Erasure (Article 17)', () => {
    it('processes erasure request (approved)', () => {
      const request = submitDataSubjectRequest('user_1', 'erasure');
      verifyDataSubjectRequest(request.id, 'token');

      const processed = processErasureRequest(request.id, true);

      expect(processed.status).toBe('completed');
      expect(processed.denialReason).toBeUndefined();
    });

    it('processes erasure request (denied)', () => {
      const request = submitDataSubjectRequest('user_1', 'erasure');
      verifyDataSubjectRequest(request.id, 'token');

      const processed = processErasureRequest(
        request.id,
        false,
        'Legal obligation to retain'
      );

      expect(processed.status).toBe('denied');
      expect(processed.denialReason).toBe('Legal obligation to retain');
    });
  });

  describe('Right to Restrict Processing (Article 18)', () => {
    it('processes restrict processing request', () => {
      const request = submitDataSubjectRequest('user_1', 'restrict_processing');
      verifyDataSubjectRequest(request.id, 'token');

      const processed = processRestrictProcessingRequest(request.id);

      expect(processed.status).toBe('completed');
    });
  });

  describe('Right to Data Portability (Article 20)', () => {
    it('exports data as JSON', () => {
      const request = submitDataSubjectRequest('user_1', 'data_portability');
      verifyDataSubjectRequest(request.id, 'token');

      const personalData = {
        profile: { name: 'John Doe' },
        financialState: { income: 5000 },
        conversations: [],
        goals: [],
        auditLogs: [],
      };

      const exported = processDataPortabilityRequest(
        request.id,
        personalData,
        'json'
      );

      expect(exported.format).toBe('json');
      expect(exported.userId).toBe('user_1');
      expect(exported.dataCategories.profile).toEqual({ name: 'John Doe' });
      expect(exported.totalSize).toBeGreaterThan(0);
    });

    it('exports data as CSV', () => {
      const request = submitDataSubjectRequest('user_1', 'data_portability');
      verifyDataSubjectRequest(request.id, 'token');

      const personalData = {
        profile: { name: 'John Doe' },
        financialState: { income: 5000 },
        conversations: [],
        goals: [],
        auditLogs: [],
      };

      const exported = processDataPortabilityRequest(
        request.id,
        personalData,
        'csv'
      );

      expect(exported.format).toBe('csv');
    });
  });

  describe('Right to Object (Article 21)', () => {
    it('processes objection request', () => {
      const request = submitDataSubjectRequest('user_1', 'object');
      verifyDataSubjectRequest(request.id, 'token');

      const processed = processObjectionRequest(request.id);

      expect(processed.status).toBe('completed');
    });
  });

  describe('Request Retrieval', () => {
    it('retrieves request by ID', () => {
      const request = submitDataSubjectRequest('user_1', 'access');

      const retrieved = getDataSubjectRequest(request.id);

      expect(retrieved).toEqual(request);
    });

    it('retrieves requests for user', () => {
      submitDataSubjectRequest('user_1', 'access');
      submitDataSubjectRequest('user_1', 'erasure');
      submitDataSubjectRequest('user_2', 'access');

      const user1Requests = getDataSubjectRequestsForUser('user_1');

      expect(user1Requests).toHaveLength(2);
      expect(user1Requests.every(r => r.userId === 'user_1')).toBe(true);
    });

    it('retrieves pending requests', () => {
      const request1 = submitDataSubjectRequest('user_1', 'access');
      const request2 = submitDataSubjectRequest('user_2', 'erasure');

      verifyDataSubjectRequest(request1.id, 'token');
      // request2 stays pending

      const pending = getPendingDataSubjectRequests();

      expect(pending.length).toBeGreaterThan(0);
      expect(pending.some(r => r.id === request2.id)).toBe(true);
    });
  });

  describe('Deadline Management', () => {
    it('checks if request is overdue', () => {
      const request = submitDataSubjectRequest('user_1', 'access');

      // Manually set deadline to past
      (request as any).deadline = Date.now() - 1000;

      expect(isRequestOverdue(request)).toBe(true);
    });

    it('calculates days remaining', () => {
      const request = submitDataSubjectRequest('user_1', 'access');

      const daysRemaining = getDaysRemaining(request);

      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThanOrEqual(30);
    });
  });

  describe('GDPR Compliance Reporting', () => {
    it('generates compliance report', () => {
      submitDataSubjectRequest('user_1', 'access');
      submitDataSubjectRequest('user_1', 'erasure');
      submitDataSubjectRequest('user_2', 'data_portability');

      const report = generateGDPRComplianceReport();

      expect(report.totalRequests).toBe(3);
      expect(report.pendingRequests).toBe(3);
      expect(report.completedRequests).toBe(0);
      expect(report.requestsByType.access).toBe(1);
      expect(report.requestsByType.erasure).toBe(1);
      expect(report.requestsByType.data_portability).toBe(1);
    });

    it('tracks completed requests', () => {
      const request = submitDataSubjectRequest('user_1', 'access');
      verifyDataSubjectRequest(request.id, 'token');
      processAccessRequest(request.id, {});

      const report = generateGDPRComplianceReport();

      expect(report.completedRequests).toBe(1);
      expect(report.pendingRequests).toBe(0);
    });

    it('detects overdue requests', () => {
      const request = submitDataSubjectRequest('user_1', 'access');
      (request as any).deadline = Date.now() - 1000;

      const report = generateGDPRComplianceReport();

      expect(report.overdueRequests).toBeGreaterThan(0);
    });
  });

  describe('T2.1 Integration Tests', () => {
    it('complete access request workflow', () => {
      // 1. Submit request
      const request = submitDataSubjectRequest('user_1', 'access');
      expect(request.status).toBe('pending');

      // 2. Verify identity
      const verified = verifyDataSubjectRequest(request.id, 'verification_token');
      expect(verified).toBe(true);

      // 3. Process request
      const personalData = {
        profile: { name: 'John Doe', email: 'john@example.com' },
        financialState: { income: 5000, expenses: 3000 },
        conversations: [],
        goals: [],
        auditLogs: [],
      };

      const processed = processAccessRequest(request.id, personalData);
      expect(processed.status).toBe('completed');
      expect(processed.personalData).toEqual(personalData);

      // 4. Verify in compliance report
      const report = generateGDPRComplianceReport();
      expect(report.completedRequests).toBe(1);
      expect(report.requestsByType.access).toBe(1);
    });

    it('complete erasure request workflow', () => {
      // 1. Submit erasure request
      const request = submitDataSubjectRequest('user_1', 'erasure');

      // 2. Verify identity
      verifyDataSubjectRequest(request.id, 'token');

      // 3. Process erasure
      const processed = processErasureRequest(request.id, true);
      expect(processed.status).toBe('completed');

      // 4. Verify in compliance report
      const report = generateGDPRComplianceReport();
      expect(report.requestsByType.erasure).toBe(1);
      expect(report.completedRequests).toBe(1);
    });

    it('complete data portability workflow', () => {
      // 1. Submit portability request
      const request = submitDataSubjectRequest('user_1', 'data_portability');

      // 2. Verify identity
      verifyDataSubjectRequest(request.id, 'token');

      // 3. Export data
      const personalData = {
        profile: { name: 'John Doe' },
        financialState: { income: 5000 },
        conversations: [],
        goals: [],
        auditLogs: [],
      };

      const exported = processDataPortabilityRequest(
        request.id,
        personalData,
        'json'
      );
      expect(exported.format).toBe('json');
      expect(exported.totalSize).toBeGreaterThan(0);

      // 4. Verify in compliance report
      const report = generateGDPRComplianceReport();
      expect(report.requestsByType.data_portability).toBe(1);
    });

    it('handles multiple concurrent requests', () => {
      // Multiple users submitting different requests
      const user1Access = submitDataSubjectRequest('user_1', 'access');
      const user1Erasure = submitDataSubjectRequest('user_1', 'erasure');
      const user2Portability = submitDataSubjectRequest('user_2', 'data_portability');

      // Verify different requests
      verifyDataSubjectRequest(user1Access.id, 'token');
      verifyDataSubjectRequest(user2Portability.id, 'token');

      // Process some requests
      processAccessRequest(user1Access.id, {});
      processErasureRequest(user1Erasure.id, true);

      // Check compliance
      const report = generateGDPRComplianceReport();
      expect(report.totalRequests).toBe(3);
      expect(report.completedRequests).toBe(2);
      expect(report.pendingRequests).toBe(1);

      // Check user-specific requests
      const user1Requests = getDataSubjectRequestsForUser('user_1');
      expect(user1Requests).toHaveLength(2);
    });
  });
});
