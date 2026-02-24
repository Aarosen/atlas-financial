/**
 * CRISIS DETECTION ENGINE
 * 
 * Detects financial crises and shifts to triage mode immediately.
 * This is CRITICAL - Atlas must recognize emergencies and respond with resources, not education.
 */

import type { FinancialState } from '@/lib/state/types';

export type CrisisLevel = 'none' | 'warning' | 'urgent' | 'critical';

export interface CrisisSignal {
  level: CrisisLevel;
  type: string;
  description: string;
  immediateActions: string[];
  resources: CrisisResource[];
  escalateToHuman: boolean;
  toneShift: 'normal' | 'urgent' | 'crisis';
}

export interface CrisisResource {
  name: string;
  description: string;
  url?: string;
  phone?: string;
  availability: string;
}

/**
 * Detect crisis signals in user message
 */
export function detectCrisisSignals(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  financialState: FinancialState
): CrisisSignal | null {
  const messageLower = userMessage.toLowerCase();

  // CRITICAL: Housing crisis
  if (/can't pay rent|evicted|eviction|homeless|living on street|no place to live/i.test(messageLower)) {
    return {
      level: 'critical',
      type: 'housing_crisis',
      description: 'Immediate housing crisis - risk of homelessness',
      immediateActions: [
        'Contact local housing authority immediately',
        'Apply for emergency rental assistance',
        'Reach out to family/friends for temporary housing',
        'Contact 211 for local resources',
      ],
      resources: [
        {
          name: '211 (Dial 2-1-1)',
          description: 'Connect to local emergency housing assistance',
          phone: '2-1-1',
          availability: '24/7',
        },
        {
          name: 'National Housing Law Project',
          description: 'Emergency housing resources and legal aid',
          url: 'https://www.nhlp.org',
          availability: 'Business hours',
        },
        {
          name: 'Emergency Rental Assistance',
          description: 'Federal and state rental assistance programs',
          url: 'https://www.consumerfinance.gov/rental-assistance',
          availability: '24/7',
        },
      ],
      escalateToHuman: true,
      toneShift: 'crisis',
    };
  }

  // CRITICAL: Food insecurity
  if (/can't afford food|hungry|no food|starving|food bank|food assistance/i.test(messageLower)) {
    return {
      level: 'critical',
      type: 'food_insecurity',
      description: 'Immediate food insecurity - risk of hunger',
      immediateActions: [
        'Contact local food bank immediately',
        'Apply for SNAP benefits (food stamps)',
        'Call 211 for emergency food assistance',
        'Visit local community center for meal programs',
      ],
      resources: [
        {
          name: 'Feeding America',
          description: 'Find local food banks and meal programs',
          url: 'https://www.feedingamerica.org/find-your-local-foodbank',
          availability: '24/7',
        },
        {
          name: 'SNAP Benefits (Food Stamps)',
          description: 'Apply for emergency food assistance',
          url: 'https://www.fns.usda.gov/snap',
          availability: '24/7',
        },
        {
          name: '211 (Dial 2-1-1)',
          description: 'Connect to local emergency food resources',
          phone: '2-1-1',
          availability: '24/7',
        },
      ],
      escalateToHuman: true,
      toneShift: 'crisis',
    };
  }

  // CRITICAL: Utility crisis
  if (/can't pay utilities|electricity shut off|water shut off|heat|no power|no water/i.test(messageLower)) {
    return {
      level: 'critical',
      type: 'utility_crisis',
      description: 'Immediate utility crisis - risk of disconnection',
      immediateActions: [
        'Contact utility company immediately - request payment plan',
        'Apply for LIHEAP (Low Income Home Energy Assistance Program)',
        'Contact 211 for emergency utility assistance',
        'Reach out to local nonprofits for emergency funds',
      ],
      resources: [
        {
          name: 'LIHEAP (Home Energy Assistance)',
          description: 'Emergency utility assistance program',
          url: 'https://www.acf.hhs.gov/ocs/liheap',
          availability: 'Seasonal',
        },
        {
          name: '211 (Dial 2-1-1)',
          description: 'Connect to local emergency utility assistance',
          phone: '2-1-1',
          availability: '24/7',
        },
        {
          name: 'Catholic Charities',
          description: 'Emergency utility and financial assistance',
          url: 'https://www.catholiccharitiesusa.org',
          availability: 'Business hours',
        },
      ],
      escalateToHuman: true,
      toneShift: 'crisis',
    };
  }

  // CRITICAL: Financial abuse
  if (
    /ex took all|spouse took|partner took|financial abuse|controlling money|can't access|stolen|theft/i.test(
      messageLower
    )
  ) {
    return {
      level: 'critical',
      type: 'financial_abuse',
      description: 'Potential financial abuse situation',
      immediateActions: [
        'Contact National Domestic Violence Hotline',
        'Speak with a counselor about safety planning',
        'Document all financial transactions',
        'Consider opening separate bank account',
      ],
      resources: [
        {
          name: 'National Domestic Violence Hotline',
          description: 'Confidential support for domestic violence',
          phone: '1-800-799-7233',
          availability: '24/7',
        },
        {
          name: 'National Domestic Violence Hotline Chat',
          description: 'Text START to 88788',
          url: 'https://www.thehotline.org',
          availability: '24/7',
        },
        {
          name: 'Financial Abuse Specialist',
          description: 'Specialized counseling for financial abuse',
          url: 'https://www.futureswithoutviolence.org',
          availability: 'Business hours',
        },
      ],
      escalateToHuman: true,
      toneShift: 'crisis',
    };
  }

  // URGENT: Acute cash shortage
  if (/\$\d+ until|days until paycheck|no money|broke|can't pay|overdue|debt collector/i.test(messageLower)) {
    const daysMatch = messageLower.match(/(\d+)\s*days?/);
    const daysUntilPaycheck = daysMatch ? parseInt(daysMatch[1]) : 30;

    if (daysUntilPaycheck <= 14) {
      return {
        level: 'urgent',
        type: 'acute_cash_shortage',
        description: `Acute cash shortage - only ${daysUntilPaycheck} days until next income`,
        immediateActions: [
          'Prioritize essential expenses only (housing, food, utilities)',
          'Contact creditors to request payment extensions',
          'Look for immediate gig work (DoorDash, TaskRabbit, etc.)',
          'Apply for emergency assistance programs',
        ],
        resources: [
          {
            name: '211 (Dial 2-1-1)',
            description: 'Emergency financial assistance programs',
            phone: '2-1-1',
            availability: '24/7',
          },
          {
            name: 'Gig Work Apps',
            description: 'Immediate income (DoorDash, Instacart, TaskRabbit)',
            url: 'https://www.doordash.com',
            availability: '24/7',
          },
          {
            name: 'Local Community Action Agency',
            description: 'Emergency financial assistance',
            url: 'https://www.communityactionpartnership.org',
            availability: 'Business hours',
          },
        ],
        escalateToHuman: true,
        toneShift: 'urgent',
      };
    }
  }

  // URGENT: Job loss / income disruption
  if (/lost job|laid off|fired|unemployed|no income|income stopped|business closed/i.test(messageLower)) {
    return {
      level: 'urgent',
      type: 'income_disruption',
      description: 'Sudden loss of income',
      immediateActions: [
        'Apply for unemployment benefits immediately',
        'Review emergency fund and create survival budget',
        'Contact creditors about hardship programs',
        'Start job search and gig work immediately',
      ],
      resources: [
        {
          name: 'Unemployment Benefits',
          description: 'Apply for state unemployment insurance',
          url: 'https://www.unemployment.gov',
          availability: '24/7',
        },
        {
          name: 'Job Search Resources',
          description: 'LinkedIn, Indeed, local workforce centers',
          url: 'https://www.linkedin.com',
          availability: '24/7',
        },
        {
          name: 'SNAP Benefits',
          description: 'Emergency food assistance during job transition',
          url: 'https://www.fns.usda.gov/snap',
          availability: '24/7',
        },
      ],
      escalateToHuman: true,
      toneShift: 'urgent',
    };
  }

  // URGENT: Medical emergency / health crisis
  if (/medical emergency|hospital|surgery|health crisis|medical debt|medical bills/i.test(messageLower)) {
    return {
      level: 'urgent',
      type: 'medical_crisis',
      description: 'Medical emergency with financial impact',
      immediateActions: [
        'Contact hospital billing department about payment plans',
        'Apply for hospital financial assistance programs',
        'Check if you qualify for Medicaid',
        'Contact nonprofit medical debt relief organizations',
      ],
      resources: [
        {
          name: 'Patient Advocate Foundation',
          description: 'Help with medical debt and financial hardship',
          phone: '1-800-532-5274',
          availability: 'Business hours',
        },
        {
          name: 'Medicaid',
          description: 'Health insurance for low-income individuals',
          url: 'https://www.medicaid.gov',
          availability: '24/7',
        },
        {
          name: 'Hospital Financial Assistance',
          description: 'Most hospitals offer charity care programs',
          url: 'https://www.patientadvocatefoundation.org',
          availability: 'Business hours',
        },
      ],
      escalateToHuman: true,
      toneShift: 'urgent',
    };
  }

  // URGENT: Escalation detection
  const previousMessages = conversationHistory.map(m => m.content).join(' ').toLowerCase();
  const stressIndicators = (previousMessages.match(/stress|worried|anxious|scared|desperate/gi) || []).length;
  const escalationKeywords = /don't know how|won't survive|can't handle|falling apart|breaking down/i;

  if (stressIndicators >= 3 && escalationKeywords.test(messageLower)) {
    return {
      level: 'urgent',
      type: 'emotional_escalation',
      description: 'User showing signs of emotional crisis alongside financial stress',
      immediateActions: [
        'Take a moment to breathe - you are not alone',
        'Contact a mental health professional or crisis line',
        'Reach out to trusted friend or family member',
        'Focus on immediate needs first, long-term planning later',
      ],
      resources: [
        {
          name: '988 Suicide & Crisis Lifeline',
          description: 'Free, confidential mental health support',
          phone: '988',
          availability: '24/7',
        },
        {
          name: 'Crisis Text Line',
          description: 'Text HOME to 741741',
          url: 'https://www.crisistextline.org',
          availability: '24/7',
        },
        {
          name: 'NAMI Helpline',
          description: 'Mental health support and resources',
          phone: '1-800-950-NAMI',
          availability: 'Business hours',
        },
      ],
      escalateToHuman: true,
      toneShift: 'crisis',
    };
  }

  // WARNING: High debt-to-income ratio
  if (financialState.monthlyIncome && financialState.highInterestDebt) {
    const debtToIncomeRatio = financialState.highInterestDebt / (financialState.monthlyIncome * 12);
    if (debtToIncomeRatio > 1.5) {
      return {
        level: 'warning',
        type: 'high_debt_ratio',
        description: 'Debt-to-income ratio is dangerously high (>150%)',
        immediateActions: [
          'Stop accumulating new debt immediately',
          'Contact creditors about hardship programs',
          'Consider debt consolidation or settlement',
          'Consult with credit counselor',
        ],
        resources: [
          {
            name: 'National Foundation for Credit Counseling',
            description: 'Free credit counseling and debt management',
            phone: '1-800-388-2227',
            availability: 'Business hours',
          },
          {
            name: 'Debt.org',
            description: 'Debt relief and consolidation resources',
            url: 'https://www.debt.org',
            availability: '24/7',
          },
        ],
        escalateToHuman: false,
        toneShift: 'urgent',
      };
    }
  }

  return null;
}

/**
 * Generate crisis response
 */
export function generateCrisisResponse(signal: CrisisSignal): string {
  let response = '';

  if (signal.level === 'critical') {
    response += `🚨 **IMMEDIATE ACTION REQUIRED**\n\n`;
    response += `I'm detecting a critical financial emergency: ${signal.description}\n\n`;
  } else if (signal.level === 'urgent') {
    response += `⚠️ **URGENT SITUATION**\n\n`;
    response += `I'm detecting an urgent situation: ${signal.description}\n\n`;
  } else {
    response += `⚠️ **WARNING**\n\n`;
    response += `I'm noticing: ${signal.description}\n\n`;
  }

  response += `**Immediate Actions:**\n`;
  for (const action of signal.immediateActions) {
    response += `- ${action}\n`;
  }

  response += `\n**Resources Available Right Now:**\n`;
  for (const resource of signal.resources) {
    response += `\n**${resource.name}**\n`;
    response += `${resource.description}\n`;
    if (resource.phone) response += `📞 ${resource.phone}\n`;
    if (resource.url) response += `🌐 ${resource.url}\n`;
    response += `⏰ ${resource.availability}\n`;
  }

  if (signal.escalateToHuman) {
    response += `\n**I'm connecting you with a human advisor who specializes in crisis situations.**\n`;
    response += `They will be able to provide personalized guidance and support.\n`;
  }

  return response;
}

/**
 * Check if message indicates escalation from previous state
 */
export function detectEscalation(
  currentMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  if (conversationHistory.length < 4) return false;

  const recentMessages = conversationHistory.slice(-4).map(m => m.content.toLowerCase());
  const allText = recentMessages.join(' ');

  // Check for escalation patterns
  const hasInitialStress = /i'm stressed|i'm worried|i'm anxious|a little stressed|a bit worried/i.test(allText);
  const hasEscalation = /i don't know how|i won't survive|i can't handle|falling apart|breaking down|desperate/i.test(
    allText
  );
  const hasContradiction = /i'm fine|everything's okay/.test(allText) && /actually|wait|no|i lied|i was wrong/i.test(allText);

  return (hasInitialStress && hasEscalation) || hasContradiction;
}
