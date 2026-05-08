import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordAnalyticsEvent,
  addDifferentialPrivacyNoise,
  countWithDifferentialPrivacy,
  sumWithDifferentialPrivacy,
  averageWithDifferentialPrivacy,
  checkKAnonymity,
  checkLDiversity,
  aggregateByCategory,
  generateAnalyticsReport,
  resetPrivacyBudget,
  getPrivacyBudgetStatus,
  clearAnalyticsEvents,
  DEFAULT_DP_CONFIG,
  type DifferentialPrivacyConfig,
} from '../privacyPreservingAnalytics';

describe('Privacy-Preserving Analytics (T3.1)', () => {
  beforeEach(() => {
    clearAnalyticsEvents();
    resetPrivacyBudget();
  });

  afterEach(() => {
    clearAnalyticsEvents();
    resetPrivacyBudget();
  });

  describe('recordAnalyticsEvent', () => {
    it('records analytics event', () => {
      const event = recordAnalyticsEvent('user_1', 'login', { ip: '192.168.1.1' });

      expect(event.userId).toBe('user_1');
      expect(event.eventType).toBe('login');
      expect(event.properties.ip).toBe('192.168.1.1');
      expect(event.sensitive).toBe(false);
    });

    it('marks sensitive events', () => {
      const event = recordAnalyticsEvent('user_1', 'payment', { amount: 1000 }, true);

      expect(event.sensitive).toBe(true);
    });
  });

  describe('addDifferentialPrivacyNoise', () => {
    it('adds Laplace noise', () => {
      const config: DifferentialPrivacyConfig = {
        epsilon: 1.0,
        delta: 1e-6,
        mechanism: 'laplace',
      };

      const result = addDifferentialPrivacyNoise(100, 1, config);

      expect(result.noisyValue).toBeTruthy();
      expect(result.noise).toBeTruthy();
      // Noise should be non-zero
      expect(Math.abs(result.noise)).toBeGreaterThan(0);
    });

    it('adds Gaussian noise', () => {
      const config: DifferentialPrivacyConfig = {
        epsilon: 1.0,
        delta: 1e-6,
        mechanism: 'gaussian',
      };

      const result = addDifferentialPrivacyNoise(100, 1, config);

      expect(result.noisyValue).toBeTruthy();
      expect(result.noise).toBeTruthy();
    });

    it('uses default config', () => {
      const result = addDifferentialPrivacyNoise(100);

      expect(result.noisyValue).toBeTruthy();
      expect(result.noise).toBeTruthy();
    });
  });

  describe('countWithDifferentialPrivacy', () => {
    it('counts events with privacy', () => {
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});
      recordAnalyticsEvent('user_3', 'logout', {});

      const metric = countWithDifferentialPrivacy(() => true);

      expect(metric.metric).toBe('count');
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.epsilon).toBe(DEFAULT_DP_CONFIG.epsilon);
    });

    it('counts filtered events', () => {
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});
      recordAnalyticsEvent('user_3', 'logout', {});

      const metric = countWithDifferentialPrivacy(e => e.eventType === 'login');

      expect(metric.metric).toBe('count');
      // Noisy count should be close to 2
      expect(metric.value).toBeGreaterThan(0);
    });
  });

  describe('sumWithDifferentialPrivacy', () => {
    it('sums values with privacy', () => {
      recordAnalyticsEvent('user_1', 'purchase', { amount: 100 });
      recordAnalyticsEvent('user_2', 'purchase', { amount: 200 });
      recordAnalyticsEvent('user_3', 'purchase', { amount: 150 });

      const metric = sumWithDifferentialPrivacy(
        () => true,
        e => Number(e.properties.amount) || 0
      );

      expect(metric.metric).toBe('sum');
      // Noisy sum should be close to 450
      expect(metric.value).toBeGreaterThan(0);
    });
  });

  describe('averageWithDifferentialPrivacy', () => {
    it('calculates average with privacy', () => {
      recordAnalyticsEvent('user_1', 'purchase', { amount: 100 });
      recordAnalyticsEvent('user_2', 'purchase', { amount: 200 });
      recordAnalyticsEvent('user_3', 'purchase', { amount: 300 });

      const metric = averageWithDifferentialPrivacy(
        () => true,
        e => Number(e.properties.amount) || 0
      );

      expect(metric.metric).toBe('average');
      // Noisy average should be close to 200
      expect(metric.value).toBeGreaterThan(0);
    });

    it('handles empty result set', () => {
      const metric = averageWithDifferentialPrivacy(
        () => false,
        e => Number(e.properties.amount) || 0
      );

      expect(metric.value).toBe(0);
      expect(metric.epsilon).toBe(0);
    });
  });

  describe('checkKAnonymity', () => {
    it('checks k-anonymity', () => {
      // Create groups of 5 with same eventType
      for (let i = 0; i < 5; i++) {
        recordAnalyticsEvent(`user_${i}`, 'login', {});
      }
      for (let i = 5; i < 10; i++) {
        recordAnalyticsEvent(`user_${i}`, 'logout', {});
      }

      const result = checkKAnonymity(['eventType'], 5);

      expect(result.isAnonymous).toBe(true);
      expect(result.groupSize).toBe(2);
      expect(result.minGroupSize).toBe(5);
    });

    it('detects k-anonymity violation', () => {
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});
      recordAnalyticsEvent('user_3', 'logout', {});

      const result = checkKAnonymity(['eventType'], 5);

      expect(result.isAnonymous).toBe(false);
    });
  });

  describe('checkLDiversity', () => {
    it('checks l-diversity', () => {
      // Create diverse user IDs within same event type
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});
      recordAnalyticsEvent('user_3', 'login', {});

      const result = checkLDiversity(['eventType'], 'userId', 2);

      expect(result).toBe(true);
    });

    it('detects l-diversity violation', () => {
      // All same user ID
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_1', 'login', {});

      const result = checkLDiversity(['eventType'], 'userId', 2);

      expect(result).toBe(false);
    });
  });

  describe('aggregateByCategory', () => {
    it('aggregates events by category', () => {
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});
      recordAnalyticsEvent('user_3', 'logout', {});

      const aggregated = aggregateByCategory('eventType');

      expect(aggregated.login).toBe(2);
      expect(aggregated.logout).toBe(1);
    });
  });

  describe('generateAnalyticsReport', () => {
    it('generates analytics report', () => {
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});
      recordAnalyticsEvent('user_3', 'logout', {});

      const report = generateAnalyticsReport();

      expect(report.metrics.length).toBeGreaterThan(0);
      expect(report.privacyBudgetUsed).toBeGreaterThan(0);
      expect(report.privacyBudgetRemaining).toBeLessThan(100);
      expect(report.anonymityLevel).toBeTruthy();
    });

    it('provides recommendations', () => {
      recordAnalyticsEvent('user_1', 'login', {});

      const report = generateAnalyticsReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy Budget Management', () => {
    it('tracks privacy budget usage', () => {
      const before = getPrivacyBudgetStatus();
      expect(before.used).toBe(0);

      countWithDifferentialPrivacy(() => true);

      const after = getPrivacyBudgetStatus();
      expect(after.used).toBeGreaterThan(0);
    });

    it('resets privacy budget', () => {
      countWithDifferentialPrivacy(() => true);

      let status = getPrivacyBudgetStatus();
      expect(status.used).toBeGreaterThan(0);

      resetPrivacyBudget();

      status = getPrivacyBudgetStatus();
      expect(status.used).toBe(0);
    });

    it('calculates percent used', () => {
      countWithDifferentialPrivacy(() => true);

      const status = getPrivacyBudgetStatus();

      expect(status.percentUsed).toBeGreaterThan(0);
      expect(status.percentUsed).toBeLessThanOrEqual(100);
    });
  });

  describe('T3.1 Integration Tests', () => {
    it('complete privacy-preserving analytics workflow', () => {
      // 1. Record events
      for (let i = 0; i < 10; i++) {
        recordAnalyticsEvent(`user_${i}`, 'login', { ip: '192.168.1.1' });
      }
      for (let i = 10; i < 15; i++) {
        recordAnalyticsEvent(`user_${i}`, 'logout', { ip: '192.168.1.2' });
      }

      // 2. Count with privacy
      const loginCount = countWithDifferentialPrivacy(e => e.eventType === 'login');
      expect(loginCount.value).toBeGreaterThan(0);

      // 3. Check anonymity
      const kAnon = checkKAnonymity(['eventType'], 5);
      expect(kAnon.isAnonymous).toBe(true);

      // 4. Check diversity
      const lDiv = checkLDiversity(['eventType'], 'userId', 2);
      expect(lDiv).toBe(true);

      // 5. Generate report
      const report = generateAnalyticsReport();
      expect(report.anonymityLevel).toBe('high');
    });

    it('handles sensitive data with privacy', () => {
      // Record sensitive events
      recordAnalyticsEvent('user_1', 'payment', { amount: 1000 }, true);
      recordAnalyticsEvent('user_2', 'payment', { amount: 2000 }, true);
      recordAnalyticsEvent('user_3', 'payment', { amount: 1500 }, true);

      // Sum with privacy
      const sum = sumWithDifferentialPrivacy(
        e => e.sensitive,
        e => Number(e.properties.amount) || 0,
        5000 // Sensitivity
      );

      expect(sum.value).toBeGreaterThan(0);

      // Average with privacy
      const avg = averageWithDifferentialPrivacy(
        e => e.sensitive,
        e => Number(e.properties.amount) || 0,
        5000
      );

      expect(avg.value).toBeGreaterThan(0);
    });

    it('manages privacy budget across multiple queries', () => {
      const initialBudget = getPrivacyBudgetStatus();
      expect(initialBudget.used).toBe(0);

      // Run multiple queries
      countWithDifferentialPrivacy(() => true);
      countWithDifferentialPrivacy(e => e.eventType === 'login');
      sumWithDifferentialPrivacy(() => true, e => 1);

      const afterQueries = getPrivacyBudgetStatus();
      expect(afterQueries.used).toBeGreaterThan(initialBudget.used);
      expect(afterQueries.remaining).toBeLessThan(100);

      // Reset budget
      resetPrivacyBudget();

      const afterReset = getPrivacyBudgetStatus();
      expect(afterReset.used).toBe(0);
      expect(afterReset.remaining).toBe(100);
    });

    it('provides privacy guarantees with different epsilon values', () => {
      recordAnalyticsEvent('user_1', 'login', {});
      recordAnalyticsEvent('user_2', 'login', {});

      // Strong privacy (small epsilon)
      const strongPrivacy = countWithDifferentialPrivacy(() => true, {
        epsilon: 0.1,
        delta: 1e-6,
        mechanism: 'laplace',
      });

      // Weak privacy (large epsilon)
      const weakPrivacy = countWithDifferentialPrivacy(() => true, {
        epsilon: 10.0,
        delta: 1e-6,
        mechanism: 'laplace',
      });

      // Both should return valid metrics
      expect(strongPrivacy.value).toBeGreaterThanOrEqual(0);
      expect(weakPrivacy.value).toBeGreaterThanOrEqual(0);
    });
  });
});
