import { useEffect, useState, useCallback } from 'react';
import {
  uploadToCloud,
  downloadFromCloud,
  syncBidirectional,
  getSyncStatus,
  type CloudSyncData,
  type SyncResult,
} from './cloudSync';

export interface UseSyncOptions {
  userId?: string;
  deviceId?: string;
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
}

/**
 * T1.3: React hook for cloud sync management
 *
 * Handles uploading and downloading encrypted data from Supabase.
 * Supports bidirectional sync with conflict resolution.
 */
export function useCloudSync(options: UseSyncOptions = {}) {
  const {
    userId,
    deviceId = `device_${Date.now()}`,
    autoSync = true,
    syncInterval = 30000, // 30 seconds
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Upload data to cloud
  const upload = useCallback(
    async (
      dataType: CloudSyncData['dataType'],
      data: unknown
    ): Promise<SyncResult> => {
      if (!userId) {
        return {
          success: false,
          error: 'User ID required for cloud sync',
          timestamp: Date.now(),
        };
      }

      setIsSyncing(true);
      setError(null);

      try {
        const result = await uploadToCloud(userId, dataType, data, deviceId);
        if (result.success) {
          setLastSyncTime(Date.now());
        } else {
          setError(result.error || 'Upload failed');
        }
        return result;
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          timestamp: Date.now(),
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [userId, deviceId]
  );

  // Download data from cloud
  const download = useCallback(
    async (dataType: CloudSyncData['dataType']): Promise<unknown> => {
      if (!userId) {
        setError('User ID required for cloud sync');
        return null;
      }

      setIsSyncing(true);
      setError(null);

      try {
        const data = await downloadFromCloud(userId, dataType);
        setLastSyncTime(Date.now());
        return data;
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [userId]
  );

  // Bidirectional sync
  const sync = useCallback(
    async (
      dataType: CloudSyncData['dataType'],
      localData: unknown,
      localTimestamp: number
    ): Promise<SyncResult> => {
      if (!userId) {
        return {
          success: false,
          error: 'User ID required for cloud sync',
          timestamp: Date.now(),
        };
      }

      setIsSyncing(true);
      setError(null);

      try {
        const result = await syncBidirectional(
          userId,
          dataType,
          localData,
          deviceId,
          localTimestamp
        );
        if (result.success) {
          setLastSyncTime(Date.now());
        } else {
          setError(result.error || 'Sync failed');
        }
        return result;
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          timestamp: Date.now(),
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [userId, deviceId]
  );

  // Get sync status
  const getStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const status = await getSyncStatus(userId);
      setSyncStatus(status);
    } catch (err) {
      console.error('Error getting sync status:', err);
    }
  }, [userId]);

  // Auto-sync on interval
  useEffect(() => {
    if (!autoSync || !userId) return;

    const interval = setInterval(() => {
      getStatus();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, userId, syncInterval, getStatus]);

  return {
    upload,
    download,
    sync,
    getStatus,
    isSyncing,
    lastSyncTime,
    syncStatus,
    error,
  };
}
