import { useEffect, useState, useCallback } from 'react';
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
} from './zdrMode';

/**
 * T1.4: React hook for ZDR (Zero Data Retention) mode
 *
 * Manages in-memory data storage with automatic cleanup.
 * Perfect for enterprise environments requiring zero data retention.
 */
export function useZDRMode(sessionId?: string) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCompliant, setIsCompliant] = useState(true);
  const [complianceIssues, setComplianceIssues] = useState<string[]>([]);

  // Initialize ZDR session on mount
  useEffect(() => {
    const id = sessionId || `zdr_${Date.now()}_${Math.random()}`;
    createZDRSession(id);
    setActiveSessionId(id);

    // Verify compliance on mount
    verifyZDRCompliance().then(result => {
      setIsCompliant(result.compliant);
      setComplianceIssues(result.issues);
    });

    // Cleanup on unmount
    return () => {
      endZDRSession(id);
    };
  }, [sessionId]);

  // Store data in memory
  const store = useCallback(
    (key: string, data: unknown) => {
      if (!activeSessionId) {
        throw new Error('ZDR session not initialized');
      }
      storeZDRData(activeSessionId, key, data);
    },
    [activeSessionId]
  );

  // Retrieve data from memory
  const retrieve = useCallback(
    (key: string): unknown => {
      if (!activeSessionId) {
        return undefined;
      }
      return retrieveZDRData(activeSessionId, key);
    },
    [activeSessionId]
  );

  // Delete specific data
  const deleteData = useCallback(
    (key: string) => {
      if (!activeSessionId) {
        return;
      }
      deleteZDRData(activeSessionId, key);
    },
    [activeSessionId]
  );

  // Clear all data in session
  const clear = useCallback(() => {
    if (!activeSessionId) {
      return;
    }
    clearZDRSession(activeSessionId);
  }, [activeSessionId]);

  // End session (final cleanup)
  const endSession = useCallback(() => {
    if (!activeSessionId) {
      return;
    }
    endZDRSession(activeSessionId);
    setActiveSessionId(null);
  }, [activeSessionId]);

  // Get session statistics
  const getStats = useCallback(() => {
    if (!activeSessionId) {
      return null;
    }
    return getZDRSessionStats(activeSessionId);
  }, [activeSessionId]);

  // Check compliance
  const checkCompliance = useCallback(async () => {
    const result = await verifyZDRCompliance();
    setIsCompliant(result.compliant);
    setComplianceIssues(result.issues);
    return result;
  }, []);

  return {
    sessionId: activeSessionId,
    store,
    retrieve,
    deleteData,
    clear,
    endSession,
    getStats,
    checkCompliance,
    isCompliant,
    complianceIssues,
  };
}
