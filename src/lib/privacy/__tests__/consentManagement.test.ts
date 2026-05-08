import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getConsentCategories,
  getConsentCategory,
  recordConsent,
  withdrawConsent,
  getUserConsent,
  getUserConsents,
  getConsentHistory,
  hasConsentForPurpose,
  createConsentSnapshot,
  getConsentSnapshots,
  generateConsentReport,
  updateBulkConsent,
  isConsentExpired,
  getComplianceStatus,
  clearUserConsents,
  clearAllConsents,
  CONSENT_CATEGORIES,
} from '../consentManagement';

describe('Consent Management (T2.3)', () => {
  beforeEach(() => {
    clearAllConsents();
  });

  afterEach(() => {
    clearAllConsents();
  });

  describe('Consent Categories', () => {
    it('returns all consent categories', () => {
      const categories = getConsentCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some(c => c.id === 'essential')).toBe(true);
      expect(categories.some(c => c.id === 'marketing')).toBe(true);
      expect(categories.some(c => c.id === 'analytics')).toBe(true);
    });

    it('gets consent category by ID', () => {
      const category = getConsentCategory('marketing');

      expect(category?.id).toBe('marketing');
      expect(category?.required).toBe(false);
      expect(category?.purposes).toContain('email_marketing');
    });

    it('essential category is required', () => {
      const essential = getConsentCategory('essential');

      expect(essential?.required).toBe(true);
    });

    it('non-essential categories are optional', () => {
      const marketing = getConsentCategory('marketing');
      const analytics = getConsentCategory('analytics');

      expect(marketing?.required).toBe(false);
      expect(analytics?.required).toBe(false);
    });
  });

  describe('recordConsent', () => {
    it('records explicit consent', () => {
      const consent = recordConsent('user_1', 'marketing', true, 'explicit');

      expect(consent.userId).toBe('user_1');
      expect(consent.category).toBe('marketing');
      expect(consent.given).toBe(true);
      expect(consent.method).toBe('explicit');
    });

    it('records consent withdrawal', () => {
      const consent = recordConsent('user_1', 'marketing', false, 'withdrawn');

      expect(consent.given).toBe(false);
      expect(consent.method).toBe('withdrawn');
    });

    it('includes IP address and user agent', () => {
      const consent = recordConsent(
        'user_1',
        'analytics',
        true,
        'explicit',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(consent.ipAddress).toBe('192.168.1.1');
      expect(consent.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('withdrawConsent', () => {
    it('withdraws consent for category', () => {
      recordConsent('user_1', 'marketing', true);
      const withdrawn = withdrawConsent('user_1', 'marketing');

      expect(withdrawn.given).toBe(false);
      expect(withdrawn.method).toBe('withdrawn');
    });
  });

  describe('getUserConsent', () => {
    it('returns true for given consent', () => {
      recordConsent('user_1', 'marketing', true);

      const consent = getUserConsent('user_1', 'marketing');

      expect(consent).toBe(true);
    });

    it('returns false for withdrawn consent', () => {
      recordConsent('user_1', 'marketing', true);
      withdrawConsent('user_1', 'marketing');

      const consent = getUserConsent('user_1', 'marketing');

      expect(consent).toBe(false);
    });

    it('returns null for no consent record', () => {
      const consent = getUserConsent('user_1', 'marketing');

      expect(consent).toBeNull();
    });

    it('returns most recent consent', () => {
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'marketing', false);

      const consent = getUserConsent('user_1', 'marketing');

      expect(consent).toBe(false);
    });
  });

  describe('getUserConsents', () => {
    it('returns all user consents', () => {
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'analytics', false);
      recordConsent('user_1', 'essential', true);

      const consents = getUserConsents('user_1');

      expect(consents.marketing).toBe(true);
      expect(consents.analytics).toBe(false);
      expect(consents.essential).toBe(true);
    });

    it('returns empty object for user with no consents', () => {
      const consents = getUserConsents('user_1');

      expect(consents).toEqual({});
    });
  });

  describe('getConsentHistory', () => {
    it('returns consent history in reverse chronological order', () => {
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'marketing', false);
      recordConsent('user_1', 'marketing', true);

      const history = getConsentHistory('user_1');

      expect(history).toHaveLength(3);
      expect(history[0].given).toBe(true); // Most recent
      expect(history[2].given).toBe(true); // Oldest
    });
  });

  describe('hasConsentForPurpose', () => {
    it('returns true when consent given for purpose', () => {
      recordConsent('user_1', 'marketing', true);

      const hasConsent = hasConsentForPurpose('user_1', 'email_marketing');

      expect(hasConsent).toBe(true);
    });

    it('returns false when consent not given for purpose', () => {
      recordConsent('user_1', 'marketing', false);

      const hasConsent = hasConsentForPurpose('user_1', 'email_marketing');

      expect(hasConsent).toBe(false);
    });

    it('returns false when no consent for category', () => {
      const hasConsent = hasConsentForPurpose('user_1', 'email_marketing');

      expect(hasConsent).toBe(false);
    });
  });

  describe('createConsentSnapshot', () => {
    it('creates consent snapshot', () => {
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'analytics', false);

      const snapshot = createConsentSnapshot('user_1', '192.168.1.1', 'Mozilla/5.0');

      expect(snapshot.userId).toBe('user_1');
      expect(snapshot.consents.marketing).toBe(true);
      expect(snapshot.consents.analytics).toBe(false);
      expect(snapshot.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('getConsentSnapshots', () => {
    it('returns consent snapshots', () => {
      recordConsent('user_1', 'marketing', true);
      createConsentSnapshot('user_1');

      recordConsent('user_1', 'analytics', true);
      createConsentSnapshot('user_1');

      const snapshots = getConsentSnapshots('user_1');

      expect(snapshots).toHaveLength(2);
    });
  });

  describe('generateConsentReport', () => {
    it('generates consent report', () => {
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'analytics', false);

      const report = generateConsentReport('user_1');

      expect(report.userId).toBe('user_1');
      expect(report.currentConsents.marketing).toBe(true);
      expect(report.currentConsents.analytics).toBe(false);
      expect(report.allConsentsGiven).toBe(false);
    });

    it('identifies when all consents given', () => {
      recordConsent('user_1', 'essential', true);
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'analytics', true);
      recordConsent('user_1', 'thirdparty', true);
      recordConsent('user_1', 'automated', true);

      const report = generateConsentReport('user_1');

      expect(report.allConsentsGiven).toBe(true);
    });

    it('identifies essential-only consent', () => {
      recordConsent('user_1', 'essential', true);
      recordConsent('user_1', 'marketing', false);
      recordConsent('user_1', 'analytics', false);

      const report = generateConsentReport('user_1');

      expect(report.essentialOnly).toBe(true);
    });
  });

  describe('updateBulkConsent', () => {
    it('updates multiple consents at once', () => {
      const consents = {
        essential: true,
        marketing: true,
        analytics: false,
        thirdparty: false,
      };

      const recorded = updateBulkConsent('user_1', consents);

      expect(recorded).toHaveLength(4);
      expect(getUserConsent('user_1', 'marketing')).toBe(true);
      expect(getUserConsent('user_1', 'analytics')).toBe(false);
    });
  });

  describe('isConsentExpired', () => {
    it('returns false for consent without expiration', () => {
      const consent = recordConsent('user_1', 'marketing', true);

      expect(isConsentExpired(consent)).toBe(false);
    });

    it('returns true for expired consent', () => {
      const consent = recordConsent('user_1', 'marketing', true);
      consent.expiresAt = Date.now() - 1000;

      expect(isConsentExpired(consent)).toBe(true);
    });

    it('returns false for future expiration', () => {
      const consent = recordConsent('user_1', 'marketing', true);
      consent.expiresAt = Date.now() + 1000;

      expect(isConsentExpired(consent)).toBe(false);
    });
  });

  describe('getComplianceStatus', () => {
    it('returns compliant when essential consent given', () => {
      recordConsent('user_1', 'essential', true);

      const status = getComplianceStatus('user_1');

      expect(status.compliant).toBe(true);
      expect(status.issues).toHaveLength(0);
    });

    it('returns non-compliant when essential consent missing', () => {
      recordConsent('user_1', 'marketing', true);

      const status = getComplianceStatus('user_1');

      expect(status.compliant).toBe(false);
      expect(status.issues.some(i => i.includes('Essential'))).toBe(true);
    });

    it('tracks consent withdrawals in recommendations', () => {
      recordConsent('user_1', 'essential', true);
      withdrawConsent('user_1', 'marketing');

      const status = getComplianceStatus('user_1');

      expect(status.recommendations.some(r => r.includes('withdrawn'))).toBe(true);
    });
  });

  describe('clearUserConsents', () => {
    it('clears all consents for user', () => {
      recordConsent('user_1', 'marketing', true);
      recordConsent('user_1', 'analytics', true);

      clearUserConsents('user_1');

      const consents = getUserConsents('user_1');
      expect(consents).toEqual({});
    });
  });

  describe('T2.3 Integration Tests', () => {
    it('complete consent workflow', () => {
      // 1. User sees consent banner
      const categories = getConsentCategories();
      expect(categories.length).toBeGreaterThan(0);

      // 2. User gives consent
      updateBulkConsent('user_1', {
        essential: true,
        marketing: true,
        analytics: false,
        thirdparty: false,
        automated: false,
      });

      // 3. Check current consents
      const consents = getUserConsents('user_1');
      expect(consents.marketing).toBe(true);
      expect(consents.analytics).toBe(false);

      // 4. Create snapshot for records
      const snapshot = createConsentSnapshot('user_1');
      expect(snapshot.consents.marketing).toBe(true);

      // 5. Generate report
      const report = generateConsentReport('user_1');
      expect(report.allConsentsGiven).toBe(false);
      expect(report.essentialOnly).toBe(false);

      // 6. Check compliance
      const status = getComplianceStatus('user_1');
      expect(status.compliant).toBe(true);
    });

    it('consent withdrawal workflow', () => {
      // 1. User gives all consents
      updateBulkConsent('user_1', {
        essential: true,
        marketing: true,
        analytics: true,
        thirdparty: true,
        automated: true,
      });

      // 2. Verify all given
      let report = generateConsentReport('user_1');
      expect(report.allConsentsGiven).toBe(true);

      // 3. User withdraws marketing consent
      withdrawConsent('user_1', 'marketing');

      // 4. Verify withdrawal
      expect(getUserConsent('user_1', 'marketing')).toBe(false);
      expect(hasConsentForPurpose('user_1', 'email_marketing')).toBe(false);

      // 5. Check history
      const history = getConsentHistory('user_1');
      const withdrawals = history.filter(h => h.method === 'withdrawn');
      expect(withdrawals.length).toBeGreaterThan(0);

      // 6. Generate updated report
      report = generateConsentReport('user_1');
      expect(report.allConsentsGiven).toBe(false);
    });

    it('purpose-based consent checking', () => {
      // 1. User gives marketing consent
      recordConsent('user_1', 'marketing', true);

      // 2. Check specific purposes
      expect(hasConsentForPurpose('user_1', 'email_marketing')).toBe(true);
      expect(hasConsentForPurpose('user_1', 'promotional_offers')).toBe(true);
      expect(hasConsentForPurpose('user_1', 'usage_analytics')).toBe(false);

      // 3. User withdraws marketing
      withdrawConsent('user_1', 'marketing');

      // 4. Verify purposes no longer allowed
      expect(hasConsentForPurpose('user_1', 'email_marketing')).toBe(false);
      expect(hasConsentForPurpose('user_1', 'promotional_offers')).toBe(false);
    });

    it('multi-user consent isolation', () => {
      // User 1 gives marketing consent
      recordConsent('user_1', 'marketing', true);

      // User 2 does not
      recordConsent('user_2', 'marketing', false);

      // Verify isolation
      expect(getUserConsent('user_1', 'marketing')).toBe(true);
      expect(getUserConsent('user_2', 'marketing')).toBe(false);

      // User 1 withdraws
      withdrawConsent('user_1', 'marketing');

      // User 2's consent unchanged
      expect(getUserConsent('user_2', 'marketing')).toBe(false);
    });
  });
});
