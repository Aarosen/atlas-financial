/**
 * Initial Greeting Engine
 * Generates warm, mentor-like, adaptive opening messages that represent
 * Atlas as a financial guide and trusted advisor—not a form or chatbot.
 * 
 * Requirements: D3 (Teaching Excellence), D4 (Personalization), D6 (Tone & Empathy)
 */

export interface GreetingContext {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  isReturningUser?: boolean;
  previousConcern?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  userAge?: number;
  lifeStage?: 'student' | 'early_career' | 'mid_career' | 'pre_retirement' | 'retired';
}

/**
 * Generate a warm, mentor-like opening that invites conversation
 * rather than demanding form completion
 */
export function generateInitialGreeting(context: GreetingContext = {}): string {
  const greetings = [
    "What's going on with your money right now?",
    
    "Let's talk about what's actually on your mind.",
    
    "Tell me what's real for you financially.",
    
    "What's the biggest thing you're thinking about with money?",
    
    "What brought you here? What do you want to figure out?",
  ];

  const timeBasedGreetings: Record<string, string[]> = {
    morning: [
      "What's on your mind this morning?",
      "Let's figure this out.",
    ],
    afternoon: [
      "What's going on?",
      "Tell me what's up.",
    ],
    evening: [
      "What's on your mind?",
      "Let's talk through it.",
    ],
    night: [
      "Late night money thoughts? I'm here.",
      "Can't sleep thinking about this? Let's work through it.",
    ],
  };

  const returningUserGreetings = [
    "Welcome back. I remember where we left off. What's on your mind now?",
    "Good to see you again. Let's pick up where we left off or explore something new.",
    "Back again — I like that. What should we focus on today?",
  ];

  const lifeStageGreetings: Record<string, string[]> = {
    student: [
      "What's on your mind with money right now?",
      "What do you want to figure out?",
    ],
    early_career: [
      "What's the biggest money thing on your mind?",
      "What brought you here today?",
    ],
    mid_career: [
      "What's going on with your finances?",
      "What do you want to get clarity on?",
    ],
    pre_retirement: [
      "What's the money question you want to tackle?",
      "What's on your mind about retirement?",
    ],
    retired: [
      "What's the money thing you want to work through?",
      "What's on your mind right now?",
    ],
  };

  // Select greeting based on context
  let selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  if (context.isReturningUser && returningUserGreetings.length > 0) {
    selectedGreeting = returningUserGreetings[Math.floor(Math.random() * returningUserGreetings.length)];
  } else if (context.timeOfDay && timeBasedGreetings[context.timeOfDay]) {
    const timeGreetings = timeBasedGreetings[context.timeOfDay];
    selectedGreeting = timeGreetings[Math.floor(Math.random() * timeGreetings.length)];
  } else if (context.lifeStage && lifeStageGreetings[context.lifeStage]) {
    const stageGreetings = lifeStageGreetings[context.lifeStage];
    selectedGreeting = stageGreetings[Math.floor(Math.random() * stageGreetings.length)];
  }

  return selectedGreeting;
}

/**
 * Generate the full opening message with context-aware framing
 * Feels like a real conversation, not a script
 */
export function generateFullOpeningMessage(context: GreetingContext = {}): string {
  const greeting = generateInitialGreeting(context);

  const openingQuestions = [
    "What's on your mind when it comes to money right now?",
    "What's the biggest money question or worry you have right now?",
    "What brought you here today? What's the money situation you want to figure out?",
    "Tell me what's real for you financially right now — what matters most?",
    "What's the one money thing you'd like to get clarity on?",
  ];

  const question = openingQuestions[Math.floor(Math.random() * openingQuestions.length)];

  return `${greeting}\n\n${question}`;
}

/**
 * Generate mentor-like follow-up messages that show understanding
 * and build trust without being prescriptive
 */
export function generateMentorFollowUp(userConcern: string): string {
  const followUps = [
    "That makes sense. Let me understand your situation better so I can give you advice that actually fits your life.",
    "I hear you. Let's dig into that and find the clearest path forward for you.",
    "That's a real concern. Let's break it down and figure out what actually matters here.",
    "I get it. Let's look at your specific situation and find what works for you.",
    "That's important. Let me understand your full picture so I can give you advice that actually helps.",
  ];

  return followUps[Math.floor(Math.random() * followUps.length)];
}

/**
 * Generate empathetic acknowledgments that show Atlas understands
 * the emotional weight of financial decisions
 */
export function generateEmpathyAcknowledgment(concern: string): string {
  const emotionalPatterns: Record<string, string[]> = {
    debt: [
      "Debt can feel overwhelming, but you're taking the right step by facing it head-on.",
      "Carrying debt is stressful. The good news is there's always a path forward.",
      "Debt weighs on you. Let's figure out the smartest way to tackle it.",
    ],
    savings: [
      "Building savings is one of the most powerful things you can do for yourself.",
      "Saving takes discipline, and you're smart to prioritize it.",
      "Savings are your safety net and your freedom. Let's build that for you.",
    ],
    investing: [
      "Investing can feel intimidating, but it's how wealth actually grows over time.",
      "Wanting to invest shows you're thinking long-term. That's the right mindset.",
      "Investing is powerful, and I'll help you understand it in a way that makes sense.",
    ],
    retirement: [
      "Thinking about retirement early is one of the smartest moves you can make.",
      "Retirement planning feels abstract, but it's actually about your freedom.",
      "Your retirement matters. Let's make sure you're on track.",
    ],
    income: [
      "Your income is the foundation of everything. Let's make sure it's working for you.",
      "Income changes can be stressful. Let's figure out how to adapt your plan.",
      "Building income is about creating options for yourself. That's powerful.",
    ],
  };

  // Match concern to emotional pattern
  for (const [key, messages] of Object.entries(emotionalPatterns)) {
    if (concern.toLowerCase().includes(key)) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }

  return "That's important to you, and I'm here to help you figure it out.";
}
