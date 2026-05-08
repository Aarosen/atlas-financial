import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createAdditiveSecretShares,
  reconstructSecret,
  registerMPCParty,
  distributeShares,
  secureSum,
  secureAverage,
  secureMax,
  secureMin,
  getSharedSecret,
  getMPCParty,
  getAllMPCParties,
  verifySecretIntegrity,
  generateMPCReport,
  clearMPCData,
} from '../secureMultiPartyComputation';

describe('Secure Multi-Party Computation (T3.2)', () => {
  beforeEach(() => {
    clearMPCData();
  });

  afterEach(() => {
    clearMPCData();
  });

  describe('createAdditiveSecretShares', () => {
    it('creates secret shares', () => {
      const secret = createAdditiveSecretShares(100, 5, 3);

      expect(secret.originalValue).toBe(100);
      expect(secret.shares).toHaveLength(5);
      expect(secret.threshold).toBe(3);
    });

    it('shares sum to original value', () => {
      const secret = createAdditiveSecretShares(100, 5, 3);

      const sum = secret.shares.reduce((acc, share) => acc + share.shareValue, 0);
      expect(Math.abs(sum - 100)).toBeLessThan(0.0001);
    });

    it('throws error if threshold exceeds total shares', () => {
      expect(() => {
        createAdditiveSecretShares(100, 5, 10);
      }).toThrow('Threshold cannot exceed total shares');
    });

    it('generates unique share IDs', () => {
      const secret = createAdditiveSecretShares(100, 5, 3);

      const ids = secret.shares.map(s => s.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('reconstructSecret', () => {
    it('reconstructs secret from shares', () => {
      const secret = createAdditiveSecretShares(100, 5, 3);

      const reconstructed = reconstructSecret(secret.id, secret.shares.slice(0, 3));

      expect(reconstructed).toBeCloseTo(100, 0);
    });

    it('returns null with insufficient shares', () => {
      const secret = createAdditiveSecretShares(100, 5, 3);

      const reconstructed = reconstructSecret(secret.id, secret.shares.slice(0, 2));

      expect(reconstructed).toBeNull();
    });

    it('returns null for non-existent secret', () => {
      const reconstructed = reconstructSecret('non_existent', []);

      expect(reconstructed).toBeNull();
    });

    it('reconstructs with more than threshold shares', () => {
      const secret = createAdditiveSecretShares(100, 5, 3);

      const reconstructed = reconstructSecret(secret.id, secret.shares);

      expect(reconstructed).toBeCloseTo(100, 0);
    });
  });

  describe('registerMPCParty', () => {
    it('registers MPC party', () => {
      const party = registerMPCParty('party_1', 'Bank A');

      expect(party.id).toBe('party_1');
      expect(party.name).toBe('Bank A');
      expect(party.shares).toEqual([]);
      expect(party.joinedAt).toBeTruthy();
    });

    it('generates unique party IDs', () => {
      const party1 = registerMPCParty('party_1', 'Bank A');
      const party2 = registerMPCParty('party_2', 'Bank B');

      expect(party1.id).not.toBe(party2.id);
    });
  });

  describe('distributeShares', () => {
    it('distributes shares to parties', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');
      registerMPCParty('party_1', 'Bank B');
      registerMPCParty('party_2', 'Bank C');

      const distributed = distributeShares(secret.id, ['party_0', 'party_1', 'party_2']);

      expect(distributed).toBe(true);

      const party0 = getMPCParty('party_0');
      expect(party0?.shares.length).toBeGreaterThan(0);
    });

    it('returns false for non-existent secret', () => {
      registerMPCParty('party_0', 'Bank A');

      const distributed = distributeShares('non_existent', ['party_0']);

      expect(distributed).toBe(false);
    });

    it('returns false if party count mismatch', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');

      const distributed = distributeShares(secret.id, ['party_0']);

      expect(distributed).toBe(false);
    });
  });

  describe('secureSum', () => {
    it('computes secure sum', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');
      registerMPCParty('party_1', 'Bank B');
      registerMPCParty('party_2', 'Bank C');
      distributeShares(secret.id, ['party_0', 'party_1', 'party_2']);

      const result = secureSum(secret.id, ['party_0', 'party_1', 'party_2']);

      expect(result.aggregationType).toBe('sum');
      expect(result.participantCount).toBe(3);
      expect(result.verified).toBe(true);
    });

    it('throws error for non-existent secret', () => {
      expect(() => {
        secureSum('non_existent', ['party_0']);
      }).toThrow('Secret not found');
    });
  });

  describe('secureAverage', () => {
    it('computes secure average', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');
      registerMPCParty('party_1', 'Bank B');
      registerMPCParty('party_2', 'Bank C');
      distributeShares(secret.id, ['party_0', 'party_1', 'party_2']);

      const result = secureAverage(secret.id, ['party_0', 'party_1', 'party_2']);

      expect(result.aggregationType).toBe('average');
      expect(result.participantCount).toBe(3);
    });
  });

  describe('secureMax', () => {
    it('computes secure maximum', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');
      registerMPCParty('party_1', 'Bank B');
      registerMPCParty('party_2', 'Bank C');
      distributeShares(secret.id, ['party_0', 'party_1', 'party_2']);

      const result = secureMax(secret.id, ['party_0', 'party_1', 'party_2']);

      expect(result.aggregationType).toBe('max');
      expect(result.participantCount).toBe(3);
    });
  });

  describe('secureMin', () => {
    it('computes secure minimum', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');
      registerMPCParty('party_1', 'Bank B');
      registerMPCParty('party_2', 'Bank C');
      distributeShares(secret.id, ['party_0', 'party_1', 'party_2']);

      const result = secureMin(secret.id, ['party_0', 'party_1', 'party_2']);

      expect(result.aggregationType).toBe('min');
      expect(result.participantCount).toBe(3);
    });
  });

  describe('getSharedSecret', () => {
    it('retrieves shared secret', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);

      const retrieved = getSharedSecret(secret.id);

      expect(retrieved).toEqual(secret);
    });

    it('returns undefined for non-existent secret', () => {
      const retrieved = getSharedSecret('non_existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getMPCParty', () => {
    it('retrieves MPC party', () => {
      const party = registerMPCParty('party_1', 'Bank A');

      const retrieved = getMPCParty('party_1');

      expect(retrieved).toEqual(party);
    });

    it('returns undefined for non-existent party', () => {
      const retrieved = getMPCParty('non_existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllMPCParties', () => {
    it('returns all parties', () => {
      registerMPCParty('party_1', 'Bank A');
      registerMPCParty('party_2', 'Bank B');
      registerMPCParty('party_3', 'Bank C');

      const parties = getAllMPCParties();

      expect(parties).toHaveLength(3);
    });
  });

  describe('verifySecretIntegrity', () => {
    it('verifies secret integrity', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);

      const verified = verifySecretIntegrity(secret.id);

      expect(verified).toBe(true);
    });

    it('returns false for non-existent secret', () => {
      const verified = verifySecretIntegrity('non_existent');

      expect(verified).toBe(false);
    });
  });

  describe('generateMPCReport', () => {
    it('generates MPC report', () => {
      const secret = createAdditiveSecretShares(100, 3, 2);
      registerMPCParty('party_0', 'Bank A');
      registerMPCParty('party_1', 'Bank B');
      registerMPCParty('party_2', 'Bank C');
      distributeShares(secret.id, ['party_0', 'party_1', 'party_2']);
      secureSum(secret.id, ['party_0', 'party_1', 'party_2']);

      const report = generateMPCReport();

      expect(report.totalSecrets).toBe(1);
      expect(report.totalParties).toBe(3);
      expect(report.aggregations).toBe(1);
      expect(report.integrityVerified).toBe(1);
    });

    it('provides recommendations', () => {
      const report = generateMPCReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('T3.2 Integration Tests', () => {
    it('complete secure multi-party computation workflow', () => {
      // 1. Create secret
      const secret = createAdditiveSecretShares(1000, 5, 3);
      expect(secret.originalValue).toBe(1000);

      // 2. Register parties
      const parties = [];
      for (let i = 0; i < 5; i++) {
        parties.push(registerMPCParty(`party_${i}`, `Bank ${String.fromCharCode(65 + i)}`));
      }

      // 3. Distribute shares
      const distributed = distributeShares(
        secret.id,
        parties.map(p => p.id)
      );
      expect(distributed).toBe(true);

      // 4. Verify integrity
      const verified = verifySecretIntegrity(secret.id);
      expect(verified).toBe(true);

      // 5. Compute secure aggregations
      const sum = secureSum(secret.id, parties.map(p => p.id));
      expect(sum.verified).toBe(true);

      const avg = secureAverage(secret.id, parties.map(p => p.id));
      expect(avg.participantCount).toBe(5);

      // 6. Generate report
      const report = generateMPCReport();
      expect(report.totalSecrets).toBe(1);
      expect(report.totalParties).toBe(5);
      expect(report.aggregations).toBe(2);
    });

    it('handles threshold-based reconstruction', () => {
      // Create secret with threshold 3
      const secret = createAdditiveSecretShares(500, 5, 3);

      // Register parties
      for (let i = 0; i < 5; i++) {
        registerMPCParty(`party_${i}`, `Bank ${i}`);
      }

      // Distribute shares
      distributeShares(
        secret.id,
        Array.from({ length: 5 }, (_, i) => `party_${i}`)
      );

      // Reconstruct with exactly threshold shares
      const reconstructed = reconstructSecret(secret.id, secret.shares.slice(0, 3));
      expect(reconstructed).toBeCloseTo(500, 0);

      // Verify fails with fewer shares
      const failedReconstruction = reconstructSecret(secret.id, secret.shares.slice(0, 2));
      expect(failedReconstruction).toBeNull();
    });

    it('supports multiple concurrent secrets', () => {
      // Create multiple secrets
      const secret1 = createAdditiveSecretShares(100, 3, 2);
      const secret2 = createAdditiveSecretShares(200, 3, 2);
      const secret3 = createAdditiveSecretShares(300, 3, 2);

      // Register parties
      for (let i = 0; i < 3; i++) {
        registerMPCParty(`party_${i}`, `Bank ${i}`);
      }

      // Distribute all secrets
      distributeShares(secret1.id, ['party_0', 'party_1', 'party_2']);
      distributeShares(secret2.id, ['party_0', 'party_1', 'party_2']);
      distributeShares(secret3.id, ['party_0', 'party_1', 'party_2']);

      // Verify all
      expect(verifySecretIntegrity(secret1.id)).toBe(true);
      expect(verifySecretIntegrity(secret2.id)).toBe(true);
      expect(verifySecretIntegrity(secret3.id)).toBe(true);

      // Generate report
      const report = generateMPCReport();
      expect(report.totalSecrets).toBe(3);
      expect(report.integrityVerified).toBe(3);
    });
  });
});
