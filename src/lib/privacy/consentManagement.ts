/**
 * T2.3: Consent Management
 *
 * Implements granular consent tracking for GDPR/CCPA compliance.
 * Users can give/withdraw consent for specific data processing purposes:
 * - Marketing communications
 * - Analytics and profiling
 * - Third-party sharing
 * - Automated decision-making
 * - Cookie tracking
 *
 * All consent decisions are:
 * - Explicitly tracked with timestamps
 * - Easily withdrawable
 * - Logged for audit trail
 * - Stored with version history
 */

import { logAuditEvent } from './auditLogging';

export interface ConsentCategory {
  id: string;
  name: string;
  description: string;
  required: boolean; // Essential for service operation
  purposes: string[];
}

export interface UserConsent {
  userId: string;
  consentId: string;
  category: string;
  given: boolean;
  timestamp: number;
  expiresAt?: number;
  ipAddress?: string;
  userAgent?: string;
  method: 'explicit' | 'implicit' | 'withdrawn';
  version: number;
}

export interface ConsentRecord {
  userId: string;
  timestamp: number;
  consents: Record<string, boolean>;
  version: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Standard GDPR/CCPA consent categories
 */
export const CONSENT_CATEGORIES: Record<string, ConsentCategory> = {
  essential: {
    id: 'essential',
    name: 'Essential Cookies',
    description: 'Required for website functionality',
    required: true,
    purposes: ['authentication', 'security', 'session_management'],
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Communications',
    description: 'Email newsletters, promotional content',
    required: false,
    purposes: ['email_marketing', 'promotional_offers', 'product_updates'],
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics & Profiling',
    description: 'Usage analytics, behavior tracking, personalization',
    required: false,
    purposes: ['usage_analytics', 'behavior_profiling', 'personalization'],
  },
  thirdparty: {
    id: 'thirdparty',
    name: 'Third-Party Sharing',
    description: 'Share data with partners for enhanced services',
    required: false,
    purposes: ['partner_services', 'data_enrichment', 'market_research'],
  },
  automated: {
    id: 'automated',
    name: 'Automated Decision-Making',
    description: 'Automated profiling and decision-making',
    required: false,
    purposes: ['credit_scoring', 'risk_assessment', 'automated_decisions'],
  },
};

/**
 * In-memory storage for user consents
 */
const userConsents: Map<string, UserConsent[]> = new Map();
const consentRecords: Map<string, ConsentRecord[]> = new Map();

/**
 * Get all consent categories
 */
export function getConsentCategories(): ConsentCategory[] {
  return Object.values(CONSENT_CATEGORIES);
}

/**
 * Get consent category by ID
 */
export function getConsentCategory(categoryId: string): ConsentCategory | undefined {
  return CONSENT_CATEGORIES[categoryId];
}

/**
 * Record user consent
 */
export function recordConsent(
  userId: string,
  categoryId: string,
  given: boolean,
  method: 'explicit' | 'implicit' | 'withdrawn' = 'explicit',
  ipAddress?: string,
  userAgent?: string
): UserConsent {
  const consent: UserConsent = {
    userId,
    consentId: `consent_${userId}_${categoryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category: categoryId,
    given,
    timestamp: Date.now(),
    ipAddress,
    userAgent,
    method,
    version: 1,
  };

  if (!userConsents.has(userId)) {
    userConsents.set(userId, []);
  }

  userConsents.get(userId)!.push(consent);

  logAuditEvent({
    timestamp: Date.now(),
    userId,
    action: 'data_retention_policy_change',
    privacyMode: 'guest_local',
    status: 'success',
    details: {
      action: 'consent_recorded',
      category: categoryId,
      given,
      method,
    },
  });

  return consent;
}

/**
 * Withdraw consent for a category
 */
export function withdrawConsent(
  userId: string,
  categoryId: string
): UserConsent {
  return recordConsent(userId, categoryId, false, 'withdrawn');
}

/**
 * Get current consent status for user
 */
export function getUserConsent(
  userId: string,
  categoryId: string
): boolean | null {
  const consents = userConsents.get(userId);
  if (!consents || consents.length === 0) {
    return null;
  }

  // Get most recent consent for this category
  const categoryConsents = consents
    .filter(c => c.category === categoryId)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (categoryConsents.length === 0) {
    return null;
  }

  return categoryConsents[0].given;
}

/**
 * Get all consents for user
 */
export function getUserConsents(userId: string): Record<string, boolean> {
  const consents = userConsents.get(userId) || [];
  const result: Record<string, boolean> = {};

  // Get most recent consent for each category
  const categoryMap = new Map<string, UserConsent>();
  consents.forEach(consent => {
    const existing = categoryMap.get(consent.category);
    if (!existing || consent.timestamp > existing.timestamp) {
      categoryMap.set(consent.category, consent);
    }
  });

  categoryMap.forEach((consent, category) => {
    result[category] = consent.given;
  });

  return result;
}

/**
 * Get consent history for user
 */
export function getConsentHistory(userId: string): UserConsent[] {
  return (userConsents.get(userId) || []).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Check if user has given consent for a purpose
 */
export function hasConsentForPurpose(
  userId: string,
  purpose: string
): boolean {
  // Find which category covers this purpose
  for (const category of Object.values(CONSENT_CATEGORIES)) {
    if (category.purposes.includes(purpose)) {
      const consent = getUserConsent(userId, category.id);
      if (consent === true) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create consent snapshot (for record-keeping)
 */
export function createConsentSnapshot(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): ConsentRecord {
  const consents = getUserConsents(userId);
  const record: ConsentRecord = {
    userId,
    timestamp: Date.now(),
    consents,
    version: 1,
    ipAddress,
    userAgent,
  };

  if (!consentRecords.has(userId)) {
    consentRecords.set(userId, []);
  }

  consentRecords.get(userId)!.push(record);

  return record;
}

/**
 * Get consent snapshots for user
 */
export function getConsentSnapshots(userId: string): ConsentRecord[] {
  return (consentRecords.get(userId) || []).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Generate consent report
 */
export function generateConsentReport(userId: string): {
  userId: string;
  timestamp: number;
  currentConsents: Record<string, boolean>;
  consentHistory: UserConsent[];
  snapshots: ConsentRecord[];
  allConsentsGiven: boolean;
  essentialOnly: boolean;
} {
  const currentConsents = getUserConsents(userId);
  const consentHistory = getConsentHistory(userId);
  const snapshots = getConsentSnapshots(userId);

  const allConsentsGiven = Object.values(currentConsents).every(v => v === true);
  const essentialOnly =
    currentConsents.essential === true &&
    Object.entries(currentConsents)
      .filter(([key]) => key !== 'essential')
      .every(([, value]) => value === false);

  return {
    userId,
    timestamp: Date.now(),
    currentConsents,
    consentHistory,
    snapshots,
    allConsentsGiven,
    essentialOnly,
  };
}

/**
 * Bulk consent update (e.g., from consent banner)
 */
export function updateBulkConsent(
  userId: string,
  consents: Record<string, boolean>,
  ipAddress?: string,
  userAgent?: string
): UserConsent[] {
  const recorded: UserConsent[] = [];

  Object.entries(consents).forEach(([categoryId, given]) => {
    const consent = recordConsent(userId, categoryId, given, 'explicit', ipAddress, userAgent);
    recorded.push(consent);
  });

  return recorded;
}

/**
 * Check if consent has expired
 */
export function isConsentExpired(consent: UserConsent): boolean {
  if (!consent.expiresAt) {
    return false; // No expiration
  }

  return Date.now() > consent.expiresAt;
}

/**
 * Get consent compliance status
 */
export function getComplianceStatus(userId: string): {
  compliant: boolean;
  issues: string[];
  recommendations: string[];
} {
  const consents = getUserConsents(userId);
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check essential consents
  if (consents.essential !== true) {
    issues.push('Essential cookies consent not given');
    recommendations.push('Essential cookies are required for service operation');
  }

  // Check for any explicit consent
  if (Object.keys(consents).length === 0) {
    recommendations.push('User has not yet provided any consent preferences');
  }

  // Check for consent withdrawal
  const history = getConsentHistory(userId);
  const withdrawals = history.filter(h => h.method === 'withdrawn');
  if (withdrawals.length > 0) {
    recommendations.push(`User has withdrawn ${withdrawals.length} consent(s)`);
  }

  return {
    compliant: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Clear all consents for user (for testing or account deletion)
 */
export function clearUserConsents(userId: string): void {
  userConsents.delete(userId);
  consentRecords.delete(userId);
}

/**
 * Clear all consent data (for testing)
 */
export function clearAllConsents(): void {
  userConsents.clear();
  consentRecords.clear();
}
