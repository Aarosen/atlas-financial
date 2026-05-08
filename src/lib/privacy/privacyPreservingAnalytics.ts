/**
 * T3.1: Privacy-Preserving Analytics
 *
 * Implements differential privacy and aggregation techniques
 * to enable analytics without exposing individual data.
 *
 * Techniques:
 * - Differential Privacy: Add noise to protect individual records
 * - K-Anonymity: Ensure groups of at least k individuals are indistinguishable
 * - L-Diversity: Ensure diverse values within each group
 * - Data Aggregation: Compute statistics without storing raw data
 * - Noise Addition: Laplace/Gaussian noise for differential privacy
 */

export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: string;
  timestamp: number;
  properties: Record<string, unknown>;
  sensitive: boolean;
}

export interface AggregatedMetric {
  metric: string;
  value: number;
  noiseAdded: number;
  epsilon: number; // Privacy budget
  timestamp: number;
}

export interface DifferentialPrivacyConfig {
  epsilon: number; // Privacy budget (smaller = more privacy, less accuracy)
  delta: number; // Probability of privacy breach
  mechanism: 'laplace' | 'gaussian';
}

export interface KAnonymityResult {
  isAnonymous: boolean;
  groupSize: number;
  minGroupSize: number;
  attributes: string[];
}

export interface AnalyticsReport {
  generatedAt: number;
  metrics: AggregatedMetric[];
  privacyBudgetUsed: number;
  privacyBudgetRemaining: number;
  anonymityLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Default differential privacy configuration
 * epsilon = 1.0 provides strong privacy
 * epsilon = 10.0 provides weaker privacy but better accuracy
 */
export const DEFAULT_DP_CONFIG: DifferentialPrivacyConfig = {
  epsilon: 1.0,
  delta: 1e-6,
  mechanism: 'laplace',
};

const events: AnalyticsEvent[] = [];
const privacyBudget = { used: 0, total: 100 }; // Total epsilon budget

/**
 * Record analytics event
 */
export function recordAnalyticsEvent(
  userId: string,
  eventType: string,
  properties: Record<string, unknown>,
  sensitive: boolean = false
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    eventType,
    timestamp: Date.now(),
    properties,
    sensitive,
  };

  events.push(event);
  return event;
}

/**
 * Generate Laplace noise for differential privacy
 * Laplace(0, b) where b = sensitivity / epsilon
 */
function generateLaplaceNoise(sensitivity: number, epsilon: number): number {
  const b = sensitivity / epsilon;
  const u = Math.random() - 0.5;
  return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Generate Gaussian noise for differential privacy
 * N(0, sigma^2) where sigma = sqrt(2 * ln(1.25/delta)) * sensitivity / epsilon
 */
function generateGaussianNoise(
  sensitivity: number,
  epsilon: number,
  delta: number
): number {
  const sigma = (Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity) / epsilon;
  // Box-Muller transform for Gaussian
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * sigma;
}

/**
 * Add differential privacy noise to a value
 */
export function addDifferentialPrivacyNoise(
  value: number,
  sensitivity: number = 1,
  config: DifferentialPrivacyConfig = DEFAULT_DP_CONFIG
): { noisyValue: number; noise: number } {
  let noise = 0;

  if (config.mechanism === 'laplace') {
    noise = generateLaplaceNoise(sensitivity, config.epsilon);
  } else {
    noise = generateGaussianNoise(sensitivity, config.epsilon, config.delta);
  }

  privacyBudget.used += config.epsilon;

  return {
    noisyValue: value + noise,
    noise,
  };
}

/**
 * Count events with differential privacy
 */
export function countWithDifferentialPrivacy(
  filter: (event: AnalyticsEvent) => boolean,
  config: DifferentialPrivacyConfig = DEFAULT_DP_CONFIG
): AggregatedMetric {
  const count = events.filter(filter).length;
  const { noisyValue, noise } = addDifferentialPrivacyNoise(count, 1, config);

  return {
    metric: 'count',
    value: Math.max(0, noisyValue), // Ensure non-negative
    noiseAdded: noise,
    epsilon: config.epsilon,
    timestamp: Date.now(),
  };
}

/**
 * Sum values with differential privacy
 */
export function sumWithDifferentialPrivacy(
  filter: (event: AnalyticsEvent) => boolean,
  valueExtractor: (event: AnalyticsEvent) => number,
  sensitivity: number = 1000, // Assume max value is 1000
  config: DifferentialPrivacyConfig = DEFAULT_DP_CONFIG
): AggregatedMetric {
  const sum = events.filter(filter).reduce((acc, event) => acc + valueExtractor(event), 0);
  const { noisyValue, noise } = addDifferentialPrivacyNoise(sum, sensitivity, config);

  return {
    metric: 'sum',
    value: noisyValue,
    noiseAdded: noise,
    epsilon: config.epsilon,
    timestamp: Date.now(),
  };
}

/**
 * Average with differential privacy
 */
export function averageWithDifferentialPrivacy(
  filter: (event: AnalyticsEvent) => boolean,
  valueExtractor: (event: AnalyticsEvent) => number,
  sensitivity: number = 1000,
  config: DifferentialPrivacyConfig = DEFAULT_DP_CONFIG
): AggregatedMetric {
  const filtered = events.filter(filter);
  if (filtered.length === 0) {
    return {
      metric: 'average',
      value: 0,
      noiseAdded: 0,
      epsilon: 0,
      timestamp: Date.now(),
    };
  }

  const sum = filtered.reduce((acc, event) => acc + valueExtractor(event), 0);
  const average = sum / filtered.length;
  const { noisyValue, noise } = addDifferentialPrivacyNoise(average, sensitivity / filtered.length, config);

  return {
    metric: 'average',
    value: noisyValue,
    noiseAdded: noise,
    epsilon: config.epsilon,
    timestamp: Date.now(),
  };
}

/**
 * Check k-anonymity
 * Ensures that each combination of quasi-identifiers appears at least k times
 */
export function checkKAnonymity(
  attributes: string[],
  minGroupSize: number = 5
): KAnonymityResult {
  // Group events by attribute combinations
  const groups = new Map<string, number>();

  events.forEach(event => {
    const key = attributes
      .map(attr => {
        const value = event.properties[attr];
        return `${attr}:${value}`;
      })
      .join('|');

    groups.set(key, (groups.get(key) || 0) + 1);
  });

  // Check if all groups meet minimum size
  const isAnonymous = Array.from(groups.values()).every(size => size >= minGroupSize);
  const minActualGroupSize = Math.min(...Array.from(groups.values()));

  return {
    isAnonymous,
    groupSize: groups.size,
    minGroupSize,
    attributes,
  };
}

/**
 * Check l-diversity
 * Ensures diverse values within each group
 */
export function checkLDiversity(
  attributes: string[],
  sensitiveAttribute: string,
  minDiversity: number = 2
): boolean {
  // Group events by attribute combinations
  const groups = new Map<string, Set<unknown>>();

  events.forEach(event => {
    const key = attributes
      .map(attr => {
        const value = event.properties[attr];
        return `${attr}:${value}`;
      })
      .join('|');

    if (!groups.has(key)) {
      groups.set(key, new Set());
    }

    const sensitiveValue = event.properties[sensitiveAttribute];
    groups.get(key)!.add(sensitiveValue);
  });

  // Check if all groups have sufficient diversity
  return Array.from(groups.values()).every(set => set.size >= minDiversity);
}

/**
 * Aggregate events by category
 */
export function aggregateByCategory(
  categoryAttribute: string
): Record<string, number> {
  const aggregated: Record<string, number> = {};

  events.forEach(event => {
    const category = String(event.properties[categoryAttribute]);
    aggregated[category] = (aggregated[category] || 0) + 1;
  });

  return aggregated;
}

/**
 * Generate privacy-preserving analytics report
 */
export function generateAnalyticsReport(
  config: DifferentialPrivacyConfig = DEFAULT_DP_CONFIG
): AnalyticsReport {
  const metrics: AggregatedMetric[] = [];

  // Total events
  metrics.push(
    countWithDifferentialPrivacy(() => true, config)
  );

  // Events by type
  const eventTypes = new Set(events.map(e => e.eventType));
  eventTypes.forEach(type => {
    metrics.push(
      countWithDifferentialPrivacy(e => e.eventType === type, config)
    );
  });

  // Check anonymity
  const kAnonymity = checkKAnonymity(['eventType'], 5);
  const lDiversity = checkLDiversity(['eventType'], 'userId', 2);

  let anonymityLevel: 'low' | 'medium' | 'high' = 'low';
  if (kAnonymity.isAnonymous && lDiversity) {
    anonymityLevel = 'high';
  } else if (kAnonymity.isAnonymous) {
    anonymityLevel = 'medium';
  }

  const recommendations: string[] = [];
  if (!kAnonymity.isAnonymous) {
    recommendations.push(`Increase minimum group size to ${kAnonymity.minGroupSize + 1}`);
  }
  if (!lDiversity) {
    recommendations.push('Ensure sufficient diversity in sensitive attributes');
  }
  if (privacyBudget.used > privacyBudget.total * 0.8) {
    recommendations.push('Privacy budget nearly exhausted, reduce analytics frequency');
  }

  return {
    generatedAt: Date.now(),
    metrics,
    privacyBudgetUsed: privacyBudget.used,
    privacyBudgetRemaining: privacyBudget.total - privacyBudget.used,
    anonymityLevel,
    recommendations,
  };
}

/**
 * Reset privacy budget (daily/weekly)
 */
export function resetPrivacyBudget(): void {
  privacyBudget.used = 0;
}

/**
 * Get privacy budget status
 */
export function getPrivacyBudgetStatus(): { used: number; remaining: number; percentUsed: number } {
  return {
    used: privacyBudget.used,
    remaining: privacyBudget.total - privacyBudget.used,
    percentUsed: (privacyBudget.used / privacyBudget.total) * 100,
  };
}

/**
 * Clear events (for testing)
 */
export function clearAnalyticsEvents(): void {
  events.length = 0;
  privacyBudget.used = 0;
}
