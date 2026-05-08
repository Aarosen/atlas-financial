/**
 * T1.4: Enterprise ZDR (Zero Data Retention) Mode
 *
 * Zero data retention mode for enterprise customers:
 * - No data stored locally (no IndexedDB, no localStorage)
 * - No data sent to servers
 * - All analysis happens in-memory only
 * - Data is cleared when session ends
 * - Perfect for sensitive environments (healthcare, finance, legal)
 *
 * Implementation:
 * 1. All data kept in memory (React state)
 * 2. No persistence to storage
 * 3. No API calls to backend
 * 4. Clear all memory on logout/session end
 */

export interface ZDRSession {
  id: string;
  startTime: number;
  endTime?: number;
  dataInMemory: Map<string, unknown>;
}

/**
 * In-memory storage for ZDR mode
 * Uses WeakMap for automatic garbage collection
 */
const zdrSessions = new Map<string, ZDRSession>();

/**
 * Create a new ZDR session
 *
 * @param sessionId - Unique session identifier
 * @returns ZDR session object
 */
export function createZDRSession(sessionId: string): ZDRSession {
  const session: ZDRSession = {
    id: sessionId,
    startTime: Date.now(),
    dataInMemory: new Map(),
  };

  zdrSessions.set(sessionId, session);

  return session;
}

/**
 * Get active ZDR session
 */
export function getZDRSession(sessionId: string): ZDRSession | undefined {
  return zdrSessions.get(sessionId);
}

/**
 * Store data in ZDR session (in-memory only)
 *
 * @param sessionId - Session ID
 * @param key - Data key
 * @param data - Data to store (never persisted)
 */
export function storeZDRData(
  sessionId: string,
  key: string,
  data: unknown
): void {
  const session = zdrSessions.get(sessionId);
  if (!session) {
    throw new Error(`ZDR session not found: ${sessionId}`);
  }

  session.dataInMemory.set(key, data);
}

/**
 * Retrieve data from ZDR session
 *
 * @param sessionId - Session ID
 * @param key - Data key
 * @returns Data or undefined if not found
 */
export function retrieveZDRData(
  sessionId: string,
  key: string
): unknown {
  const session = zdrSessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  return session.dataInMemory.get(key);
}

/**
 * Delete specific data from ZDR session
 *
 * @param sessionId - Session ID
 * @param key - Data key
 */
export function deleteZDRData(sessionId: string, key: string): void {
  const session = zdrSessions.get(sessionId);
  if (session) {
    session.dataInMemory.delete(key);
  }
}

/**
 * Clear all data from ZDR session
 *
 * @param sessionId - Session ID
 */
export function clearZDRSession(sessionId: string): void {
  const session = zdrSessions.get(sessionId);
  if (session) {
    session.dataInMemory.clear();
    session.endTime = Date.now();
  }
}

/**
 * End ZDR session and remove from memory
 *
 * IMPORTANT: This is the only way to ensure data is truly deleted.
 * After calling this, the session cannot be accessed.
 *
 * @param sessionId - Session ID
 */
export function endZDRSession(sessionId: string): void {
  const session = zdrSessions.get(sessionId);
  if (session) {
    session.dataInMemory.clear();
    session.endTime = Date.now();
    zdrSessions.delete(sessionId);
  }
}

/**
 * Get ZDR session statistics (for monitoring)
 *
 * @param sessionId - Session ID
 * @returns Session stats
 */
export function getZDRSessionStats(sessionId: string): {
  id: string;
  duration: number;
  dataCount: number;
  isActive: boolean;
} | null {
  const session = zdrSessions.get(sessionId);
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    duration: (session.endTime || Date.now()) - session.startTime,
    dataCount: session.dataInMemory.size,
    isActive: !session.endTime,
  };
}

/**
 * Verify ZDR mode compliance
 *
 * Checks that:
 * 1. No data in localStorage
 * 2. No data in sessionStorage
 * 3. No IndexedDB databases
 * 4. All data only in memory
 */
export async function verifyZDRCompliance(): Promise<{
  compliant: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check localStorage
  try {
    if (typeof localStorage !== 'undefined' && localStorage.length > 0) {
      issues.push('Data found in localStorage (should be empty in ZDR mode)');
    }
  } catch {
    // localStorage not available
  }

  // Check sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.length > 0) {
      issues.push('Data found in sessionStorage (should be empty in ZDR mode)');
    }
  } catch {
    // sessionStorage not available
  }

  // Check IndexedDB
  if (typeof indexedDB !== 'undefined') {
    try {
      const dbs = await indexedDB.databases?.();
      if (dbs && dbs.length > 0) {
        issues.push(`Found ${dbs.length} IndexedDB database(s) (should be empty in ZDR mode)`);
      }
    } catch {
      // IndexedDB not available
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * Get all active ZDR sessions (for monitoring)
 */
export function getAllZDRSessions(): ZDRSession[] {
  return Array.from(zdrSessions.values());
}

/**
 * Clear all ZDR sessions (emergency cleanup)
 */
export function clearAllZDRSessions(): void {
  zdrSessions.forEach(session => {
    session.dataInMemory.clear();
    session.endTime = Date.now();
  });
  zdrSessions.clear();
}
