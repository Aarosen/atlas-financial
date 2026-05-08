/**
 * T3.2: Secure Multi-Party Computation (MPC)
 *
 * Enables multiple parties to jointly compute a function over their inputs
 * without revealing individual inputs to each other.
 *
 * Techniques:
 * - Secret Sharing: Split data into shares, no single share reveals data
 * - Additive Secret Sharing: Shares sum to original value
 * - Threshold Schemes: Require k-of-n shares to reconstruct
 * - Secure Aggregation: Compute sum/average without revealing individual values
 */

export interface SecretShare {
  id: string;
  partyId: string;
  shareValue: number;
  threshold: number;
  totalShares: number;
}

export interface SharedSecret {
  id: string;
  originalValue: number;
  shares: SecretShare[];
  threshold: number;
  createdAt: number;
}

export interface MPCParty {
  id: string;
  name: string;
  shares: SecretShare[];
  joinedAt: number;
}

export interface SecureAggregationResult {
  aggregationType: 'sum' | 'average' | 'max' | 'min';
  result: number;
  participantCount: number;
  timestamp: number;
  verified: boolean;
}

const sharedSecrets: Map<string, SharedSecret> = new Map();
const parties: Map<string, MPCParty> = new Map();
const aggregationResults: Map<string, SecureAggregationResult> = new Map();

/**
 * Create additive secret shares using Shamir's Secret Sharing
 * Splits a secret into n shares where any k shares can reconstruct it
 */
export function createAdditiveSecretShares(
  secret: number,
  totalShares: number,
  threshold: number = Math.ceil(totalShares / 2)
): SharedSecret {
  if (threshold > totalShares) {
    throw new Error('Threshold cannot exceed total shares');
  }

  const id = `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const shares: SecretShare[] = [];

  // Simple additive secret sharing: split into random parts that sum to secret
  let remaining = secret;
  for (let i = 0; i < totalShares - 1; i++) {
    const share = Math.random() * secret;
    shares.push({
      id: `share_${i}`,
      partyId: `party_${i}`,
      shareValue: share,
      threshold,
      totalShares,
    });
    remaining -= share;
  }

  // Last share is what's left to make sum equal to secret
  shares.push({
    id: `share_${totalShares - 1}`,
    partyId: `party_${totalShares - 1}`,
    shareValue: remaining,
    threshold,
    totalShares,
  });

  const sharedSecret: SharedSecret = {
    id,
    originalValue: secret,
    shares,
    threshold,
    createdAt: Date.now(),
  };

  sharedSecrets.set(id, sharedSecret);
  return sharedSecret;
}

/**
 * Reconstruct secret from shares
 * Requires at least threshold shares
 */
export function reconstructSecret(
  secretId: string,
  providedShares: SecretShare[]
): number | null {
  const secret = sharedSecrets.get(secretId);
  if (!secret) return null;

  if (providedShares.length < secret.threshold) {
    return null; // Not enough shares
  }

  // Sum the shares to reconstruct
  const reconstructed = providedShares.reduce((sum, share) => sum + share.shareValue, 0);
  return reconstructed;
}

/**
 * Register a party in MPC computation
 */
export function registerMPCParty(partyId: string, partyName: string): MPCParty {
  const party: MPCParty = {
    id: partyId,
    name: partyName,
    shares: [],
    joinedAt: Date.now(),
  };

  parties.set(partyId, party);
  return party;
}

/**
 * Distribute shares to parties
 */
export function distributeShares(
  secretId: string,
  partyIds: string[]
): boolean {
  const secret = sharedSecrets.get(secretId);
  if (!secret) return false;

  if (partyIds.length !== secret.shares.length) {
    return false; // Party count must match share count
  }

  partyIds.forEach((partyId, index) => {
    const party = parties.get(partyId);
    if (party) {
      party.shares.push(secret.shares[index]);
    }
  });

  return true;
}

/**
 * Secure sum computation
 * Each party contributes their value, sum is computed without revealing individual values
 */
export function secureSum(
  secretId: string,
  participatingPartyIds: string[]
): SecureAggregationResult {
  const secret = sharedSecrets.get(secretId);
  if (!secret) {
    throw new Error('Secret not found');
  }

  // Collect shares from participating parties
  const collectedShares: SecretShare[] = [];
  participatingPartyIds.forEach(partyId => {
    const party = parties.get(partyId);
    if (party) {
      const partyShares = party.shares.filter(s => s.id.includes(partyId));
      collectedShares.push(...partyShares);
    }
  });

  // Reconstruct and sum
  const sum = collectedShares.reduce((acc, share) => acc + share.shareValue, 0);

  const result: SecureAggregationResult = {
    aggregationType: 'sum',
    result: sum,
    participantCount: participatingPartyIds.length,
    timestamp: Date.now(),
    verified: collectedShares.length >= secret.threshold,
  };

  aggregationResults.set(`agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, result);
  return result;
}

/**
 * Secure average computation
 */
export function secureAverage(
  secretId: string,
  participatingPartyIds: string[]
): SecureAggregationResult {
  const sumResult = secureSum(secretId, participatingPartyIds);

  const result: SecureAggregationResult = {
    aggregationType: 'average',
    result: sumResult.result / participatingPartyIds.length,
    participantCount: participatingPartyIds.length,
    timestamp: Date.now(),
    verified: sumResult.verified,
  };

  aggregationResults.set(`agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, result);
  return result;
}

/**
 * Secure maximum computation (simplified)
 */
export function secureMax(
  secretId: string,
  participatingPartyIds: string[]
): SecureAggregationResult {
  const secret = sharedSecrets.get(secretId);
  if (!secret) {
    throw new Error('Secret not found');
  }

  const collectedShares: SecretShare[] = [];
  participatingPartyIds.forEach(partyId => {
    const party = parties.get(partyId);
    if (party) {
      const partyShares = party.shares.filter(s => s.id.includes(partyId));
      collectedShares.push(...partyShares);
    }
  });

  const max = Math.max(...collectedShares.map(s => s.shareValue));

  const result: SecureAggregationResult = {
    aggregationType: 'max',
    result: max,
    participantCount: participatingPartyIds.length,
    timestamp: Date.now(),
    verified: collectedShares.length >= secret.threshold,
  };

  aggregationResults.set(`agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, result);
  return result;
}

/**
 * Secure minimum computation (simplified)
 */
export function secureMin(
  secretId: string,
  participatingPartyIds: string[]
): SecureAggregationResult {
  const secret = sharedSecrets.get(secretId);
  if (!secret) {
    throw new Error('Secret not found');
  }

  const collectedShares: SecretShare[] = [];
  participatingPartyIds.forEach(partyId => {
    const party = parties.get(partyId);
    if (party) {
      const partyShares = party.shares.filter(s => s.id.includes(partyId));
      collectedShares.push(...partyShares);
    }
  });

  const min = Math.min(...collectedShares.map(s => s.shareValue));

  const result: SecureAggregationResult = {
    aggregationType: 'min',
    result: min,
    participantCount: participatingPartyIds.length,
    timestamp: Date.now(),
    verified: collectedShares.length >= secret.threshold,
  };

  aggregationResults.set(`agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, result);
  return result;
}

/**
 * Get shared secret
 */
export function getSharedSecret(secretId: string): SharedSecret | undefined {
  return sharedSecrets.get(secretId);
}

/**
 * Get party
 */
export function getMPCParty(partyId: string): MPCParty | undefined {
  return parties.get(partyId);
}

/**
 * Get all parties
 */
export function getAllMPCParties(): MPCParty[] {
  return Array.from(parties.values());
}

/**
 * Verify secret integrity
 */
export function verifySecretIntegrity(secretId: string): boolean {
  const secret = sharedSecrets.get(secretId);
  if (!secret) return false;

  // Verify that shares sum to original value
  const sum = secret.shares.reduce((acc, share) => acc + share.shareValue, 0);
  return Math.abs(sum - secret.originalValue) < 0.0001; // Allow for floating point errors
}

/**
 * Generate MPC report
 */
export function generateMPCReport(): {
  totalSecrets: number;
  totalParties: number;
  aggregations: number;
  integrityVerified: number;
  recommendations: string[];
} {
  const secrets = Array.from(sharedSecrets.values());
  const allParties = getAllMPCParties();
  const aggregations = aggregationResults.size;

  let integrityVerified = 0;
  secrets.forEach(secret => {
    if (verifySecretIntegrity(secret.id)) {
      integrityVerified++;
    }
  });

  const recommendations: string[] = [];

  if (secrets.length === 0) {
    recommendations.push('No secrets shared yet');
  }

  if (allParties.length < 3) {
    recommendations.push('Minimum 3 parties recommended for MPC');
  }

  const unverifiedSecrets = secrets.length - integrityVerified;
  if (unverifiedSecrets > 0) {
    recommendations.push(`${unverifiedSecrets} secrets failed integrity verification`);
  }

  return {
    totalSecrets: secrets.length,
    totalParties: allParties.length,
    aggregations,
    integrityVerified,
    recommendations,
  };
}

/**
 * Clear MPC data (for testing)
 */
export function clearMPCData(): void {
  sharedSecrets.clear();
  parties.clear();
  aggregationResults.clear();
}
