import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeCertification,
  getCertification,
  getAllCertifications,
  updateRequirementStatus,
  updateCertificationStatus,
  generateComplianceReport,
  clearCertifications,
  COMPLIANCE_CERTIFICATIONS,
} from '../complianceCertifications';

describe('Compliance Certifications (T2.5)', () => {
  beforeEach(() => {
    clearCertifications();
  });

  afterEach(() => {
    clearCertifications();
  });

  describe('initializeCertification', () => {
    it('initializes SOC 2 certification', () => {
      const cert = initializeCertification('soc2');

      expect(cert.name).toBe('SOC 2 Type II');
      expect(cert.type).toBe('certification');
      expect(cert.status).toBe('not_started');
      expect(cert.requirements.length).toBeGreaterThan(0);
    });

    it('initializes HIPAA readiness', () => {
      const cert = initializeCertification('hipaa');

      expect(cert.name).toBe('HIPAA');
      expect(cert.type).toBe('readiness');
    });

    it('initializes PCI-DSS certification', () => {
      const cert = initializeCertification('pci_dss');

      expect(cert.name).toBe('PCI-DSS');
      expect(cert.scope).toContain('payment_data');
    });

    it('initializes GDPR readiness', () => {
      const cert = initializeCertification('gdpr');

      expect(cert.name).toBe('GDPR');
      expect(cert.requirements.some(r => r.name === 'Data Subject Rights')).toBe(true);
    });

    it('initializes CCPA readiness', () => {
      const cert = initializeCertification('ccpa');

      expect(cert.name).toBe('CCPA');
    });

    it('initializes ISO 27001 certification', () => {
      const cert = initializeCertification('iso27001');

      expect(cert.name).toBe('ISO 27001');
    });

    it('generates unique certification IDs', () => {
      const cert1 = initializeCertification('soc2');
      const cert2 = initializeCertification('soc2');

      expect(cert1.id).not.toBe(cert2.id);
    });

    it('throws error for unknown certification', () => {
      expect(() => {
        initializeCertification('unknown');
      }).toThrow('Unknown certification: unknown');
    });
  });

  describe('getCertification', () => {
    it('retrieves certification by ID', () => {
      const cert = initializeCertification('soc2');

      const retrieved = getCertification(cert.id);

      expect(retrieved).toEqual(cert);
    });

    it('returns undefined for non-existent certification', () => {
      const retrieved = getCertification('non_existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllCertifications', () => {
    it('returns all initialized certifications', () => {
      initializeCertification('soc2');
      initializeCertification('gdpr');
      initializeCertification('pci_dss');

      const certs = getAllCertifications();

      expect(certs).toHaveLength(3);
    });

    it('returns empty array when no certifications', () => {
      const certs = getAllCertifications();

      expect(certs).toEqual([]);
    });
  });

  describe('updateRequirementStatus', () => {
    it('updates requirement to in_progress', () => {
      const cert = initializeCertification('soc2');
      const requirementId = cert.requirements[0].id;

      const updated = updateRequirementStatus(cert.id, requirementId, 'in_progress');

      expect(updated?.requirements[0].status).toBe('in_progress');
    });

    it('updates requirement to completed', () => {
      const cert = initializeCertification('soc2');
      const requirementId = cert.requirements[0].id;

      const updated = updateRequirementStatus(cert.id, requirementId, 'completed', [
        'audit_report.pdf',
      ]);

      expect(updated?.requirements[0].status).toBe('completed');
      expect(updated?.requirements[0].completedAt).toBeTruthy();
      expect(updated?.requirements[0].evidence).toContain('audit_report.pdf');
    });

    it('returns null for non-existent certification', () => {
      const updated = updateRequirementStatus('non_existent', 'req_1', 'completed');

      expect(updated).toBeNull();
    });

    it('returns null for non-existent requirement', () => {
      const cert = initializeCertification('soc2');

      const updated = updateRequirementStatus(cert.id, 'non_existent', 'completed');

      expect(updated).toBeNull();
    });

    it('updates certification score', () => {
      const cert = initializeCertification('soc2');

      expect(cert.score).toBe(0);

      cert.requirements.forEach(req => {
        updateRequirementStatus(cert.id, req.id, 'completed');
      });

      const updated = getCertification(cert.id);
      expect(updated?.score).toBe(100);
    });
  });

  describe('updateCertificationStatus', () => {
    it('updates certification status to in_progress', () => {
      const cert = initializeCertification('soc2');

      const updated = updateCertificationStatus(cert.id, 'in_progress');

      expect(updated?.status).toBe('in_progress');
    });

    it('updates certification status to completed', () => {
      const cert = initializeCertification('soc2');

      const updated = updateCertificationStatus(cert.id, 'completed');

      expect(updated?.status).toBe('completed');
      expect(updated?.certificationDate).toBeTruthy();
      expect(updated?.expirationDate).toBeTruthy();
    });

    it('sets expiration date to 1 year from completion', () => {
      const cert = initializeCertification('soc2');
      const before = Date.now();

      updateCertificationStatus(cert.id, 'completed');

      const updated = getCertification(cert.id);
      const expirationTime = updated!.expirationDate! - before;
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;

      expect(expirationTime).toBeGreaterThan(oneYearMs - 1000);
      expect(expirationTime).toBeLessThan(oneYearMs + 1000);
    });

    it('returns null for non-existent certification', () => {
      const updated = updateCertificationStatus('non_existent', 'completed');

      expect(updated).toBeNull();
    });
  });

  describe('generateComplianceReport', () => {
    it('generates report with all certifications', () => {
      initializeCertification('soc2');
      initializeCertification('gdpr');
      initializeCertification('pci_dss');

      const report = generateComplianceReport();

      expect(report.certifications).toHaveLength(3);
      expect(report.generatedAt).toBeTruthy();
    });

    it('calculates overall score', () => {
      const cert1 = initializeCertification('soc2');
      const cert2 = initializeCertification('gdpr');

      // Complete all requirements for cert1
      cert1.requirements.forEach(req => {
        updateRequirementStatus(cert1.id, req.id, 'completed');
      });

      const report = generateComplianceReport();

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });

    it('identifies expired certifications', () => {
      const cert = initializeCertification('soc2');
      updateCertificationStatus(cert.id, 'completed');

      // Manually set expiration to past
      const updated = getCertification(cert.id);
      if (updated) {
        updated.expirationDate = Date.now() - 1000;
        updated.status = 'expired';
      }

      const report = generateComplianceReport();

      expect(report.issues.some(i => i.includes('expired'))).toBe(true);
    });

    it('provides recommendations for incomplete certifications', () => {
      initializeCertification('soc2');

      const report = generateComplianceReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('SOC 2'))).toBe(true);
    });
  });

  describe('T2.5 Integration Tests', () => {
    it('complete SOC 2 certification workflow', () => {
      // 1. Initialize SOC 2
      const cert = initializeCertification('soc2');
      expect(cert.status).toBe('not_started');
      expect(cert.score).toBe(0);

      // 2. Start implementation
      updateCertificationStatus(cert.id, 'in_progress');

      // 3. Complete requirements
      cert.requirements.forEach(req => {
        updateRequirementStatus(cert.id, req.id, 'in_progress');
      });

      // 4. Complete all requirements
      cert.requirements.forEach(req => {
        updateRequirementStatus(cert.id, req.id, 'completed', ['evidence.pdf']);
      });

      // 5. Mark certification complete
      updateCertificationStatus(cert.id, 'completed');

      // 6. Verify
      const updated = getCertification(cert.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.score).toBe(100);
      expect(updated?.certificationDate).toBeTruthy();
      expect(updated?.expirationDate).toBeTruthy();
    });

    it('manages multiple certifications', () => {
      // Initialize multiple certifications
      const soc2 = initializeCertification('soc2');
      const gdpr = initializeCertification('gdpr');
      const pci = initializeCertification('pci_dss');

      // Progress each at different rates
      updateCertificationStatus(soc2.id, 'in_progress');
      updateCertificationStatus(gdpr.id, 'in_progress');

      // Complete SOC 2
      soc2.requirements.forEach(req => {
        updateRequirementStatus(soc2.id, req.id, 'completed');
      });
      updateCertificationStatus(soc2.id, 'completed');

      // Generate report
      const report = generateComplianceReport();

      expect(report.certifications).toHaveLength(3);
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('tracks compliance progress over time', () => {
      const cert = initializeCertification('gdpr');

      // Initial state
      let report = generateComplianceReport();
      expect(report.overallScore).toBe(0);

      // Complete first requirement
      updateRequirementStatus(cert.id, cert.requirements[0].id, 'completed');
      report = generateComplianceReport();
      expect(report.overallScore).toBeGreaterThan(0);

      // Complete more requirements
      updateRequirementStatus(cert.id, cert.requirements[1].id, 'completed');
      report = generateComplianceReport();
      expect(report.overallScore).toBeGreaterThan(25);

      // Complete all
      cert.requirements.forEach(req => {
        updateRequirementStatus(cert.id, req.id, 'completed');
      });
      report = generateComplianceReport();
      expect(report.overallScore).toBe(100);
    });
  });
});
