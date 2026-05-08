/**
 * T1.5: Privacy Disclosure UI Component
 *
 * Displays privacy mode information and allows users to:
 * 1. Understand their current privacy mode
 * 2. See what data is stored and where
 * 3. Change privacy mode (if allowed)
 * 4. View privacy policies
 */

import React, { useState } from 'react';
import type { PrivacyMode } from './privacyModes';
import {
  getPrivacyModeConfig,
  allowsCloudStorage,
  allowsLocalStorage,
  requiresAuthentication,
  supportsCrossDevice,
  getRetentionPolicy,
} from './privacyModes';

export interface PrivacyDisclosureProps {
  currentMode: PrivacyMode;
  onModeChange?: (mode: PrivacyMode) => void;
  isAuthenticated?: boolean;
  showDetails?: boolean;
}

/**
 * Privacy Disclosure Component
 *
 * Shows user their current privacy mode and data handling practices.
 */
export function PrivacyDisclosure({
  currentMode,
  onModeChange,
  isAuthenticated = false,
  showDetails = true,
}: PrivacyDisclosureProps) {
  const [expanded, setExpanded] = useState(showDetails);
  const config = getPrivacyModeConfig(currentMode);

  const modeDescriptions: Record<PrivacyMode, string> = {
    guest_local:
      'Your data stays on your device. We never see it. Perfect for privacy-first users.',
    signed_in_cloud:
      'Your data is encrypted and synced to our servers. You can access it from any device.',
    enterprise_zdr:
      'Zero data retention. All analysis happens in-memory. Nothing is stored.',
  };

  const modeIcons: Record<PrivacyMode, string> = {
    guest_local: '🔒',
    signed_in_cloud: '☁️',
    enterprise_zdr: '🚫',
  };

  return (
    <div className="privacy-disclosure">
      {/* Header */}
      <div className="privacy-header">
        <div className="privacy-mode-badge">
          <span className="icon">{modeIcons[currentMode]}</span>
          <div className="mode-info">
            <h3 className="mode-name">
              {currentMode.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <p className="mode-description">{modeDescriptions[currentMode]}</p>
          </div>
        </div>
        <button
          className="expand-button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Hide details' : 'Show details'}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* Details Section */}
      {expanded && (
        <div className="privacy-details">
          {/* Data Storage */}
          <section className="detail-section">
            <h4>Data Storage</h4>
            <ul className="feature-list">
              <li className={allowsLocalStorage(currentMode) ? 'enabled' : 'disabled'}>
                <span className="status">
                  {allowsLocalStorage(currentMode) ? '✓' : '✗'}
                </span>
                Local storage (on your device)
              </li>
              <li className={allowsCloudStorage(currentMode) ? 'enabled' : 'disabled'}>
                <span className="status">
                  {allowsCloudStorage(currentMode) ? '✓' : '✗'}
                </span>
                Cloud storage (encrypted)
              </li>
            </ul>
          </section>

          {/* Capabilities */}
          <section className="detail-section">
            <h4>Capabilities</h4>
            <ul className="feature-list">
              <li className={supportsCrossDevice(currentMode) ? 'enabled' : 'disabled'}>
                <span className="status">
                  {supportsCrossDevice(currentMode) ? '✓' : '✗'}
                </span>
                Cross-device access
              </li>
              <li className={config.encryption ? 'enabled' : 'disabled'}>
                <span className="status">{config.encryption ? '✓' : '✗'}</span>
                End-to-end encryption
              </li>
              <li className={requiresAuthentication(currentMode) ? 'enabled' : 'disabled'}>
                <span className="status">
                  {requiresAuthentication(currentMode) ? '✓' : '✗'}
                </span>
                Requires sign-in
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="detail-section">
            <h4>Data Retention</h4>
            <p className="retention-policy">
              {getRetentionPolicy(currentMode) === 'indefinite'
                ? 'Your data is stored indefinitely until you delete it.'
                : getRetentionPolicy(currentMode) === 'session'
                  ? 'Your data is deleted when your session ends.'
                  : 'Your data is never stored. All analysis is in-memory only.'}
            </p>
          </section>

          {/* Mode Selector */}
          {onModeChange && (
            <section className="detail-section">
              <h4>Change Privacy Mode</h4>
              <div className="mode-selector">
                {(['guest_local', 'signed_in_cloud', 'enterprise_zdr'] as const).map(
                  mode => {
                    const isDisabled =
                      mode === 'signed_in_cloud' && !isAuthenticated;

                    return (
                      <button
                        key={mode}
                        className={`mode-option ${currentMode === mode ? 'active' : ''} ${
                          isDisabled ? 'disabled' : ''
                        }`}
                        onClick={() => !isDisabled && onModeChange(mode)}
                        disabled={isDisabled}
                        title={
                          isDisabled
                            ? 'Sign in to use cloud sync'
                            : `Switch to ${mode.replace(/_/g, ' ')}`
                        }
                      >
                        <span className="icon">{modeIcons[mode]}</span>
                        <span className="label">{mode.replace(/_/g, ' ')}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {/* Legal */}
          <section className="detail-section legal">
            <p className="legal-text">
              By using Atlas, you agree to our{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              . Your privacy is our priority.
            </p>
          </section>
        </div>
      )}

      <style jsx>{`
        .privacy-disclosure {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          background: #fafafa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .privacy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .privacy-mode-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .privacy-mode-badge .icon {
          font-size: 24px;
        }

        .mode-info {
          flex: 1;
        }

        .mode-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .mode-description {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #666;
        }

        .expand-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          color: #666;
          transition: color 0.2s;
        }

        .expand-button:hover {
          color: #333;
        }

        .privacy-details {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .detail-section {
          margin-bottom: 16px;
        }

        .detail-section:last-child {
          margin-bottom: 0;
        }

        .detail-section h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .feature-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 12px;
          color: #666;
        }

        .feature-list li.enabled {
          color: #2d7a3d;
        }

        .feature-list li.disabled {
          color: #999;
          text-decoration: line-through;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          font-weight: bold;
          font-size: 11px;
        }

        .feature-list li.enabled .status {
          color: #2d7a3d;
        }

        .feature-list li.disabled .status {
          color: #ccc;
        }

        .retention-policy {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }

        .mode-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .mode-option:hover:not(.disabled) {
          border-color: #0066cc;
          background: #f0f7ff;
        }

        .mode-option.active {
          border-color: #0066cc;
          background: #e6f2ff;
          color: #0066cc;
        }

        .mode-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mode-option .icon {
          font-size: 20px;
        }

        .legal {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          margin-top: 16px;
        }

        .legal-text {
          margin: 0;
          font-size: 11px;
          color: #666;
          line-height: 1.5;
        }

        .legal-text a {
          color: #0066cc;
          text-decoration: none;
        }

        .legal-text a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

/**
 * Privacy Mode Selector Component (Standalone)
 *
 * Minimal component for just selecting privacy mode
 */
export function PrivacyModeSelector({
  currentMode,
  onModeChange,
  isAuthenticated = false,
}: Omit<PrivacyDisclosureProps, 'showDetails'>) {
  const modeIcons: Record<PrivacyMode, string> = {
    guest_local: '🔒',
    signed_in_cloud: '☁️',
    enterprise_zdr: '🚫',
  };

  return (
    <div className="privacy-mode-selector">
      {(['guest_local', 'signed_in_cloud', 'enterprise_zdr'] as const).map(mode => {
        const isDisabled = mode === 'signed_in_cloud' && !isAuthenticated;

        return (
          <button
            key={mode}
            className={`mode-button ${currentMode === mode ? 'active' : ''} ${
              isDisabled ? 'disabled' : ''
            }`}
            onClick={() => !isDisabled && onModeChange?.(mode)}
            disabled={isDisabled}
            title={
              isDisabled
                ? 'Sign in to use cloud sync'
                : `Switch to ${mode.replace(/_/g, ' ')}`
            }
          >
            <span className="icon">{modeIcons[mode]}</span>
            <span className="label">{mode.replace(/_/g, ' ')}</span>
          </button>
        );
      })}

      <style jsx>{`
        .privacy-mode-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .mode-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .mode-button:hover:not(.disabled) {
          border-color: #0066cc;
          background: #f0f7ff;
        }

        .mode-button.active {
          border-color: #0066cc;
          background: #0066cc;
          color: white;
        }

        .mode-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mode-button .icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

/**
 * Privacy Status Badge Component
 *
 * Minimal badge showing current privacy mode
 */
export function PrivacyStatusBadge({ mode }: { mode: PrivacyMode }) {
  const modeIcons: Record<PrivacyMode, string> = {
    guest_local: '🔒',
    signed_in_cloud: '☁️',
    enterprise_zdr: '🚫',
  };

  const modeColors: Record<PrivacyMode, string> = {
    guest_local: '#2d7a3d',
    signed_in_cloud: '#0066cc',
    enterprise_zdr: '#d32f2f',
  };

  return (
    <div className="privacy-badge" style={{ borderColor: modeColors[mode] }}>
      <span className="icon">{modeIcons[mode]}</span>
      <span className="label">{mode.replace(/_/g, ' ')}</span>

      <style jsx>{`
        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border: 1px solid;
          border-radius: 4px;
          background: #f5f5f5;
          font-size: 11px;
          font-weight: 500;
        }

        .privacy-badge .icon {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
