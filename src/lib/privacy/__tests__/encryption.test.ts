import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptData,
  decryptData,
  clearEncryptionKey,
  isEncryptionAvailable,
  type EncryptedData,
} from '../encryption';

// Polyfill Web Crypto API for Node.js test environment
if (!globalThis.crypto) {
  const nodeCrypto = require('crypto');
  globalThis.crypto = nodeCrypto.webcrypto as Crypto;
}

describe('Data Encryption (T1.2)', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach(key => delete store[key]);
      },
      length: 0,
      key: () => null,
    } as Storage;
  });

  afterEach(() => {
    localStorage.clear();
    clearEncryptionKey();
  });

  describe('isEncryptionAvailable', () => {
    it('returns true when Web Crypto API is available', () => {
      expect(isEncryptionAvailable()).toBe(true);
    });
  });

  describe('encryptData', () => {
    it('encrypts string data', async () => {
      const plaintext = 'Hello, World!';
      const encrypted = await encryptData(plaintext);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('encrypts object data', async () => {
      const data = { income: 5000, expenses: 3000 };
      const encrypted = await encryptData(data);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
    });

    it('generates unique IV for each encryption', async () => {
      const data = 'Test data';
      const encrypted1 = await encryptData(data);
      const encrypted2 = await encryptData(data);

      // IVs should be different (extremely high probability)
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('produces different ciphertexts for same data (due to unique IV)', async () => {
      const data = 'Test data';
      const encrypted1 = await encryptData(data);
      const encrypted2 = await encryptData(data);

      // Ciphertexts should be different (due to different IVs)
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe('decryptData', () => {
    it('decrypts encrypted string data', async () => {
      const plaintext = 'Hello, World!';
      const encrypted = await encryptData(plaintext);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('decrypts encrypted object data', async () => {
      const data = { income: 5000, expenses: 3000, savings: 10000 };
      const encrypted = await encryptData(data);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('decrypts encrypted array data', async () => {
      const data = [1, 2, 3, 4, 5];
      const encrypted = await encryptData(data);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('decrypts encrypted nested object', async () => {
      const data = {
        user: {
          name: 'John',
          finances: {
            income: 5000,
            expenses: 3000,
          },
        },
      };
      const encrypted = await encryptData(data);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('throws error when decrypting with tampered ciphertext', async () => {
      const data = 'Original data';
      const encrypted = await encryptData(data);

      // Tamper with ciphertext
      const tampered: EncryptedData = {
        ...encrypted,
        ciphertext: btoa('tampered'),
      };

      await expect(decryptData(tampered)).rejects.toThrow();
    });

    it('throws error when decrypting with tampered tag', async () => {
      const data = 'Original data';
      const encrypted = await encryptData(data);

      // Tamper with authentication tag
      const tampered: EncryptedData = {
        ...encrypted,
        tag: btoa('tampered'),
      };

      await expect(decryptData(tampered)).rejects.toThrow();
    });

    it('throws error when decrypting with wrong IV', async () => {
      const data = 'Original data';
      const encrypted = await encryptData(data);

      // Use wrong IV
      const tampered: EncryptedData = {
        ...encrypted,
        iv: btoa('wrongiv123456'),
      };

      await expect(decryptData(tampered)).rejects.toThrow();
    });
  });

  describe('clearEncryptionKey', () => {
    it('removes encryption seed from localStorage', async () => {
      // Create encryption (which creates seed)
      await encryptData('test');
      expect(localStorage.getItem('atlas_encryption_seed')).not.toBeNull();

      // Clear key
      clearEncryptionKey();
      expect(localStorage.getItem('atlas_encryption_seed')).toBeNull();
    });

    it('allows new key to be created after clearing', async () => {
      // Create and clear
      await encryptData('test1');
      clearEncryptionKey();

      // Create new encryption
      const encrypted = await encryptData('test2');
      expect(encrypted).toHaveProperty('ciphertext');
      expect(localStorage.getItem('atlas_encryption_seed')).not.toBeNull();
    });
  });

  describe('T1.2 Integration Tests', () => {
    it('complete encryption/decryption cycle', async () => {
      const originalData = {
        monthlyIncome: 6000,
        essentialExpenses: 3800,
        totalSavings: 15000,
        highInterestDebt: 5000,
        monthlyDebtPayments: 400,
      };

      // Encrypt
      const encrypted = await encryptData(originalData);

      // Verify encrypted data has all required fields
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.tag).toBeTruthy();

      // Decrypt
      const decrypted = await decryptData(encrypted);

      // Verify decryption matches original
      expect(decrypted).toEqual(originalData);
    });

    it('encryption key persists across encrypt/decrypt calls', async () => {
      const data1 = 'First message';
      const data2 = 'Second message';

      // Encrypt two messages
      const encrypted1 = await encryptData(data1);
      const encrypted2 = await encryptData(data2);

      // Both should decrypt correctly (using same key)
      const decrypted1 = await decryptData(encrypted1);
      const decrypted2 = await decryptData(encrypted2);

      expect(decrypted1).toBe(data1);
      expect(decrypted2).toBe(data2);
    });

    it('large data encryption/decryption', async () => {
      const largeData = {
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          content: `Message ${i}`,
          timestamp: new Date().toISOString(),
        })),
        metadata: {
          version: 1,
          encrypted: true,
        },
      };

      const encrypted = await encryptData(largeData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toEqual(largeData);
    });
  });
});
