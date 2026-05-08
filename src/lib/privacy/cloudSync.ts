/**
 * T1.3: Cloud sync for signed_in_cloud privacy mode
 *
 * Syncs encrypted financial data to Supabase for cross-device access.
 * Data is encrypted client-side before transmission (end-to-end encryption).
 * Supabase stores encrypted blobs; server cannot read plaintext.
 *
 * Sync strategy:
 * 1. Encrypt data locally
 * 2. Upload to Supabase with user ID and timestamp
 * 3. Download on other devices and decrypt
 * 4. Conflict resolution: last-write-wins with timestamp
 */

import { encryptData, decryptData, type EncryptedData } from './encryption';

export interface CloudSyncData {
  id: string;
  userId: string;
  dataType: 'financial_state' | 'conversation' | 'goals' | 'profile';
  encryptedData: EncryptedData;
  timestamp: number;
  deviceId: string;
  version: number;
}

export interface SyncResult {
  success: boolean;
  data?: CloudSyncData;
  error?: string;
  timestamp: number;
}

/**
 * Upload encrypted data to Supabase
 *
 * @param userId - User ID from authentication
 * @param dataType - Type of data being synced
 * @param data - Data to encrypt and upload
 * @param deviceId - Device identifier for conflict resolution
 */
export async function uploadToCloud(
  userId: string,
  dataType: CloudSyncData['dataType'],
  data: unknown,
  deviceId: string
): Promise<SyncResult> {
  try {
    // Encrypt data locally
    const encryptedData = await encryptData(data);

    const syncData: CloudSyncData = {
      id: `${userId}_${dataType}_${Date.now()}`,
      userId,
      dataType,
      encryptedData,
      timestamp: Date.now(),
      deviceId,
      version: 1,
    };

    // Upload to Supabase
    const response = await fetch('/api/cloud-sync/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(syncData),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      timestamp: Date.now(),
    };
  }
}

/**
 * Download encrypted data from Supabase
 *
 * @param userId - User ID from authentication
 * @param dataType - Type of data to download
 * @returns Decrypted data or null if not found
 */
export async function downloadFromCloud(
  userId: string,
  dataType: CloudSyncData['dataType']
): Promise<unknown> {
  try {
    const response = await fetch(
      `/api/cloud-sync/download?userId=${userId}&dataType=${dataType}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No data found
      }
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const syncData: CloudSyncData = await response.json();

    // Decrypt data locally
    const decrypted = await decryptData(syncData.encryptedData);

    return decrypted;
  } catch (error) {
    console.error('Cloud sync download error:', error);
    return null;
  }
}

/**
 * Sync data bidirectionally
 *
 * 1. Download latest from cloud
 * 2. Merge with local data (last-write-wins)
 * 3. Upload merged result
 */
export async function syncBidirectional(
  userId: string,
  dataType: CloudSyncData['dataType'],
  localData: unknown,
  deviceId: string,
  localTimestamp: number
): Promise<SyncResult> {
  try {
    // Download latest from cloud
    const cloudData = await downloadFromCloud(userId, dataType);

    // Merge: use whichever is newer
    const dataToSync = localTimestamp > (cloudData as any)?.timestamp
      ? localData
      : cloudData;

    // Upload merged result
    return await uploadToCloud(userId, dataType, dataToSync, deviceId);
  } catch (error) {
    return {
      success: false,
      error: String(error),
      timestamp: Date.now(),
    };
  }
}

/**
 * Get authentication token for API calls
 *
 * Retrieves token from session storage or auth context
 */
async function getAuthToken(): Promise<string> {
  // Try to get from session storage
  const token = sessionStorage.getItem('atlas_auth_token');
  if (token) return token;

  // Try to get from auth API
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const session = await response.json();
      return session.token || '';
    }
  } catch {
    // Ignore
  }

  throw new Error('No authentication token available');
}

/**
 * Clear cloud sync data for user (on logout)
 */
export async function clearCloudSync(userId: string): Promise<void> {
  try {
    await fetch('/api/cloud-sync/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    console.error('Error clearing cloud sync:', error);
  }
}

/**
 * Get sync status for all data types
 */
export async function getSyncStatus(userId: string): Promise<Record<string, number>> {
  try {
    const response = await fetch(`/api/cloud-sync/status?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${await getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get sync status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {};
  }
}
