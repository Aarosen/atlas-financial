/**
 * Atlas Privacy Modes
 *
 * Three privacy tiers for different use cases:
 * 1. guest_local: Data stored locally in IndexedDB, never sent to server
 * 2. signed_in_cloud: Data encrypted and synced to Supabase, user can access across devices
 * 3. enterprise_zdr: Zero data retention — no data stored, all analysis in-memory only
 *
 * Privacy mode is determined by:
 * 1. URL parameter: ?privacy=guest_local|signed_in_cloud|enterprise_zdr
 * 2. localStorage: atlas_privacy_mode (persisted user choice)
 * 3. Authentication status: signed_in users default to signed_in_cloud
 * 4. Fallback: guest_local (most private by default)
 */

export type PrivacyMode = 'guest_local' | 'signed_in_cloud' | 'enterprise_zdr';

export interface PrivacyModeConfig {
  mode: PrivacyMode;
  dataStorage: 'local' | 'cloud' | 'none';
  encryption: boolean;
  retention: 'indefinite' | 'session' | 'none';
  crossDevice: boolean;
  requiresAuth: boolean;
  description: string;
}

/**
 * Privacy mode configurations
 */
export const PRIVACY_MODE_CONFIGS: Record<PrivacyMode, PrivacyModeConfig> = {
  guest_local: {
    mode: 'guest_local',
    dataStorage: 'local',
    encryption: false,
    retention: 'indefinite',
    crossDevice: false,
    requiresAuth: false,
    description: 'Data stored locally in your browser. Never sent to servers. Private by default.',
  },
  signed_in_cloud: {
    mode: 'signed_in_cloud',
    dataStorage: 'cloud',
    encryption: true,
    retention: 'indefinite',
    crossDevice: true,
    requiresAuth: true,
    description: 'Data encrypted and synced to cloud. Access your data across devices. Requires sign-in.',
  },
  enterprise_zdr: {
    mode: 'enterprise_zdr',
    dataStorage: 'none',
    encryption: false,
    retention: 'none',
    crossDevice: false,
    requiresAuth: false,
    description: 'Zero data retention. All analysis in-memory only. Data deleted when session ends.',
  },
};

/**
 * Detect privacy mode from URL parameter, localStorage, or auth status
 *
 * Priority:
 * 1. URL parameter (?privacy=...)
 * 2. localStorage (user preference)
 * 3. Auth status (signed_in → signed_in_cloud, otherwise → guest_local)
 * 4. Fallback: guest_local
 */
export function detectPrivacyMode(options?: {
  urlParam?: string;
  isAuthenticated?: boolean;
}): PrivacyMode {
  // 1. Check URL parameter
  if (options?.urlParam) {
    const param = options.urlParam.toLowerCase();
    if (['guest_local', 'signed_in_cloud', 'enterprise_zdr'].includes(param)) {
      return param as PrivacyMode;
    }
  }

  // 2. Check localStorage
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('atlas_privacy_mode') : null;
    if (stored && ['guest_local', 'signed_in_cloud', 'enterprise_zdr'].includes(stored)) {
      return stored as PrivacyMode;
    }
  } catch {
    // localStorage not available
  }

  // 3. Check auth status
  if (options?.isAuthenticated) {
    return 'signed_in_cloud';
  }

  // 4. Fallback: most private by default
  return 'guest_local';
}

/**
 * Set privacy mode and persist to localStorage
 */
export function setPrivacyMode(mode: PrivacyMode): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('atlas_privacy_mode', mode);
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Get privacy mode configuration
 */
export function getPrivacyModeConfig(mode: PrivacyMode): PrivacyModeConfig {
  return PRIVACY_MODE_CONFIGS[mode];
}

/**
 * Check if privacy mode allows cloud storage
 */
export function allowsCloudStorage(mode: PrivacyMode): boolean {
  return PRIVACY_MODE_CONFIGS[mode].dataStorage === 'cloud';
}

/**
 * Check if privacy mode allows local storage
 */
export function allowsLocalStorage(mode: PrivacyMode): boolean {
  return PRIVACY_MODE_CONFIGS[mode].dataStorage === 'local';
}

/**
 * Check if privacy mode requires authentication
 */
export function requiresAuthentication(mode: PrivacyMode): boolean {
  return PRIVACY_MODE_CONFIGS[mode].requiresAuth;
}

/**
 * Check if privacy mode supports cross-device access
 */
export function supportsCrossDevice(mode: PrivacyMode): boolean {
  return PRIVACY_MODE_CONFIGS[mode].crossDevice;
}

/**
 * Get data retention policy for privacy mode
 */
export function getRetentionPolicy(mode: PrivacyMode): 'indefinite' | 'session' | 'none' {
  return PRIVACY_MODE_CONFIGS[mode].retention;
}
