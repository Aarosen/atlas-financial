import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createZDRSession,
  getZDRSession,
  storeZDRData,
  retrieveZDRData,
  deleteZDRData,
  clearZDRSession,
  endZDRSession,
  getZDRSessionStats,
  verifyZDRCompliance,
  getAllZDRSessions,
  clearAllZDRSessions,
} from '../zdrMode';

describe('ZDR Mode (T1.4)', () => {
  beforeEach(() => {
    clearAllZDRSessions();
  });

  afterEach(() => {
    clearAllZDRSessions();
  });

  describe('createZDRSession', () => {
    it('creates a new ZDR session', () => {
      const session = createZDRSession('test_session');

      expect(session.id).toBe('test_session');
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.endTime).toBeUndefined();
      expect(session.dataInMemory).toBeInstanceOf(Map);
      expect(session.dataInMemory.size).toBe(0);
    });

    it('creates multiple independent sessions', () => {
      const session1 = createZDRSession('session_1');
      const session2 = createZDRSession('session_2');

      expect(session1.id).toBe('session_1');
      expect(session2.id).toBe('session_2');
      expect(session1.dataInMemory).not.toBe(session2.dataInMemory);
    });
  });

  describe('getZDRSession', () => {
    it('retrieves existing session', () => {
      createZDRSession('test_session');
      const session = getZDRSession('test_session');

      expect(session).toBeDefined();
      expect(session?.id).toBe('test_session');
    });

    it('returns undefined for non-existent session', () => {
      const session = getZDRSession('non_existent');

      expect(session).toBeUndefined();
    });
  });

  describe('storeZDRData', () => {
    it('stores data in session memory', () => {
      createZDRSession('test_session');
      const data = { income: 5000, expenses: 3000 };

      storeZDRData('test_session', 'financial_state', data);

      const session = getZDRSession('test_session');
      expect(session?.dataInMemory.size).toBe(1);
      expect(session?.dataInMemory.get('financial_state')).toEqual(data);
    });

    it('stores multiple data items', () => {
      createZDRSession('test_session');

      storeZDRData('test_session', 'key1', { data: 1 });
      storeZDRData('test_session', 'key2', { data: 2 });
      storeZDRData('test_session', 'key3', { data: 3 });

      const session = getZDRSession('test_session');
      expect(session?.dataInMemory.size).toBe(3);
    });

    it('overwrites existing data with same key', () => {
      createZDRSession('test_session');

      storeZDRData('test_session', 'key', 'value1');
      storeZDRData('test_session', 'key', 'value2');

      const session = getZDRSession('test_session');
      expect(session?.dataInMemory.size).toBe(1);
      expect(session?.dataInMemory.get('key')).toBe('value2');
    });

    it('throws error for non-existent session', () => {
      expect(() => {
        storeZDRData('non_existent', 'key', 'data');
      }).toThrow('ZDR session not found');
    });
  });

  describe('retrieveZDRData', () => {
    it('retrieves stored data', () => {
      createZDRSession('test_session');
      const data = { income: 5000 };

      storeZDRData('test_session', 'financial', data);
      const retrieved = retrieveZDRData('test_session', 'financial');

      expect(retrieved).toEqual(data);
    });

    it('returns undefined for non-existent key', () => {
      createZDRSession('test_session');

      const retrieved = retrieveZDRData('test_session', 'non_existent');

      expect(retrieved).toBeUndefined();
    });

    it('returns undefined for non-existent session', () => {
      const retrieved = retrieveZDRData('non_existent', 'key');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('deleteZDRData', () => {
    it('deletes specific data from session', () => {
      createZDRSession('test_session');

      storeZDRData('test_session', 'key1', 'data1');
      storeZDRData('test_session', 'key2', 'data2');

      deleteZDRData('test_session', 'key1');

      const session = getZDRSession('test_session');
      expect(session?.dataInMemory.size).toBe(1);
      expect(session?.dataInMemory.has('key1')).toBe(false);
      expect(session?.dataInMemory.has('key2')).toBe(true);
    });

    it('handles deletion of non-existent key gracefully', () => {
      createZDRSession('test_session');

      expect(() => {
        deleteZDRData('test_session', 'non_existent');
      }).not.toThrow();
    });
  });

  describe('clearZDRSession', () => {
    it('clears all data from session', () => {
      createZDRSession('test_session');

      storeZDRData('test_session', 'key1', 'data1');
      storeZDRData('test_session', 'key2', 'data2');
      storeZDRData('test_session', 'key3', 'data3');

      clearZDRSession('test_session');

      const session = getZDRSession('test_session');
      expect(session?.dataInMemory.size).toBe(0);
      expect(session?.endTime).toBeDefined();
    });

    it('marks session as ended', () => {
      createZDRSession('test_session');
      const session1 = getZDRSession('test_session');
      expect(session1?.endTime).toBeUndefined();

      clearZDRSession('test_session');

      const session2 = getZDRSession('test_session');
      expect(session2?.endTime).toBeDefined();
    });
  });

  describe('endZDRSession', () => {
    it('removes session from memory', () => {
      createZDRSession('test_session');
      expect(getZDRSession('test_session')).toBeDefined();

      endZDRSession('test_session');

      expect(getZDRSession('test_session')).toBeUndefined();
    });

    it('clears data before removal', () => {
      createZDRSession('test_session');
      storeZDRData('test_session', 'key', 'data');

      endZDRSession('test_session');

      expect(getZDRSession('test_session')).toBeUndefined();
    });

    it('handles non-existent session gracefully', () => {
      expect(() => {
        endZDRSession('non_existent');
      }).not.toThrow();
    });
  });

  describe('getZDRSessionStats', () => {
    it('returns session statistics', () => {
      createZDRSession('test_session');
      storeZDRData('test_session', 'key1', 'data1');
      storeZDRData('test_session', 'key2', 'data2');

      const stats = getZDRSessionStats('test_session');

      expect(stats).toBeDefined();
      expect(stats?.id).toBe('test_session');
      expect(stats?.dataCount).toBe(2);
      expect(stats?.isActive).toBe(true);
      expect(stats?.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns null for non-existent session', () => {
      const stats = getZDRSessionStats('non_existent');

      expect(stats).toBeNull();
    });

    it('shows correct duration for ended session', () => {
      createZDRSession('test_session');

      // Wait a bit
      const startStats = getZDRSessionStats('test_session');
      expect(startStats?.isActive).toBe(true);

      clearZDRSession('test_session');

      const endStats = getZDRSessionStats('test_session');
      expect(endStats?.isActive).toBe(false);
      expect(endStats?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('verifyZDRCompliance', () => {
    it('returns compliant when no storage used', async () => {
      const result = await verifyZDRCompliance();

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('detects localStorage usage', async () => {
      localStorage.setItem('test_key', 'test_value');

      const result = await verifyZDRCompliance();

      expect(result.compliant).toBe(false);
      expect(result.issues.some(i => i.includes('localStorage'))).toBe(true);

      localStorage.removeItem('test_key');
    });

    it('detects sessionStorage usage', async () => {
      sessionStorage.setItem('test_key', 'test_value');

      const result = await verifyZDRCompliance();

      expect(result.compliant).toBe(false);
      expect(result.issues.some(i => i.includes('sessionStorage'))).toBe(true);

      sessionStorage.removeItem('test_key');
    });
  });

  describe('getAllZDRSessions', () => {
    it('returns all active sessions', () => {
      createZDRSession('session_1');
      createZDRSession('session_2');
      createZDRSession('session_3');

      const sessions = getAllZDRSessions();

      expect(sessions).toHaveLength(3);
      expect(sessions.map(s => s.id)).toContain('session_1');
      expect(sessions.map(s => s.id)).toContain('session_2');
      expect(sessions.map(s => s.id)).toContain('session_3');
    });

    it('returns empty array when no sessions', () => {
      const sessions = getAllZDRSessions();

      expect(sessions).toHaveLength(0);
    });
  });

  describe('clearAllZDRSessions', () => {
    it('clears all sessions', () => {
      createZDRSession('session_1');
      createZDRSession('session_2');

      clearAllZDRSessions();

      expect(getAllZDRSessions()).toHaveLength(0);
    });

    it('clears data from all sessions', () => {
      createZDRSession('session_1');
      createZDRSession('session_2');

      storeZDRData('session_1', 'key1', 'data1');
      storeZDRData('session_2', 'key2', 'data2');

      clearAllZDRSessions();

      expect(getZDRSession('session_1')).toBeUndefined();
      expect(getZDRSession('session_2')).toBeUndefined();
    });
  });

  describe('T1.4 Integration Tests', () => {
    it('complete ZDR session lifecycle', () => {
      // Create session
      const session = createZDRSession('lifecycle_test');
      expect(session.id).toBe('lifecycle_test');

      // Store data
      storeZDRData('lifecycle_test', 'financial', {
        income: 5000,
        expenses: 3000,
      });
      storeZDRData('lifecycle_test', 'goals', ['emergency_fund', 'debt_payoff']);

      // Retrieve data
      const financial = retrieveZDRData('lifecycle_test', 'financial');
      const goals = retrieveZDRData('lifecycle_test', 'goals');

      expect(financial).toEqual({ income: 5000, expenses: 3000 });
      expect(goals).toEqual(['emergency_fund', 'debt_payoff']);

      // Get stats
      const stats = getZDRSessionStats('lifecycle_test');
      expect(stats?.dataCount).toBe(2);
      expect(stats?.isActive).toBe(true);

      // End session
      endZDRSession('lifecycle_test');

      expect(getZDRSession('lifecycle_test')).toBeUndefined();
    });

    it('multiple independent sessions', () => {
      // Create two sessions
      createZDRSession('user_1');
      createZDRSession('user_2');

      // Store different data in each
      storeZDRData('user_1', 'data', { user: 1 });
      storeZDRData('user_2', 'data', { user: 2 });

      // Verify isolation
      const data1 = retrieveZDRData('user_1', 'data');
      const data2 = retrieveZDRData('user_2', 'data');

      expect(data1).toEqual({ user: 1 });
      expect(data2).toEqual({ user: 2 });

      // End one session
      endZDRSession('user_1');

      expect(getZDRSession('user_1')).toBeUndefined();
      expect(getZDRSession('user_2')).toBeDefined();
    });

    it('zero data retention guarantee', async () => {
      // Create session and store data
      createZDRSession('retention_test');
      storeZDRData('retention_test', 'sensitive', { ssn: '123-45-6789' });

      // Verify data is in memory
      expect(retrieveZDRData('retention_test', 'sensitive')).toBeDefined();

      // End session
      endZDRSession('retention_test');

      // Verify data is gone
      expect(retrieveZDRData('retention_test', 'sensitive')).toBeUndefined();
      expect(getZDRSession('retention_test')).toBeUndefined();

      // Verify compliance
      const compliance = await verifyZDRCompliance();
      expect(compliance.compliant).toBe(true);
    });
  });
});
