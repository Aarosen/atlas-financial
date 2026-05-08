/**
 * T2.4: Data Processing Agreements (DPA)
 *
 * Manages Data Processing Agreements for GDPR compliance.
 * Tracks processors, sub-processors, and data processing activities.
 */

export interface DataProcessor {
  id: string;
  name: string;
  type: 'processor' | 'sub_processor';
  address: string;
  contactEmail: string;
  dpaSignedAt?: number;
  purposes: string[];
  dataCategories: string[];
  countries: string[];
  active: boolean;
}

export interface ProcessingActivity {
  id: string;
  description: string;
  processorId: string;
  dataCategories: string[];
  purposes: string[];
  legalBasis: string;
  retentionPeriod: string;
  startDate: number;
  endDate?: number;
}

const processors: Map<string, DataProcessor> = new Map();
const activities: Map<string, ProcessingActivity> = new Map();

/**
 * Register a data processor
 */
export function registerProcessor(processor: Omit<DataProcessor, 'id'>): DataProcessor {
  const id = `processor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullProcessor: DataProcessor = { ...processor, id };
  processors.set(id, fullProcessor);
  return fullProcessor;
}

/**
 * Sign DPA with processor
 */
export function signDPA(processorId: string): DataProcessor | null {
  const processor = processors.get(processorId);
  if (!processor) return null;
  processor.dpaSignedAt = Date.now();
  return processor;
}

/**
 * Get all processors
 */
export function getProcessors(): DataProcessor[] {
  return Array.from(processors.values());
}

/**
 * Record processing activity
 */
export function recordProcessingActivity(
  activity: Omit<ProcessingActivity, 'id'>
): ProcessingActivity {
  const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullActivity: ProcessingActivity = { ...activity, id };
  activities.set(id, fullActivity);
  return fullActivity;
}

/**
 * Get processing activities
 */
export function getProcessingActivities(): ProcessingActivity[] {
  return Array.from(activities.values());
}

/**
 * Clear for testing
 */
export function clearDPAData(): void {
  processors.clear();
  activities.clear();
}
