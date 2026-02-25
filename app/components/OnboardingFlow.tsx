'use client';

import React, { useState } from 'react';
import { FinancialProfileDb } from '@/lib/db/financialProfileDb';

interface OnboardingStep {
  step: number;
  question: string;
  type: 'text' | 'number' | 'select' | 'range';
  field: string;
  options?: string[];
  placeholder?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    question: "What's your name?",
    type: 'text',
    field: 'name',
    placeholder: 'Enter your name',
  },
  {
    step: 2,
    question: 'What stage of life are you in?',
    type: 'select',
    field: 'lifeStage',
    options: ['Student', 'Early Career', 'Mid Career', 'Established', 'Pre-Retirement', 'Retired'],
  },
  {
    step: 3,
    question: 'What is your monthly take-home income?',
    type: 'number',
    field: 'monthlyIncome',
    placeholder: '$0',
  },
  {
    step: 4,
    question: 'What is your biggest financial concern right now?',
    type: 'select',
    field: 'primaryConcern',
    options: ['Debt', 'Savings', 'Budgeting', 'Investing', 'Emergency Fund', 'Other'],
  },
];

interface OnboardingFlowProps {
  userId?: string;
  onComplete: (profile: any) => void | Promise<void>;
}

export function OnboardingFlow({ userId, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const step = ONBOARDING_STEPS[currentStep];

  const handleInputChange = (value: any) => {
    setProfileData((prev) => ({
      ...prev,
      [step.field]: value,
    }));
  };

  const handleNext = async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save profile
      await saveProfile();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: profileData.name,
          lifeStage: profileData.lifeStage?.toLowerCase().replace(' ', '_') || 'early_career',
          monthlyIncome: parseInt(profileData.monthlyIncome) || 0,
          monthlyExpenses: 0,
          debtAccounts: [],
          savingsBalance: 0,
          monthlySavings: 0,
          financialGoals: [],
          knowledgeLevel: 'novice',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const profile = await response.json();
      onComplete(profile);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isAnswered = profileData[step.field] !== undefined && profileData[step.field] !== '';
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{step.question}</h3>

          {/* Input Field */}
          {step.type === 'text' && (
            <input
              type="text"
              placeholder={step.placeholder}
              value={profileData[step.field] || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
              autoFocus
            />
          )}

          {step.type === 'number' && (
            <input
              type="number"
              placeholder={step.placeholder}
              value={profileData[step.field] || ''}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
              autoFocus
            />
          )}

          {step.type === 'select' && step.options && (
            <div className="space-y-2">
              {step.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleInputChange(option)}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left font-medium ${
                    profileData[step.field] === option
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-teal-300 dark:hover:border-teal-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!isAnswered || isLoading}
            className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Saving...' : currentStep === ONBOARDING_STEPS.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>

        {/* Skip Option */}
        <button
          onClick={() => onComplete(null)}
          className="w-full mt-4 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
