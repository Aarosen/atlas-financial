import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectPrivacyMode,
  setPrivacyMode,
  getPrivacyModeConfig,
  allowsCloudStorage,
  allowsLocalStorage,
  requiresAuthentication,
  supportsCrossDevice,
  getRetentionPolicy,
  PRIVACY_MODE_CONFIGS,
} from '../privacyModes';

describe('Privacy Modes (T1.1)', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    global.localStorage = {
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
    localStorage.clear();
  });

  describe('detectPrivacyMode', () => {
    it('detects guest_local from URL parameter', () => {
      const mode = detectPrivacyMode({ urlParam: 'guest_local' });
      expect(mode).toBe('guest_local');
    });

    it('detects signed_in_cloud from URL parameter', () => {
      const mode = detectPrivacyMode({ urlParam: 'signed_in_cloud' });
      expect(mode).toBe('signed_in_cloud');
    });

    it('detects enterprise_zdr from URL parameter', () => {
      const mode = detectPrivacyMode({ urlParam: 'enterprise_zdr' });
      expect(mode).toBe('enterprise_zdr');
    });

    it('ignores invalid URL parameter and falls back to localStorage', () => {
      localStorage.setItem('atlas_privacy_mode', 'signed_in_cloud');
      const mode = detectPrivacyMode({ urlParam: 'invalid_mode' });
      expect(mode).toBe('signed_in_cloud');
    });

    it('detects from localStorage when URL param not provided', () => {
      localStorage.setItem('atlas_privacy_mode', 'enterprise_zdr');
      const mode = detectPrivacyMode();
      expect(mode).toBe('enterprise_zdr');
    });

    it('defaults to signed_in_cloud when authenticated', () => {
      const mode = detectPrivacyMode({ isAuthenticated: true });
      expect(mode).toBe('signed_in_cloud');
    });

    it('defaults to guest_local when not authenticated', () => {
      const mode = detectPrivacyMode({ isAuthenticated: false });
      expect(mode).toBe('guest_local');
    });

    it('prioritizes URL parameter over localStorage', () => {
      localStorage.setItem('atlas_privacy_mode', 'guest_local');
      const mode = detectPrivacyMode({ urlParam: 'enterprise_zdr' });
      expect(mode).toBe('enterprise_zdr');
    });

    it('prioritizes URL parameter over auth status', () => {
      const mode = detectPrivacyMode({
        urlParam: 'guest_local',
        isAuthenticated: true,
      });
      expect(mode).toBe('guest_local');
    });

    it('is case-insensitive for URL parameter', () => {
      const mode = detectPrivacyMode({ urlParam: 'GUEST_LOCAL' });
      expect(mode).toBe('guest_local');
    });
  });

  describe('setPrivacyMode', () => {
    it('persists privacy mode to localStorage', () => {
      setPrivacyMode('signed_in_cloud');
      expect(localStorage.getItem('atlas_privacy_mode')).toBe('signed_in_cloud');
    });

    it('overwrites existing privacy mode', () => {
      setPrivacyMode('guest_local');
      setPrivacyMode('enterprise_zdr');
      expect(localStorage.getItem('atlas_privacy_mode')).toBe('enterprise_zdr');
    });
  });

  describe('getPrivacyModeConfig', () => {
    it('returns config for guest_local', () => {
      const config = getPrivacyModeConfig('guest_local');
      expect(config.mode).toBe('guest_local');
      expect(config.dataStorage).toBe('local');
      expect(config.encryption).toBe(false);
      expect(config.retention).toBe('indefinite');
      expect(config.crossDevice).toBe(false);
      expect(config.requiresAuth).toBe(false);
    });

    it('returns config for signed_in_cloud', () => {
      const config = getPrivacyModeConfig('signed_in_cloud');
      expect(config.mode).toBe('signed_in_cloud');
      expect(config.dataStorage).toBe('cloud');
      expect(config.encryption).toBe(true);
      expect(config.retention).toBe('indefinite');
      expect(config.crossDevice).toBe(true);
      expect(config.requiresAuth).toBe(true);
    });

    it('returns config for enterprise_zdr', () => {
      const config = getPrivacyModeConfig('enterprise_zdr');
      expect(config.mode).toBe('enterprise_zdr');
      expect(config.dataStorage).toBe('none');
      expect(config.encryption).toBe(false);
      expect(config.retention).toBe('none');
      expect(config.crossDevice).toBe(false);
      expect(config.requiresAuth).toBe(false);
    });
  });

  describe('allowsCloudStorage', () => {
    it('returns false for guest_local', () => {
      expect(allowsCloudStorage('guest_local')).toBe(false);
    });

    it('returns true for signed_in_cloud', () => {
      expect(allowsCloudStorage('signed_in_cloud')).toBe(true);
    });

    it('returns false for enterprise_zdr', () => {
      expect(allowsCloudStorage('enterprise_zdr')).toBe(false);
    });
  });

  describe('allowsLocalStorage', () => {
    it('returns true for guest_local', () => {
      expect(allowsLocalStorage('guest_local')).toBe(true);
    });

    it('returns false for signed_in_cloud', () => {
      expect(allowsLocalStorage('signed_in_cloud')).toBe(false);
    });

    it('returns false for enterprise_zdr', () => {
      expect(allowsLocalStorage('enterprise_zdr')).toBe(false);
    });
  });

  describe('requiresAuthentication', () => {
    it('returns false for guest_local', () => {
      expect(requiresAuthentication('guest_local')).toBe(false);
    });

    it('returns true for signed_in_cloud', () => {
      expect(requiresAuthentication('signed_in_cloud')).toBe(true);
    });

    it('returns false for enterprise_zdr', () => {
      expect(requiresAuthentication('enterprise_zdr')).toBe(false);
    });
  });

  describe('supportsCrossDevice', () => {
    it('returns false for guest_local', () => {
      expect(supportsCrossDevice('guest_local')).toBe(false);
    });

    it('returns true for signed_in_cloud', () => {
      expect(supportsCrossDevice('signed_in_cloud')).toBe(true);
    });

    it('returns false for enterprise_zdr', () => {
      expect(supportsCrossDevice('enterprise_zdr')).toBe(false);
    });
  });

  describe('getRetentionPolicy', () => {
    it('returns indefinite for guest_local', () => {
      expect(getRetentionPolicy('guest_local')).toBe('indefinite');
    });

    it('returns indefinite for signed_in_cloud', () => {
      expect(getRetentionPolicy('signed_in_cloud')).toBe('indefinite');
    });

    it('returns none for enterprise_zdr', () => {
      expect(getRetentionPolicy('enterprise_zdr')).toBe('none');
    });
  });

  describe('PRIVACY_MODE_CONFIGS', () => {
    it('has all three modes configured', () => {
      expect(Object.keys(PRIVACY_MODE_CONFIGS)).toHaveLength(3);
      expect(PRIVACY_MODE_CONFIGS.guest_local).toBeDefined();
      expect(PRIVACY_MODE_CONFIGS.signed_in_cloud).toBeDefined();
      expect(PRIVACY_MODE_CONFIGS.enterprise_zdr).toBeDefined();
    });

    it('all configs have required fields', () => {
      Object.values(PRIVACY_MODE_CONFIGS).forEach(config => {
        expect(config.mode).toBeDefined();
        expect(config.dataStorage).toBeDefined();
        expect(config.encryption).toBeDefined();
        expect(config.retention).toBeDefined();
        expect(config.crossDevice).toBeDefined();
        expect(config.requiresAuth).toBeDefined();
        expect(config.description).toBeDefined();
      });
    });
  });

  describe('T1.1 Integration Tests', () => {
    it('complete flow: detect → set → detect again', () => {
      // Initial detection
      let mode = detectPrivacyMode({ urlParam: 'guest_local' });
      expect(mode).toBe('guest_local');

      // Set new mode
      setPrivacyMode('signed_in_cloud');

      // Detect again (should get from localStorage)
      mode = detectPrivacyMode();
      expect(mode).toBe('signed_in_cloud');
    });

    it('privacy mode determines data handling capabilities', () => {
      const modes = ['guest_local', 'signed_in_cloud', 'enterprise_zdr'] as const;

      modes.forEach(mode => {
        const config = getPrivacyModeConfig(mode);
        const canCloud = allowsCloudStorage(mode);
        const canLocal = allowsLocalStorage(mode);
        const needsAuth = requiresAuthentication(mode);

        // Verify consistency
        if (config.dataStorage === 'cloud') {
          expect(canCloud).toBe(true);
          expect(canLocal).toBe(false);
        } else if (config.dataStorage === 'local') {
          expect(canCloud).toBe(false);
          expect(canLocal).toBe(true);
        } else {
          expect(canCloud).toBe(false);
          expect(canLocal).toBe(false);
        }

        expect(needsAuth).toBe(config.requiresAuth);
      });
    });
  });
});
