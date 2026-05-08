/**
 * T1.2: Data encryption for guest_local privacy mode
 *
 * Uses Web Crypto API (AES-GCM) for client-side encryption.
 * Encryption key is derived from a user-specific seed stored in localStorage.
 * All data encrypted before storage in IndexedDB.
 *
 * Security notes:
 * - AES-256-GCM provides authenticated encryption
 * - Unique IV (initialization vector) for each encryption
 * - Authentication tag prevents tampering
 * - Key derived from localStorage seed (not stored directly)
 */

/**
 * Encryption result with IV and authentication tag
 */
export interface EncryptedData {
  ciphertext: string; // Base64-encoded ciphertext
  iv: string; // Base64-encoded IV
  tag: string; // Base64-encoded authentication tag
}

/**
 * Get or create encryption key from localStorage
 *
 * Creates a new random key on first call, then reuses it.
 * Key is NOT stored directly; instead, a seed is stored and the key is derived.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const seedKey = 'atlas_encryption_seed';

  // Try to get existing seed
  let seed = localStorage.getItem(seedKey);

  if (!seed) {
    // Create new random seed
    const seedBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    seed = btoa(String.fromCharCode(...seedBytes));
    localStorage.setItem(seedKey, seed);
  }

  // Derive key from seed
  const seedBytes = Uint8Array.from(atob(seed), c => c.charCodeAt(0));
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    seedBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('atlas-encryption'),
      iterations: 100000,
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param data - Data to encrypt (will be JSON stringified if object)
 * @returns Encrypted data with IV and authentication tag
 */
export async function encryptData(data: unknown): Promise<EncryptedData> {
  const key = await getOrCreateEncryptionKey();
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Generate random IV
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );

  // Extract ciphertext and authentication tag
  const ciphertextBytes = new Uint8Array(encrypted).slice(0, -16);
  const tagBytes = new Uint8Array(encrypted).slice(-16);

  return {
    ciphertext: btoa(String.fromCharCode(...ciphertextBytes)),
    iv: btoa(String.fromCharCode(...iv)),
    tag: btoa(String.fromCharCode(...tagBytes)),
  };
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param encrypted - Encrypted data with IV and authentication tag
 * @returns Decrypted data (parsed as JSON if possible)
 */
export async function decryptData(encrypted: EncryptedData): Promise<unknown> {
  const key = await getOrCreateEncryptionKey();

  // Decode from base64
  const ciphertextBytes = Uint8Array.from(atob(encrypted.ciphertext), c =>
    c.charCodeAt(0)
  );
  const ivBytes = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
  const tagBytes = Uint8Array.from(atob(encrypted.tag), c => c.charCodeAt(0));

  // Combine ciphertext and tag for decryption
  const encryptedWithTag = new Uint8Array([...ciphertextBytes, ...tagBytes]);

  // Decrypt
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedWithTag
  );

  const plaintext = new TextDecoder().decode(decrypted);

  // Try to parse as JSON
  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

/**
 * Clear encryption key (for logout or privacy reset)
 */
export function clearEncryptionKey(): void {
  try {
    localStorage.removeItem('atlas_encryption_seed');
  } catch {
    // localStorage not available
  }
}

/**
 * Check if encryption is available (Web Crypto API support)
 */
export function isEncryptionAvailable(): boolean {
  return (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined'
  );
}
