/**
 * Initial Greeting Engine
 * Generates warm, mentor-like, adaptive opening messages that represent
 * Atlas as a financial guide and trusted advisor—not a form or chatbot.
 * 
 * Requirements: D3 (Teaching Excellence), D4 (Personalization), D6 (Tone & Empathy)
 */

import type { SupportedLanguage } from '@/lib/ai/slangMapper';

export interface GreetingContext {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  isReturningUser?: boolean;
  previousConcern?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  userAge?: number;
  lifeStage?: 'student' | 'early_career' | 'mid_career' | 'pre_retirement' | 'retired';
  language?: SupportedLanguage;
}

/**
 * Generate a warm, mentor-like opening that invites conversation
 * rather than demanding form completion
 */
export function generateInitialGreeting(context: GreetingContext = {}): string {
  const greetings: Record<SupportedLanguage, string[]> = {
    en: [
    "What's going on with your money right now?",

    "Let's talk about what's actually on your mind.",

    "Tell me what's real for you financially.",

    "What's the biggest thing you're thinking about with money?",

    "What brought you here? What do you want to figure out?",
    ],
    es: [
      '¿Qué está pasando con tu dinero ahora mismo?',
      'Hablemos de lo que realmente tienes en mente.',
      'Cuéntame qué es real para ti en lo financiero.',
      '¿Qué es lo más grande que estás pensando sobre dinero?',
      '¿Qué te trajo aquí? ¿Qué quieres resolver?',
    ],
    fr: [
      "Qu'est-ce qui se passe avec ton argent en ce moment ?",
      "Parlons de ce que tu as vraiment en tête.",
      "Dis-moi ce qui est réel pour toi financièrement.",
      "Quelle est la plus grande chose que tu penses à propos d'argent ?",
      "Qu'est-ce qui t'amène ici ? Qu'est-ce que tu veux comprendre ?",
    ],
    zh: [
      '你现在的财务情况怎么样？',
      '聊聊你心里真正担心的事吧。',
      '告诉我你现在真实的财务处境。',
      '关于钱，你最在意的一件事是什么？',
      '是什么让你来到这里？你想弄清什么？',
    ],
  };

  const timeBasedGreetings: Record<string, Record<SupportedLanguage, string[]>> = {
    morning: [
      { en: "What's on your mind this morning?", es: '¿Qué tienes en mente esta mañana?', fr: "Qu'est-ce qui te passe par la tête ce matin ?", zh: '你今天早上在想什么？' },
      { en: "Let's figure this out.", es: 'Vamos a resolverlo.', fr: 'On va trouver une solution.', zh: '我们一起理清。' },
    ].reduce<Record<SupportedLanguage, string[]>>((acc, item) => {
      (Object.keys(item) as SupportedLanguage[]).forEach((lang) => {
        acc[lang] = acc[lang] || [];
        acc[lang].push(item[lang] as string);
      });
      return acc;
    }, { en: [], es: [], fr: [], zh: [] }),
    afternoon: [
      { en: "What's going on?", es: '¿Qué está pasando?', fr: "Qu'est-ce qui se passe ?", zh: '最近怎么样？' },
      { en: "Tell me what's up.", es: 'Cuéntame qué pasa.', fr: "Dis-moi ce qui se passe.", zh: '跟我说说情况。' },
    ].reduce<Record<SupportedLanguage, string[]>>((acc, item) => {
      (Object.keys(item) as SupportedLanguage[]).forEach((lang) => {
        acc[lang] = acc[lang] || [];
        acc[lang].push(item[lang] as string);
      });
      return acc;
    }, { en: [], es: [], fr: [], zh: [] }),
    evening: [
      { en: "What's on your mind?", es: '¿Qué tienes en mente?', fr: "Qu'est-ce qui te préoccupe ?", zh: '你在想什么？' },
      { en: "Let's talk through it.", es: 'Hablemos de ello.', fr: "Parlons-en.", zh: '我们一起聊聊。' },
    ].reduce<Record<SupportedLanguage, string[]>>((acc, item) => {
      (Object.keys(item) as SupportedLanguage[]).forEach((lang) => {
        acc[lang] = acc[lang] || [];
        acc[lang].push(item[lang] as string);
      });
      return acc;
    }, { en: [], es: [], fr: [], zh: [] }),
    night: [
      { en: "Late night money thoughts? I'm here.", es: '¿Pensamientos de dinero tarde en la noche? Aquí estoy.', fr: "Pensées d'argent tard le soir ? Je suis là.", zh: '深夜为钱发愁？我在。' },
      { en: "Can't sleep thinking about this? Let's work through it.", es: '¿No puedes dormir por esto? Vamos a resolverlo.', fr: "Impossible de dormir à cause de ça ? On va y voir clair.", zh: '因为这事睡不着？我们一起理清。' },
    ].reduce<Record<SupportedLanguage, string[]>>((acc, item) => {
      (Object.keys(item) as SupportedLanguage[]).forEach((lang) => {
        acc[lang] = acc[lang] || [];
        acc[lang].push(item[lang] as string);
      });
      return acc;
    }, { en: [], es: [], fr: [], zh: [] }),
  };

  const returningUserGreetings: Record<SupportedLanguage, string[]> = {
    en: [
      "Welcome back. I remember where we left off. What's on your mind now?",
      "Good to see you again. Let's pick up where we left off or explore something new.",
      "Back again — I like that. What should we focus on today?",
    ],
    es: [
      'Bienvenido de nuevo. Recuerdo dónde nos quedamos. ¿Qué tienes en mente ahora?',
      'Me alegra verte otra vez. Retomemos donde lo dejamos o exploremos algo nuevo.',
      'De vuelta otra vez — me gusta. ¿En qué nos enfocamos hoy?',
    ],
    fr: [
      "Re-bienvenue. Je me souviens où on s'est arrêtés. Qu'est-ce qui te préoccupe maintenant ?",
      "Content de te revoir. On peut reprendre où on s'est arrêtés ou explorer autre chose.",
      "Te revoilà — j'aime ça. Sur quoi on se concentre aujourd'hui ?",
    ],
    zh: [
      '欢迎回来。我记得我们停在哪了。你现在在想什么？',
      '很高兴再见到你。我们可以接着上次继续，或者聊点新的。',
      '又见面了 — 真好。今天想先聊什么？',
    ],
  };

  const lifeStageGreetings: Record<string, Record<SupportedLanguage, string[]>> = {
    student: {
      en: ["What's on your mind with money right now?", 'What do you want to figure out?'],
      es: ['¿Qué tienes en mente sobre dinero ahora?', '¿Qué quieres resolver?'],
      fr: ["Qu'est-ce que tu as en tête côté argent ?", 'Qu’est-ce que tu veux éclaircir ?'],
      zh: ['你现在关于钱最在意什么？', '你想弄清什么？'],
    },
    early_career: {
      en: ["What's the biggest money thing on your mind?", 'What brought you here today?'],
      es: ['¿Qué es lo más grande que tienes en mente sobre dinero?', '¿Qué te trajo hoy?'],
      fr: ["Quelle est la plus grande question d'argent dans ta tête ?", "Qu'est-ce qui t'amène aujourd'hui ?"],
      zh: ['你现在关于钱最重要的一件事是什么？', '今天为什么来？'],
    },
    mid_career: {
      en: ["What's going on with your finances?", 'What do you want to get clarity on?'],
      es: ['¿Qué está pasando con tus finanzas?', '¿En qué quieres claridad?'],
      fr: ["Qu'est-ce qui se passe avec tes finances ?", 'Sur quoi veux-tu de la clarté ?'],
      zh: ['你的财务情况怎么样？', '你最想弄清哪部分？'],
    },
    pre_retirement: {
      en: ["What's the money question you want to tackle?", "What's on your mind about retirement?"],
      es: ['¿Qué pregunta de dinero quieres abordar?', '¿Qué tienes en mente sobre la jubilación?'],
      fr: ["Quelle question d'argent veux-tu aborder ?", 'Qu’est-ce qui te préoccupe sur la retraite ?'],
      zh: ['你最想解决的财务问题是什么？', '关于退休你在想什么？'],
    },
    retired: {
      en: ["What's the money thing you want to work through?", "What's on your mind right now?"],
      es: ['¿Qué tema de dinero quieres resolver?', '¿Qué tienes en mente ahora?'],
      fr: ["Quel sujet financier veux-tu éclaircir ?", "Qu'est-ce qui te passe par la tête ?"],
      zh: ['你想聊聊哪件财务事？', '你现在在想什么？'],
    },
  };

  // Select greeting based on context
  const lang = context.language || 'en';
  const baseGreetings = greetings[lang] || greetings.en;
  let selectedGreeting = baseGreetings[0];

  if (context.isReturningUser && returningUserGreetings[lang]?.length) {
    selectedGreeting = returningUserGreetings[lang][0];
  } else if (context.timeOfDay && timeBasedGreetings[context.timeOfDay]?.[lang]?.length) {
    const timeGreetings = timeBasedGreetings[context.timeOfDay][lang];
    selectedGreeting = timeGreetings[0];
  } else if (context.lifeStage && lifeStageGreetings[context.lifeStage]?.[lang]?.length) {
    const stageGreetings = lifeStageGreetings[context.lifeStage][lang];
    selectedGreeting = stageGreetings[0];
  }

  return selectedGreeting;
}

/**
 * Generate the full opening message with context-aware framing
 * Feels like a real conversation, not a script
 */
export function generateFullOpeningMessage(context: GreetingContext = {}): string {
  const greeting = generateInitialGreeting(context);

  const openingQuestions: Record<SupportedLanguage, string[]> = {
    en: [
      "What's on your mind when it comes to money right now?",
      "What's the biggest money question or worry you have right now?",
      "What brought you here today? What's the money situation you want to figure out?",
      "Tell me what's real for you financially right now — what matters most?",
      "What's the one money thing you'd like to get clarity on?",
    ],
    es: [
      '¿Qué tienes en mente cuando se trata de dinero ahora mismo?',
      '¿Cuál es la mayor pregunta o preocupación financiera que tienes ahora?',
      '¿Qué te trajo hoy? ¿Qué situación financiera quieres resolver?',
      'Cuéntame qué es real para ti financieramente ahora — ¿qué importa más?',
      '¿Cuál es la única cosa del dinero sobre la que quieres claridad?',
    ],
    fr: [
      "Qu'est-ce qui te préoccupe en matière d'argent en ce moment ?",
      "Quelle est ta plus grande question ou inquiétude financière aujourd'hui ?",
      "Qu'est-ce qui t'amène aujourd'hui ? Quelle situation financière veux-tu clarifier ?",
      "Dis-moi ce qui est réel pour toi financièrement maintenant — qu'est-ce qui compte le plus ?",
      "Quelle est la seule question d'argent sur laquelle tu veux de la clarté ?",
    ],
    zh: [
      '现在谈到钱，你最在意的是什么？',
      '你现在最大的财务问题或担忧是什么？',
      '是什么让你今天来到这里？你想解决哪种财务情况？',
      '告诉我你现在真实的财务处境 — 最重要的是什么？',
      '关于钱，你最想弄清的一件事是什么？',
    ],
  };

  const lang = context.language || 'en';
  const questions = openingQuestions[lang] || openingQuestions.en;
  const question = questions[0];

  return `${greeting}\n\n${question}`;
}

/**
 * Deterministic opening message for SSR/client hydration stability.
 */
function generateStableOpeningMessage(language: SupportedLanguage = 'en'): string {
  const greetings: Record<SupportedLanguage, string[]> = {
    en: [
      "What's going on with your money right now?",
      "Let's talk about what's actually on your mind.",
      "Tell me what's real for you financially.",
      "What's the biggest thing you're thinking about with money?",
      'What brought you here? What do you want to figure out?',
    ],
    es: [
      '¿Qué está pasando con tu dinero ahora mismo?',
      'Hablemos de lo que realmente tienes en mente.',
      'Cuéntame qué es real para ti en lo financiero.',
      '¿Qué es lo más grande que estás pensando sobre dinero?',
      '¿Qué te trajo aquí? ¿Qué quieres resolver?',
    ],
    fr: [
      "Qu'est-ce qui se passe avec ton argent en ce moment ?",
      'Parlons de ce que tu as vraiment en tête.',
      'Dis-moi ce qui est réel pour toi financièrement.',
      "Quelle est la plus grande chose que tu penses à propos d'argent ?",
      "Qu'est-ce qui t'amène ici ? Qu'est-ce que tu veux comprendre ?",
    ],
    zh: [
      '你现在的财务情况怎么样？',
      '聊聊你心里真正担心的事吧。',
      '告诉我你现在真实的财务处境。',
      '关于钱，你最在意的一件事是什么？',
      '是什么让你来到这里？你想弄清什么？',
    ],
  };

  const openingQuestions: Record<SupportedLanguage, string[]> = {
    en: [
      'What\'s on your mind when it comes to money right now?',
      'What\'s the biggest money question or worry you have right now?',
      "What brought you here today? What's the money situation you want to figure out?",
      "Tell me what's real for you financially right now — what matters most?",
      "What's the one money thing you'd like to get clarity on?",
    ],
    es: [
      '¿Qué tienes en mente cuando se trata de dinero ahora mismo?',
      '¿Cuál es la mayor pregunta o preocupación financiera que tienes ahora?',
      '¿Qué te trajo hoy? ¿Qué situación financiera quieres resolver?',
      'Cuéntame qué es real para ti financieramente ahora — ¿qué importa más?',
      '¿Cuál es la única cosa del dinero sobre la que quieres claridad?',
    ],
    fr: [
      "Qu'est-ce qui te préoccupe en matière d'argent en ce moment ?",
      "Quelle est ta plus grande question ou inquiétude financière aujourd'hui ?",
      "Qu'est-ce qui t'amène aujourd'hui ? Quelle situation financière veux-tu clarifier ?",
      "Dis-moi ce qui est réel pour toi financièrement maintenant — qu'est-ce qui compte le plus ?",
      "Quelle est la seule question d'argent sur laquelle tu veux de la clarté ?",
    ],
    zh: [
      '现在谈到钱，你最在意的是什么？',
      '你现在最大的财务问题或担忧是什么？',
      '是什么让你今天来到这里？你想解决哪种财务情况？',
      '告诉我你现在真实的财务处境 — 最重要的是什么？',
      '关于钱，你最想弄清的一件事是什么？',
    ],
  };

  const lang = language || 'en';
  const greeting = (greetings[lang] || greetings.en)[0] ?? greetings.en[0];
  const question = (openingQuestions[lang] || openingQuestions.en)[0] ?? openingQuestions.en[0];
  return `${greeting}\n\n${question}`;
}

export { generateStableOpeningMessage };

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
