import { FinancialProfile, UserBehaviorProfile, FinancialSnapshot } from '@/lib/db/supabaseRepository';
import { detectStagnation } from '@/lib/calculations/progressCalculations';

export type EscalationType = 'financial_complexity' | 'emotional_crisis' | 'stagnation_pattern' | null;
export type ResourceType = 'cfp' | 'cpa' | 'financial_therapist' | 'crisis_resources' | 'advisor_network' | null;

export interface EscalationSignal {
  shouldEscalate: boolean;
  escalationType: EscalationType;
  escalationMessage: string | null;
  resourceType: ResourceType;
}

/**
 * Evaluate whether a user message requires escalation
 * Checks three dimensions: financial complexity, emotional crisis, and stagnation pattern
 */
export function evaluateEscalation(
  userMessage: string,
  financialProfile: FinancialProfile | null,
  behaviorProfile: UserBehaviorProfile | null,
  snapshots: FinancialSnapshot[]
): EscalationSignal {
  // Check for financial complexity escalation
  const complexityEscalation = checkFinancialComplexity(userMessage);
  if (complexityEscalation.shouldEscalate) {
    return complexityEscalation;
  }

  // Check for emotional crisis escalation
  const crisisEscalation = checkEmotionalCrisis(userMessage, behaviorProfile);
  if (crisisEscalation.shouldEscalate) {
    return crisisEscalation;
  }

  // Check for stagnation pattern escalation
  const stagnationEscalation = checkStagnationPattern(
    behaviorProfile,
    snapshots
  );
  if (stagnationEscalation.shouldEscalate) {
    return stagnationEscalation;
  }

  return {
    shouldEscalate: false,
    escalationType: null,
    escalationMessage: null,
    resourceType: null,
  };
}

/**
 * Check for financial complexity that exceeds Atlas's scope
 */
function checkFinancialComplexity(userMessage: string): EscalationSignal {
  const lowerMessage = userMessage.toLowerCase();

  // Tax optimization questions
  if (
    /roth conversion|backdoor roth|tax.?loss harvest|amt|alternative minimum tax|tax optimization/i.test(
      lowerMessage
    )
  ) {
    return {
      shouldEscalate: true,
      escalationType: 'financial_complexity',
      escalationMessage:
        "That's a question I want to handle carefully — it's in the territory where the specifics matter enormously and getting them wrong has real consequences. A CPA who can look at your full picture is the right person for this. What I can do is help you prepare for that conversation — what to bring, what to ask, and what to watch out for.",
      resourceType: 'cpa',
    };
  }

  // Estate planning questions
  if (/will|trust|beneficiary|inheritance|estate planning|probate/i.test(lowerMessage)) {
    return {
      shouldEscalate: true,
      escalationType: 'financial_complexity',
      escalationMessage:
        "Estate planning is important and specific to your situation. A financial advisor or estate attorney who understands your full picture is the right resource. I can help you think through the financial implications, but the legal structure needs professional guidance.",
      resourceType: 'advisor_network',
    };
  }

  // Business finances
  if (
    /business tax|llc|s-corp|payroll|business credit|business structure|self.?employed tax/i.test(
      lowerMessage
    )
  ) {
    return {
      shouldEscalate: true,
      escalationType: 'financial_complexity',
      escalationMessage:
        "Business finances have specific tax and legal implications that depend on your exact structure. A CPA who works with business owners is the right person to guide this. I can help you think through the cash flow side, but the tax structure needs a specialist.",
      resourceType: 'cpa',
    };
  }

  // Specific investment product selection
  if (
    /should i buy|should i invest in|what about \[|which stock|which fund|which etf|specific investment/i.test(
      lowerMessage
    )
  ) {
    return {
      shouldEscalate: true,
      escalationType: 'financial_complexity',
      escalationMessage:
        "Specific investment selection depends on your full situation, risk tolerance, and time horizon. A CFP can provide personalized recommendations. What I can do is help you understand the framework — how to think about asset allocation, diversification, and risk — so you can have a smarter conversation with an advisor.",
      resourceType: 'cfp',
    };
  }

  // Complex insurance questions
  if (
    /life insurance|disability insurance|long.?term care|annuity|insurance structure/i.test(
      lowerMessage
    )
  ) {
    return {
      shouldEscalate: true,
      escalationType: 'financial_complexity',
      escalationMessage:
        "Insurance structuring is complex and specific to your situation. A CFP or insurance specialist can help you think through coverage needs and options. I can help you understand what you need, but the specific product selection needs professional guidance.",
      resourceType: 'cfp',
    };
  }

  return {
    shouldEscalate: false,
    escalationType: null,
    escalationMessage: null,
    resourceType: null,
  };
}

/**
 * Check for emotional crisis that exceeds financial guidance
 */
function checkEmotionalCrisis(
  userMessage: string,
  behaviorProfile: UserBehaviorProfile | null
): EscalationSignal {
  const lowerMessage = userMessage.toLowerCase();

  // Indicators of emotional distress
  const emotionalIndicators = [
    /suicidal|self.?harm|hurting myself|can't take it|want to die|ending it|hopeless|worthless/i,
    /severe depression|severe anxiety|panic|breakdown|falling apart|can't function/i,
    /domestic violence|abuse|unsafe|danger/i,
    /substance abuse|addiction|drinking problem|drug problem/i,
  ];

  for (const indicator of emotionalIndicators) {
    if (indicator.test(lowerMessage)) {
      return {
        shouldEscalate: true,
        escalationType: 'emotional_crisis',
        escalationMessage:
          "I'm hearing something that goes beyond financial guidance. What you're describing sounds like it needs real support — whether that's a therapist, counselor, or crisis line. The financial part we can work on, but your wellbeing comes first. Please reach out to someone: National Suicide Prevention Lifeline (988), Crisis Text Line (text HOME to 741741), or a local mental health professional.",
        resourceType: 'crisis_resources',
      };
    }
  }

  // Check for repeated crisis with no progress (emotional crisis pattern)
  if (
    behaviorProfile &&
    behaviorProfile.follow_through_rate < 0.25 &&
    behaviorProfile.total_commitments >= 3
  ) {
    if (
      /stressed|anxious|overwhelmed|can't handle|impossible|stuck|trapped/i.test(
        lowerMessage
      )
    ) {
      return {
        shouldEscalate: true,
        escalationType: 'emotional_crisis',
        escalationMessage:
          "The financial part I can help with. But if the stress is becoming something heavier — affecting sleep, relationships, how you feel about yourself — that's real and it deserves real support. A financial therapist specifically works with this intersection. That's not a failure; that's knowing what help fits.",
        resourceType: 'financial_therapist',
      };
    }
  }

  return {
    shouldEscalate: false,
    escalationType: null,
    escalationMessage: null,
    resourceType: null,
  };
}

/**
 * Check for stagnation pattern that suggests deeper issues
 */
function checkStagnationPattern(
  behaviorProfile: UserBehaviorProfile | null,
  snapshots: FinancialSnapshot[]
): EscalationSignal {
  if (!behaviorProfile || behaviorProfile.total_commitments < 3) {
    return {
      shouldEscalate: false,
      escalationType: null,
      escalationMessage: null,
      resourceType: null,
    };
  }

  // Check for very low follow-through rate over time
  if (
    behaviorProfile.follow_through_rate < 0.25 &&
    behaviorProfile.total_commitments >= 5
  ) {
    const stagnation = detectStagnation(snapshots);

    if (stagnation.stagnated && stagnation.daysSinceLastChange > 90) {
      return {
        shouldEscalate: true,
        escalationType: 'stagnation_pattern',
        escalationMessage:
          "We've been at this for a while and I want to be honest with you. The pattern I'm seeing suggests something is making it hard to move forward, and it might not be the financial strategy itself. Sometimes talking to someone — whether a financial coach or a therapist — helps unlock what's actually in the way. That's not a criticism; it's recognizing that some obstacles need different kinds of help.",
        resourceType: 'financial_therapist',
      };
    }
  }

  return {
    shouldEscalate: false,
    escalationType: null,
    escalationMessage: null,
    resourceType: null,
  };
}

/**
 * Build escalation context block for system prompt
 */
export function buildEscalationBlock(signal: EscalationSignal): string | null {
  if (!signal.shouldEscalate) {
    return null;
  }

  let block = '━━━ ESCALATION SIGNAL ━━━\n';
  block += `Type: ${signal.escalationType}\n`;
  block += `RULE: Do not attempt to answer this in full. Acknowledge the topic, name why you want to\n`;
  block += `hand it off, and offer to help the user PREPARE for the conversation with a specialist.\n`;
  block += `\nEscalation message:\n"${signal.escalationMessage}"\n`;
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}
