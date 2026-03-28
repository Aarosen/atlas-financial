/**
 * First-time user onboarding flow
 * 3-step modal explaining Atlas without forms or bank connections
 */

export type OnboardingStep = 'welcome' | 'how_it_works' | 'ready';

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('atlas_onboarded');
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('atlas_onboarded', 'true');
    localStorage.setItem('atlas_onboarded_at', new Date().toISOString());
  } catch {
    // ignore
  }
}

/**
 * Get onboarding content for each step
 */
export function getOnboardingContent(step: OnboardingStep) {
  const content = {
    welcome: {
      title: 'Meet Atlas',
      subtitle: 'Your financial thinking partner',
      description: 'Atlas helps you understand your money and make better financial decisions. No forms, no bank connections — just honest conversation.',
      icon: '💬',
    },
    how_it_works: {
      title: 'How it works',
      subtitle: 'Three simple steps',
      steps: [
        {
          number: 1,
          title: 'Tell Atlas about your situation',
          description: 'Share your income, expenses, goals, or any financial question.',
        },
        {
          number: 2,
          title: 'Get personalized insights',
          description: 'Atlas analyzes your situation and provides specific, actionable recommendations.',
        },
        {
          number: 3,
          title: 'Track your progress',
          description: 'Atlas remembers your commitments and checks in on your progress over time.',
        },
      ],
      icon: '🎯',
    },
    ready: {
      title: 'Ready to get started?',
      subtitle: 'Let\'s talk about your finances',
      description: 'Start by telling Atlas about your current financial situation. Be as specific as you can — the more details, the better the advice.',
      cta: 'Start chatting',
      icon: '🚀',
    },
  };

  return content[step];
}

/**
 * Get next step in onboarding flow
 */
export function getNextOnboardingStep(currentStep: OnboardingStep): OnboardingStep | null {
  const steps: OnboardingStep[] = ['welcome', 'how_it_works', 'ready'];
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return null;
  }
  
  return steps[currentIndex + 1];
}

/**
 * Initialize onboarding state
 */
export function initializeOnboardingState(): OnboardingState {
  const completed = hasCompletedOnboarding();
  
  return {
    completed,
    currentStep: completed ? 'ready' : 'welcome',
    startedAt: new Date().toISOString(),
  };
}
