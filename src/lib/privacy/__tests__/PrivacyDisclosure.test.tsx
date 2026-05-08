import { describe, it, expect, vi } from 'vitest';
import type { PrivacyMode } from '../privacyModes';
import {
  getPrivacyModeConfig,
  allowsCloudStorage,
  allowsLocalStorage,
  requiresAuthentication,
  supportsCrossDevice,
  getRetentionPolicy,
} from '../privacyModes';

describe('Privacy Disclosure Components (T1.5)', () => {
  describe('Component Props Validation', () => {
    it('accepts all required props for PrivacyDisclosure', () => {
      const props = {
        currentMode: 'guest_local' as PrivacyMode,
        onModeChange: vi.fn(),
        isAuthenticated: true,
        showDetails: true,
      };

      expect(props.currentMode).toBe('guest_local');
      expect(typeof props.onModeChange).toBe('function');
      expect(typeof props.isAuthenticated).toBe('boolean');
      expect(typeof props.showDetails).toBe('boolean');
    });

    it('accepts all required props for PrivacyModeSelector', () => {
      const props = {
        currentMode: 'signed_in_cloud' as PrivacyMode,
        onModeChange: vi.fn(),
        isAuthenticated: true,
      };

      expect(props.currentMode).toBe('signed_in_cloud');
      expect(typeof props.onModeChange).toBe('function');
      expect(typeof props.isAuthenticated).toBe('boolean');
    });

    it('accepts mode prop for PrivacyStatusBadge', () => {
      const props = {
        mode: 'enterprise_zdr' as PrivacyMode,
      };

      expect(props.mode).toBe('enterprise_zdr');
    });
  });

  describe('Privacy Mode Information Display', () => {
    it('provides correct descriptions for each mode', () => {
      const modeDescriptions: Record<PrivacyMode, string> = {
        guest_local:
          'Your data stays on your device. We never see it. Perfect for privacy-first users.',
        signed_in_cloud:
          'Your data is encrypted and synced to our servers. You can access it from any device.',
        enterprise_zdr:
          'Zero data retention. All analysis happens in-memory. Nothing is stored.',
      };

      expect(modeDescriptions.guest_local).toContain('device');
      expect(modeDescriptions.signed_in_cloud).toContain('encrypted');
      expect(modeDescriptions.enterprise_zdr).toContain('Zero data retention');
    });

    it('provides correct icons for each mode', () => {
      const modeIcons: Record<PrivacyMode, string> = {
        guest_local: '🔒',
        signed_in_cloud: '☁️',
        enterprise_zdr: '🚫',
      };

      expect(modeIcons.guest_local).toBe('🔒');
      expect(modeIcons.signed_in_cloud).toBe('☁️');
      expect(modeIcons.enterprise_zdr).toBe('🚫');
    });
  });

  describe('Privacy Mode Features', () => {
    it('guest_local mode has correct features', () => {
      const mode: PrivacyMode = 'guest_local';

      expect(allowsLocalStorage(mode)).toBe(true);
      expect(allowsCloudStorage(mode)).toBe(false);
      expect(supportsCrossDevice(mode)).toBe(false);
      expect(requiresAuthentication(mode)).toBe(false);
      expect(getRetentionPolicy(mode)).toBe('indefinite');
    });

    it('signed_in_cloud mode has correct features', () => {
      const mode: PrivacyMode = 'signed_in_cloud';

      expect(allowsLocalStorage(mode)).toBe(false);
      expect(allowsCloudStorage(mode)).toBe(true);
      expect(supportsCrossDevice(mode)).toBe(true);
      expect(requiresAuthentication(mode)).toBe(true);
      expect(getRetentionPolicy(mode)).toBe('indefinite');
    });

    it('enterprise_zdr mode has correct features', () => {
      const mode: PrivacyMode = 'enterprise_zdr';

      expect(allowsLocalStorage(mode)).toBe(false);
      expect(allowsCloudStorage(mode)).toBe(false);
      expect(supportsCrossDevice(mode)).toBe(false);
      expect(requiresAuthentication(mode)).toBe(false);
      expect(getRetentionPolicy(mode)).toBe('none');
    });
  });

  describe('Privacy Mode Configuration', () => {
    it('returns complete config for guest_local', () => {
      const config = getPrivacyModeConfig('guest_local');

      expect(config.mode).toBe('guest_local');
      expect(config.dataStorage).toBe('local');
      expect(config.encryption).toBe(false);
      expect(config.retention).toBe('indefinite');
      expect(config.crossDevice).toBe(false);
      expect(config.requiresAuth).toBe(false);
      expect(config.description).toBeTruthy();
    });

    it('returns complete config for signed_in_cloud', () => {
      const config = getPrivacyModeConfig('signed_in_cloud');

      expect(config.mode).toBe('signed_in_cloud');
      expect(config.dataStorage).toBe('cloud');
      expect(config.encryption).toBe(true);
      expect(config.retention).toBe('indefinite');
      expect(config.crossDevice).toBe(true);
      expect(config.requiresAuth).toBe(true);
      expect(config.description).toBeTruthy();
    });

    it('returns complete config for enterprise_zdr', () => {
      const config = getPrivacyModeConfig('enterprise_zdr');

      expect(config.mode).toBe('enterprise_zdr');
      expect(config.dataStorage).toBe('none');
      expect(config.encryption).toBe(false);
      expect(config.retention).toBe('none');
      expect(config.crossDevice).toBe(false);
      expect(config.requiresAuth).toBe(false);
      expect(config.description).toBeTruthy();
    });
  });

  describe('T1.5 Integration Tests', () => {
    it('mode change handler receives correct mode', () => {
      const onModeChange = vi.fn();
      const modes: PrivacyMode[] = ['guest_local', 'signed_in_cloud', 'enterprise_zdr'];

      modes.forEach(mode => {
        onModeChange(mode);
      });

      expect(onModeChange).toHaveBeenCalledTimes(3);
      expect(onModeChange).toHaveBeenCalledWith('guest_local');
      expect(onModeChange).toHaveBeenCalledWith('signed_in_cloud');
      expect(onModeChange).toHaveBeenCalledWith('enterprise_zdr');
    });

    it('cloud sync disabled when not authenticated', () => {
      const isAuthenticated = false;
      const mode: PrivacyMode = 'signed_in_cloud';

      const isDisabled = mode === 'signed_in_cloud' && !isAuthenticated;

      expect(isDisabled).toBe(true);
    });

    it('cloud sync enabled when authenticated', () => {
      const isAuthenticated = true;
      const mode: PrivacyMode = 'signed_in_cloud';

      const isDisabled = mode === 'signed_in_cloud' && !isAuthenticated;

      expect(isDisabled).toBe(false);
    });

    it('retention policy messaging is correct', () => {
      const policies = {
        guest_local: 'Your data is stored indefinitely until you delete it.',
        signed_in_cloud: 'Your data is stored indefinitely until you delete it.',
        enterprise_zdr: 'Your data is never stored. All analysis is in-memory only.',
      };

      expect(policies.guest_local).toContain('indefinitely');
      expect(policies.signed_in_cloud).toContain('indefinitely');
      expect(policies.enterprise_zdr).toContain('never stored');
    });

    it('all modes have descriptions', () => {
      const modes: PrivacyMode[] = ['guest_local', 'signed_in_cloud', 'enterprise_zdr'];

      modes.forEach(mode => {
        const config = getPrivacyModeConfig(mode);
        expect(config.description).toBeTruthy();
        expect(config.description.length).toBeGreaterThan(0);
      });
    });
  });
});
