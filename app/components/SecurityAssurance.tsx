/**
 * Security Assurance Component
 * Displays visible security and privacy reassurance cues throughout the app
 * Addresses design recommendation: "Add security reassurances"
 */

import React from 'react';
import { Lock, Shield, Eye, Database } from 'lucide-react';

export function SecurityAssuranceHeader() {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-6 px-4 rounded-lg mb-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Your Privacy is Protected
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 text-green-400" />
            <div>
              <h3 className="font-semibold">End-to-End Encrypted</h3>
              <p className="text-sm text-slate-300">All data encrypted in transit and at rest</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Eye className="w-5 h-5 flex-shrink-0 text-green-400" />
            <div>
              <h3 className="font-semibold">No Bank Connections</h3>
              <p className="text-sm text-slate-300">You control what you share—no mandatory linking</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Database className="w-5 h-5 flex-shrink-0 text-green-400" />
            <div>
              <h3 className="font-semibold">Never Sold</h3>
              <p className="text-sm text-slate-300">Your data is never sold to third parties</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SecurityBadges() {
  return (
    <div className="flex flex-wrap gap-3 justify-center py-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-800">
        <Lock className="w-4 h-4" />
        <span>SSL/TLS Encrypted</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
        <Shield className="w-4 h-4" />
        <span>GDPR Compliant</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-800">
        <Eye className="w-4 h-4" />
        <span>Privacy First</span>
      </div>
    </div>
  );
}

export function PrivacyPolicyLink() {
  return (
    <div className="text-center text-sm text-slate-600 py-4">
      <p>
        We take your privacy seriously.{' '}
        <a href="/privacy" className="text-blue-600 hover:underline font-semibold">
          Read our Privacy Policy
        </a>
      </p>
    </div>
  );
}

export function BiometricLoginHint() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900">Secure Login Available</h3>
          <p className="text-sm text-blue-800 mt-1">
            Use biometric authentication (Face ID, Touch ID) for faster, more secure access to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
