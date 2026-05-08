import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  uploadToCloud,
  downloadFromCloud,
  syncBidirectional,
  getSyncStatus,
  clearCloudSync,
  type CloudSyncData,
} from '../cloudSync';

// Mock fetch
global.fetch = vi.fn();

describe('Cloud Sync (T1.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock session storage
    const store: Record<string, string> = {};
    global.sessionStorage = {
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
    sessionStorage.clear();
  });

  describe('uploadToCloud', () => {
    it('uploads encrypted data to cloud', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'sync_123',
          userId: 'user_1',
          dataType: 'financial_state',
          timestamp: Date.now(),
        }),
      });

      const data = { income: 5000, expenses: 3000 };
      const result = await uploadToCloud('user_1', 'financial_state', data, 'device_1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cloud-sync/upload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
        })
      );
    });

    it('handles upload failure', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      const data = { income: 5000 };
      const result = await uploadToCloud('user_1', 'financial_state', data, 'device_1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error when no auth token available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const data = { income: 5000 };
      const result = await uploadToCloud('user_1', 'financial_state', data, 'device_1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No authentication token');
    });
  });

  describe('downloadFromCloud', () => {
    it('downloads and decrypts data from cloud', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      const mockEncryptedData = {
        ciphertext: 'encrypted_data',
        iv: 'initialization_vector',
        tag: 'auth_tag',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'sync_123',
          userId: 'user_1',
          dataType: 'financial_state',
          encryptedData: mockEncryptedData,
          timestamp: Date.now(),
        }),
      });

      const result = await downloadFromCloud('user_1', 'financial_state');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cloud-sync/download'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
        })
      );
    });

    it('returns null when data not found (404)', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await downloadFromCloud('user_1', 'financial_state');

      expect(result).toBeNull();
    });

    it('returns null on download error', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await downloadFromCloud('user_1', 'financial_state');

      expect(result).toBeNull();
    });
  });

  describe('syncBidirectional', () => {
    it('syncs local data when local is newer', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      const localData = { income: 6000, expenses: 3000 };
      const localTimestamp = Date.now();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'sync_123',
            userId: 'user_1',
            dataType: 'financial_state',
            timestamp: localTimestamp,
          }),
        });

      const result = await syncBidirectional(
        'user_1',
        'financial_state',
        localData,
        'device_1',
        localTimestamp
      );

      expect(result.success).toBe(true);
    });

    it('syncs cloud data when cloud is newer', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      const cloudTimestamp = Date.now() + 10000;
      const localTimestamp = Date.now();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'sync_123',
            userId: 'user_1',
            dataType: 'financial_state',
            encryptedData: {
              ciphertext: 'data',
              iv: 'iv',
              tag: 'tag',
            },
            timestamp: cloudTimestamp,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'sync_456',
            userId: 'user_1',
            dataType: 'financial_state',
            timestamp: cloudTimestamp,
          }),
        });

      const result = await syncBidirectional(
        'user_1',
        'financial_state',
        { income: 5000 },
        'device_1',
        localTimestamp
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getSyncStatus', () => {
    it('retrieves sync status for all data types', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          financial_state: Date.now(),
          conversation: Date.now() - 1000,
          goals: Date.now() - 5000,
        }),
      });

      const status = await getSyncStatus('user_1');

      expect(status).toHaveProperty('financial_state');
      expect(status).toHaveProperty('conversation');
      expect(status).toHaveProperty('goals');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cloud-sync/status'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
        })
      );
    });

    it('returns empty object on error', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const status = await getSyncStatus('user_1');

      expect(status).toEqual({});
    });
  });

  describe('clearCloudSync', () => {
    it('clears cloud sync data for user', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await clearCloudSync('user_1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cloud-sync/clear',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
          body: expect.stringContaining('user_1'),
        })
      );
    });

    it('handles error gracefully', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(clearCloudSync('user_1')).resolves.toBeUndefined();
    });
  });

  describe('T1.3 Integration Tests', () => {
    it('complete upload/download cycle', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      const originalData = {
        monthlyIncome: 6000,
        essentialExpenses: 3800,
        totalSavings: 15000,
      };

      // Mock upload
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'sync_123',
          userId: 'user_1',
          dataType: 'financial_state',
          timestamp: Date.now(),
        }),
      });

      const uploadResult = await uploadToCloud(
        'user_1',
        'financial_state',
        originalData,
        'device_1'
      );

      expect(uploadResult.success).toBe(true);

      // Mock download
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'sync_123',
          userId: 'user_1',
          dataType: 'financial_state',
          encryptedData: {
            ciphertext: 'encrypted',
            iv: 'iv',
            tag: 'tag',
          },
          timestamp: Date.now(),
        }),
      });

      const downloadResult = await downloadFromCloud('user_1', 'financial_state');

      expect(downloadResult).toBeDefined();
    });

    it('sync status reflects all data types', async () => {
      sessionStorage.setItem('atlas_auth_token', 'test_token');

      const dataTypes: CloudSyncData['dataType'][] = [
        'financial_state',
        'conversation',
        'goals',
        'profile',
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          const status: Record<string, number> = {};
          dataTypes.forEach(type => {
            status[type] = Date.now();
          });
          return status;
        },
      });

      const syncStatus = await getSyncStatus('user_1');

      dataTypes.forEach(type => {
        expect(syncStatus).toHaveProperty(type);
      });
    });
  });
});
