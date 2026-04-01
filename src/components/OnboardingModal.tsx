'use client';

import { useState } from 'react';
import { getOnboardingContent, getNextOnboardingStep, markOnboardingComplete, type OnboardingStep } from '@/lib/onboarding/onboardingFlow';
import { Button } from './Buttons';

export function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  // Gate onboarding overlay during E2E testing
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E_TESTING === 'true') {
    return null;
  }

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');

  const content = getOnboardingContent(currentStep);
  const nextStep = getNextOnboardingStep(currentStep);

  const handleNext = () => {
    if (nextStep) {
      setCurrentStep(nextStep);
    } else {
      // Mark as completed and close
      markOnboardingComplete();
      onComplete();
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--padX)',
      }}
      onClick={handleSkip}
    >
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--padY)',
          maxWidth: 500,
          width: '100%',
          boxShadow: 'var(--sh2)',
          border: '1px solid var(--bdr)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>{content.icon}</div>

        {/* Title */}
        <h2 style={{ fontSize: 24, fontWeight: 950, margin: 0, marginBottom: 8, color: 'var(--ink)' }}>
          {content.title}
        </h2>

        {/* Subtitle */}
        <p style={{ fontSize: 14, color: 'var(--ink2)', margin: '0 0 16px 0', fontWeight: 600 }}>
          {content.subtitle}
        </p>

        {/* Content */}
        {currentStep === 'welcome' && 'description' in content && (
          <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 24 }}>
            {content.description}
          </p>
        )}

        {currentStep === 'how_it_works' && 'steps' in content && (
          <div style={{ marginBottom: 24, display: 'grid', gap: 16 }}>
            {content.steps.map((step: any) => (
              <div key={step.number} style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, var(--teal), var(--sky))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 950,
                    fontSize: 14,
                  }}
                >
                  {step.number}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5 }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 'ready' && 'description' in content && (
          <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 24 }}>
            {content.description}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            onClick={handleNext}
            variant="primary"
            style={{ flex: 1, minWidth: 120 }}
          >
            {nextStep ? 'Next' : (content as any).cta || 'Get started'}
          </Button>
          {currentStep !== 'ready' && (
            <Button
              onClick={handleSkip}
              variant="secondary"
              style={{ flex: 1, minWidth: 120 }}
            >
              Skip
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {(['welcome', 'how_it_works', 'ready'] as const).map((step) => (
            <div
              key={step}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: step === currentStep ? 'var(--teal)' : 'var(--bdr)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
