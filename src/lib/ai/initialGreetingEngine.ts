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
    // Warm, mentor-like openings
    "I'm here as your financial mentor — not a form, not a robo-advisor. Let's talk about what's actually on your mind.",
    
    "Think of me as a friend who knows money. I'm here to help you understand your situation and find the next clear step forward.",
    
    "You don't need to have it all figured out. Let's start with what's real for you right now — no judgment, no forms.",
    
    "I'm here to help you make smarter money decisions. But first, I want to understand your world — in your own words.",
    
    "Financial advice should feel like talking to someone who gets it. That's what I'm here for.",
  ];

  const timeBasedGreetings: Record<string, string[]> = {
    morning: [
      "Good morning. Let's start your day by getting clarity on your money situation.",
      "Morning. I'm here to help you think through your finances with a clear head.",
    ],
    afternoon: [
      "Afternoon. Let's dig into what's really going on with your money.",
      "Hey. I'm here to help you navigate your financial situation.",
    ],
    evening: [
      "Evening. This is a good time to think through your money situation clearly.",
      "Good evening. Let's talk about what matters most to you financially.",
    ],
    night: [
      "Late night money thoughts? I'm here to help you think them through.",
      "Can't sleep thinking about money? Let's work through it together.",
    ],
  };

  const returningUserGreetings = [
    "Welcome back. I remember where we left off. What's on your mind now?",
    "Good to see you again. Let's pick up where we left off or explore something new.",
    "Back again — I like that. What should we focus on today?",
  ];

  const lifeStageGreetings: Record<string, string[]> = {
    student: [
      "Building your financial foundation is smart. Let's start with what's real for you right now.",
      "Getting ahead early on money is powerful. I'm here to help you think it through.",
    ],
    early_career: [
      "Early in your career is the perfect time to build good money habits. Let's start with your situation.",
      "These early years matter for your long-term success. Let's understand where you are.",
    ],
    mid_career: [
      "You've built momentum. Now let's make sure your money is working as hard as you are.",
      "Mid-career is when strategy really pays off. Let's talk about your situation.",
    ],
    pre_retirement: [
      "These years are critical for your retirement readiness. Let's make sure you're on track.",
      "Getting close to retirement? Let's make sure you're positioned well.",
    ],
    retired: [
      "Retirement brings new money questions. I'm here to help you navigate them.",
      "In retirement, it's about making your money last and work for you. Let's talk.",
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
 */
export function generateFullOpeningMessage(context: GreetingContext = {}): string {
  const greeting = generateInitialGreeting(context);

  const contextualFraming = [
    "I'm not going to ask you to connect your bank or fill out a form. I just want to understand your situation — in your own words.",
    "No forms, no friction. Just a real conversation about your money and what matters to you.",
    "No data connections needed. Just tell me what's going on, and I'll help you think it through.",
    "I'm here to listen, understand, and help you find the next clear step. That's it.",
  ];

  const openingQuestions = [
    "What's on your mind when it comes to money right now?",
    "What's the biggest money question or worry you have right now?",
    "What brought you here today? What's the money situation you want to figure out?",
    "Tell me what's real for you financially right now — what matters most?",
    "What's the one money thing you'd like to get clarity on?",
  ];

  const framing = contextualFraming[Math.floor(Math.random() * contextualFraming.length)];
  const question = openingQuestions[Math.floor(Math.random() * openingQuestions.length)];

  return `${greeting}\n\n${framing}\n\n${question}`;
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
