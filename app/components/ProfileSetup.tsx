'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Buttons';
import { OnboardingFlow } from './OnboardingFlow';
import type { FinancialProfile } from '@/lib/types/financial';

export function ProfileSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleProfileComplete = async (profile: Partial<FinancialProfile>) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem('atlas_user') || '{}');
      
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Update user profile completion status
      user.profileComplete = true;
      localStorage.setItem('atlas_user', JSON.stringify(user));

      router.push('/conversation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Let's understand your financial situation
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            This helps Atlas give you personalized guidance. You can update this anytime.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8">
          <OnboardingFlow onComplete={handleProfileComplete} />
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="mt-6 text-center text-slate-600 dark:text-slate-400">
              Saving your profile...
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>Your financial information is encrypted and never shared.</p>
          <p className="mt-2">
            <a href="/privacy" className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
              Learn about our privacy practices
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
