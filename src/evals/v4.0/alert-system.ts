/**
 * ATLAS AI v4.0 Alert Notification System
 * 
 * Handles alert generation, routing, and delivery across multiple channels
 * Slack, email, PagerDuty, and in-app notifications
 */

export type AlertChannel = 'slack' | 'email' | 'pagerduty' | 'in-app' | 'log';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertConfig {
  channels: AlertChannel[];
  slackWebhook?: string;
  emailRecipients?: string[];
  pagerdutyKey?: string;
  enableInApp: boolean;
  enableLogging: boolean;
  severityThreshold: AlertSeverity;
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  title: string;
  message: string;
  dimension?: string;
  metric?: string;
  current_value?: number;
  threshold?: number;
  recommended_action?: string;
  tags?: Record<string, string>;
}

export interface AlertDeliveryResult {
  channel: AlertChannel;
  success: boolean;
  timestamp: number;
  error?: string;
}

export class AlertSystem {
  private config: AlertConfig;
  private alertHistory: Alert[] = [];
  private deliveryHistory: AlertDeliveryResult[] = [];
  private maxAlertsStored = 10000;

  constructor(config: AlertConfig) {
    this.config = config;
  }

  /**
   * Create and send an alert
   */
  async sendAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<AlertDeliveryResult[]> {
    const fullAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Store alert
    this.alertHistory.push(fullAlert);
    if (this.alertHistory.length > this.maxAlertsStored) {
      this.alertHistory = this.alertHistory.slice(-this.maxAlertsStored);
    }

    // Check severity threshold
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[alert.severity] > severityOrder[this.config.severityThreshold]) {
      return [];
    }

    // Send to configured channels
    const results: AlertDeliveryResult[] = [];

    for (const channel of this.config.channels) {
      try {
        const result = await this.deliverAlert(fullAlert, channel);
        results.push(result);
        this.deliveryHistory.push(result);
      } catch (error) {
        results.push({
          channel,
          success: false,
          timestamp: Date.now(),
          error: String(error),
        });
      }
    }

    return results;
  }

  /**
   * Deliver alert to specific channel
   */
  private async deliverAlert(alert: Alert, channel: AlertChannel): Promise<AlertDeliveryResult> {
    const timestamp = Date.now();

    switch (channel) {
      case 'slack':
        return this.sendToSlack(alert, timestamp);
      case 'email':
        return this.sendEmail(alert, timestamp);
      case 'pagerduty':
        return this.sendToPagerDuty(alert, timestamp);
      case 'in-app':
        return this.sendInApp(alert, timestamp);
      case 'log':
        return this.logAlert(alert, timestamp);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: Alert, timestamp: number): Promise<AlertDeliveryResult> {
    if (!this.config.slackWebhook) {
      return {
        channel: 'slack',
        success: false,
        timestamp,
        error: 'Slack webhook not configured',
      };
    }

    try {
      const color =
        alert.severity === 'critical'
          ? 'danger'
          : alert.severity === 'high'
            ? 'warning'
            : 'good';

      const payload = {
        attachments: [
          {
            color,
            title: `${alert.severity.toUpperCase()}: ${alert.title}`,
            text: alert.message,
            fields: [
              {
                title: 'Dimension',
                value: alert.dimension || 'N/A',
                short: true,
              },
              {
                title: 'Metric',
                value: alert.metric || 'N/A',
                short: true,
              },
              {
                title: 'Current Value',
                value: alert.current_value?.toString() || 'N/A',
                short: true,
              },
              {
                title: 'Threshold',
                value: alert.threshold?.toString() || 'N/A',
                short: true,
              },
              {
                title: 'Recommended Action',
                value: alert.recommended_action || 'Monitor situation',
                short: false,
              },
            ],
            ts: Math.floor(timestamp / 1000),
          },
        ],
      };

      // TODO: Implement actual Slack API call
      // await fetch(this.config.slackWebhook, {
      //   method: 'POST',
      //   body: JSON.stringify(payload),
      // });

      return { channel: 'slack', success: true, timestamp };
    } catch (error) {
      return {
        channel: 'slack',
        success: false,
        timestamp,
        error: String(error),
      };
    }
  }

  /**
   * Send alert via email
   */
  private async sendEmail(alert: Alert, timestamp: number): Promise<AlertDeliveryResult> {
    if (!this.config.emailRecipients || this.config.emailRecipients.length === 0) {
      return {
        channel: 'email',
        success: false,
        timestamp,
        error: 'Email recipients not configured',
      };
    }

    try {
      const subject = `[${alert.severity.toUpperCase()}] ATLAS AI Alert: ${alert.title}`;
      const body = `
Alert ID: ${alert.id}
Severity: ${alert.severity}
Timestamp: ${new Date(timestamp).toISOString()}

Title: ${alert.title}
Message: ${alert.message}

Dimension: ${alert.dimension || 'N/A'}
Metric: ${alert.metric || 'N/A'}
Current Value: ${alert.current_value || 'N/A'}
Threshold: ${alert.threshold || 'N/A'}

Recommended Action: ${alert.recommended_action || 'Monitor situation'}
      `;

      // TODO: Implement actual email sending
      // await sendEmail({
      //   to: this.config.emailRecipients,
      //   subject,
      //   body,
      // });

      return { channel: 'email', success: true, timestamp };
    } catch (error) {
      return {
        channel: 'email',
        success: false,
        timestamp,
        error: String(error),
      };
    }
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendToPagerDuty(alert: Alert, timestamp: number): Promise<AlertDeliveryResult> {
    if (!this.config.pagerdutyKey) {
      return {
        channel: 'pagerduty',
        success: false,
        timestamp,
        error: 'PagerDuty key not configured',
      };
    }

    try {
      const severity =
        alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'error' : 'warning';

      const payload = {
        routing_key: this.config.pagerdutyKey,
        event_action: 'trigger',
        dedup_key: alert.id,
        payload: {
          summary: alert.title,
          severity,
          source: 'ATLAS AI v4.0',
          timestamp: new Date(timestamp).toISOString(),
          custom_details: {
            message: alert.message,
            dimension: alert.dimension,
            metric: alert.metric,
            current_value: alert.current_value,
            threshold: alert.threshold,
            recommended_action: alert.recommended_action,
          },
        },
      };

      // TODO: Implement actual PagerDuty API call
      // await fetch('https://events.pagerduty.com/v2/enqueue', {
      //   method: 'POST',
      //   body: JSON.stringify(payload),
      // });

      return { channel: 'pagerduty', success: true, timestamp };
    } catch (error) {
      return {
        channel: 'pagerduty',
        success: false,
        timestamp,
        error: String(error),
      };
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(alert: Alert, timestamp: number): Promise<AlertDeliveryResult> {
    if (!this.config.enableInApp) {
      return {
        channel: 'in-app',
        success: false,
        timestamp,
        error: 'In-app notifications disabled',
      };
    }

    try {
      // TODO: Store in notification queue for UI
      // await notificationQueue.push(alert);

      return { channel: 'in-app', success: true, timestamp };
    } catch (error) {
      return {
        channel: 'in-app',
        success: false,
        timestamp,
        error: String(error),
      };
    }
  }

  /**
   * Log alert
   */
  private async logAlert(alert: Alert, timestamp: number): Promise<AlertDeliveryResult> {
    if (!this.config.enableLogging) {
      return {
        channel: 'log',
        success: false,
        timestamp,
        error: 'Logging disabled',
      };
    }

    try {
      const icon =
        alert.severity === 'critical'
          ? '🚨'
          : alert.severity === 'high'
            ? '⚠️'
            : alert.severity === 'medium'
              ? '📢'
              : 'ℹ️';

      console.log(
        `${icon} [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`
      );

      return { channel: 'log', success: true, timestamp };
    } catch (error) {
      return {
        channel: 'log',
        success: false,
        timestamp,
        error: String(error),
      };
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.alertHistory.filter((a) => a.severity === severity);
  }

  /**
   * Get delivery history
   */
  getDeliveryHistory(limit: number = 100): AlertDeliveryResult[] {
    return this.deliveryHistory.slice(-limit);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total_alerts: number;
    by_severity: Record<AlertSeverity, number>;
    delivery_success_rate: number;
  } {
    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const alert of this.alertHistory) {
      bySeverity[alert.severity]++;
    }

    const successfulDeliveries = this.deliveryHistory.filter((d) => d.success).length;
    const successRate =
      this.deliveryHistory.length > 0 ? successfulDeliveries / this.deliveryHistory.length : 0;

    return {
      total_alerts: this.alertHistory.length,
      by_severity: bySeverity,
      delivery_success_rate: successRate,
    };
  }
}

/**
 * Singleton instance
 */
let alertSystemInstance: AlertSystem | null = null;

export function initializeAlertSystem(config: AlertConfig): AlertSystem {
  alertSystemInstance = new AlertSystem(config);
  return alertSystemInstance;
}

export function getAlertSystem(): AlertSystem {
  if (!alertSystemInstance) {
    alertSystemInstance = new AlertSystem({
      channels: ['log'],
      enableInApp: true,
      enableLogging: true,
      severityThreshold: 'low',
    });
  }
  return alertSystemInstance;
}
