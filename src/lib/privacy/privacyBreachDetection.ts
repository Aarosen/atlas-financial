/**
 * T3.4: Privacy Breach Detection
 *
 * Detects anomalous access patterns and potential privacy breaches.
 */

export interface AccessLog {
  id: string;
  userId: string;
  resourceId: string;
  timestamp: number;
  ipAddress: string;
  action: 'read' | 'write' | 'delete';
  dataSize: number;
}

export interface AnomalyAlert {
  id: string;
  type: 'unusual_access_pattern' | 'bulk_export' | 'unauthorized_access' | 'suspicious_timing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  description: string;
  timestamp: number;
  actionTaken: string;
}

const accessLogs: AccessLog[] = [];
const alerts: AnomalyAlert[] = [];

/**
 * Log data access
 */
export function logDataAccess(
  userId: string,
  resourceId: string,
  ipAddress: string,
  action: 'read' | 'write' | 'delete',
  dataSize: number
): AccessLog {
  const log: AccessLog = {
    id: `log_${Date.now()}`,
    userId,
    resourceId,
    timestamp: Date.now(),
    ipAddress,
    action,
    dataSize,
  };

  accessLogs.push(log);
  checkForAnomalies(log);

  return log;
}

/**
 * Check for anomalies in access pattern
 */
function checkForAnomalies(log: AccessLog): void {
  // Check for bulk export
  if (log.action === 'read' && log.dataSize > 10000) {
    createAlert(
      'bulk_export',
      'high',
      log.userId,
      `Bulk data export detected: ${log.dataSize} bytes`,
      'Access logged and monitored'
    );
  }

  // Check for unusual access time
  const hour = new Date(log.timestamp).getHours();
  if (hour < 6 || hour > 22) {
    createAlert(
      'suspicious_timing',
      'medium',
      log.userId,
      `Access outside business hours at ${hour}:00`,
      'Access logged'
    );
  }

  // Check for multiple accesses from different IPs
  const userLogs = accessLogs.filter(l => l.userId === log.userId);
  const uniqueIPs = new Set(userLogs.map(l => l.ipAddress));
  if (uniqueIPs.size > 5) {
    createAlert(
      'unusual_access_pattern',
      'medium',
      log.userId,
      `Multiple IPs detected: ${uniqueIPs.size}`,
      'User notified'
    );
  }

  // Check for delete operations
  if (log.action === 'delete') {
    createAlert(
      'unauthorized_access',
      'high',
      log.userId,
      'Data deletion detected',
      'Deletion logged and reviewed'
    );
  }
}

/**
 * Create alert
 */
function createAlert(
  type: AnomalyAlert['type'],
  severity: AnomalyAlert['severity'],
  userId: string,
  description: string,
  actionTaken: string
): AnomalyAlert {
  const alert: AnomalyAlert = {
    id: `alert_${Date.now()}`,
    type,
    severity,
    userId,
    description,
    timestamp: Date.now(),
    actionTaken,
  };

  alerts.push(alert);
  return alert;
}

/**
 * Get alerts for user
 */
export function getAlertsForUser(userId: string): AnomalyAlert[] {
  return alerts.filter(a => a.userId === userId);
}

/**
 * Get critical alerts
 */
export function getCriticalAlerts(): AnomalyAlert[] {
  return alerts.filter(a => a.severity === 'critical');
}

/**
 * Get breach detection report
 */
export function getBreachDetectionReport(): {
  totalLogs: number;
  totalAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<string, number>;
  recommendations: string[];
} {
  const alertsByType: Record<string, number> = {
    unusual_access_pattern: 0,
    bulk_export: 0,
    unauthorized_access: 0,
    suspicious_timing: 0,
  };

  alerts.forEach(alert => {
    alertsByType[alert.type]++;
  });

  const recommendations: string[] = [];

  if (alerts.filter(a => a.severity === 'critical').length > 0) {
    recommendations.push('Investigate critical alerts immediately');
  }

  if (alertsByType.bulk_export > 0) {
    recommendations.push('Review bulk export activities');
  }

  if (alertsByType.unauthorized_access > 0) {
    recommendations.push('Review unauthorized access attempts');
  }

  return {
    totalLogs: accessLogs.length,
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    alertsByType,
    recommendations,
  };
}

/**
 * Clear breach detection data (for testing)
 */
export function clearBreachDetectionData(): void {
  accessLogs.length = 0;
  alerts.length = 0;
}
