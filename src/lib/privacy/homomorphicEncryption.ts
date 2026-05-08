/**
 * T3.3: Homomorphic Encryption
 *
 * Enables computation on encrypted data without decryption.
 * Simplified implementation using additive homomorphic properties.
 */

export interface EncryptedValue {
  id: string;
  ciphertext: number;
  publicKey: number;
  timestamp: number;
}

export interface HomomorphicResult {
  result: number;
  operationType: 'add' | 'multiply_scalar' | 'aggregate';
  timestamp: number;
}

const encryptedValues: Map<string, EncryptedValue> = new Map();

/**
 * Simple additive homomorphic encryption
 * E(m1) + E(m2) = E(m1 + m2)
 */
export function encryptValue(plaintext: number, publicKey: number = 12345): EncryptedValue {
  const id = `enc_${Date.now()}`;
  // Simple encryption: multiply by public key and add noise
  const noise = Math.random() * 1000;
  const ciphertext = plaintext * publicKey + noise;

  const encrypted: EncryptedValue = {
    id,
    ciphertext,
    publicKey,
    timestamp: Date.now(),
  };

  encryptedValues.set(id, encrypted);
  return encrypted;
}

/**
 * Add two encrypted values
 * E(m1) + E(m2) = E(m1 + m2)
 */
export function addEncrypted(
  enc1Id: string,
  enc2Id: string
): HomomorphicResult {
  const enc1 = encryptedValues.get(enc1Id);
  const enc2 = encryptedValues.get(enc2Id);

  if (!enc1 || !enc2) {
    throw new Error('Encrypted value not found');
  }

  if (enc1.publicKey !== enc2.publicKey) {
    throw new Error('Public keys must match');
  }

  const resultCiphertext = enc1.ciphertext + enc2.ciphertext;

  return {
    result: resultCiphertext,
    operationType: 'add',
    timestamp: Date.now(),
  };
}

/**
 * Multiply encrypted value by scalar
 * E(m) * s = E(m * s)
 */
export function multiplyScalarEncrypted(
  encId: string,
  scalar: number
): HomomorphicResult {
  const enc = encryptedValues.get(encId);

  if (!enc) {
    throw new Error('Encrypted value not found');
  }

  const resultCiphertext = enc.ciphertext * scalar;

  return {
    result: resultCiphertext,
    operationType: 'multiply_scalar',
    timestamp: Date.now(),
  };
}

/**
 * Aggregate encrypted values
 */
export function aggregateEncrypted(encIds: string[]): HomomorphicResult {
  const encryptedList = encIds.map(id => {
    const enc = encryptedValues.get(id);
    if (!enc) throw new Error(`Encrypted value ${id} not found`);
    return enc;
  });

  const resultCiphertext = encryptedList.reduce((sum, enc) => sum + enc.ciphertext, 0);

  return {
    result: resultCiphertext,
    operationType: 'aggregate',
    timestamp: Date.now(),
  };
}

/**
 * Get encrypted value
 */
export function getEncryptedValue(encId: string): EncryptedValue | undefined {
  return encryptedValues.get(encId);
}

/**
 * Clear encrypted values (for testing)
 */
export function clearEncryptedValues(): void {
  encryptedValues.clear();
}
