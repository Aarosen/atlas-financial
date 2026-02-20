/**
 * Advanced Personalization Engine
 * Requirements 25-27: Communication style, learning style, risk/goal alignment
 */

export interface PersonalizationSettings {
  communicationStyle: 'formal' | 'casual' | 'technical' | 'simple';
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  goalAlignment: string[];
  preferences: Record<string, any>;
}

export interface CommunicationTemplate {
  style: string;
  greeting: string;
  explanation: string;
  closing: string;
}

export interface LearningContent {
  type: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  title: string;
  content: string;
  format: string;
}

export function initializePersonalization(): PersonalizationSettings {
  return {
    communicationStyle: 'casual',
    learningStyle: 'mixed' as any,
    riskTolerance: 'moderate',
    goalAlignment: [],
    preferences: {},
  };
}

export function getCommunicationTemplate(style: string): CommunicationTemplate {
  const templates: Record<string, CommunicationTemplate> = {
    formal: {
      style: 'formal',
      greeting: 'Good day. I hope this message finds you well.',
      explanation: 'Based on our analysis, we recommend the following course of action:',
      closing: 'Please let me know if you require further clarification.',
    },
    casual: {
      style: 'casual',
      greeting: 'Hey! How are you doing?',
      explanation: 'So here\'s what I\'m thinking:',
      closing: 'Let me know what you think!',
    },
    technical: {
      style: 'technical',
      greeting: 'Greetings.',
      explanation: 'Algorithm analysis indicates optimal strategy:',
      closing: 'Consult documentation for additional parameters.',
    },
    simple: {
      style: 'simple',
      greeting: 'Hi there!',
      explanation: 'Here\'s what you should do:',
      closing: 'Any questions?',
    },
  };

  return templates[style] || templates.casual;
}

export function generateLearningContent(style: string, topic: string): LearningContent {
  const contents: Record<string, LearningContent> = {
    visual: {
      type: 'visual',
      title: `Visual Guide: ${topic}`,
      content: 'Chart showing financial data visualization',
      format: 'infographic',
    },
    auditory: {
      type: 'auditory',
      title: `Audio Explanation: ${topic}`,
      content: 'Spoken explanation of financial concepts',
      format: 'podcast',
    },
    reading: {
      type: 'reading',
      title: `Detailed Article: ${topic}`,
      content: 'Comprehensive written explanation with examples',
      format: 'article',
    },
    kinesthetic: {
      type: 'kinesthetic',
      title: `Interactive Exercise: ${topic}`,
      content: 'Step-by-step interactive financial planning tool',
      format: 'interactive',
    },
  };

  return contents[style] || contents.reading;
}

export function alignRecommendationToRisk(
  recommendation: string,
  riskTolerance: string,
  goals: string[]
): string {
  const riskAdjustments: Record<string, string> = {
    conservative: 'Consider a more cautious approach with lower risk investments',
    moderate: 'This balanced approach aligns with moderate risk tolerance',
    aggressive: 'This strategy maximizes growth potential for aggressive investors',
  };

  let adjusted = recommendation;
  adjusted += `. ${riskAdjustments[riskTolerance] || riskAdjustments.moderate}`;

  if (goals.length > 0) {
    adjusted += `. This aligns with your goals: ${goals.join(', ')}`;
  }

  return adjusted;
}

export function personalizeMessage(
  baseMessage: string,
  settings: PersonalizationSettings
): string {
  const template = getCommunicationTemplate(settings.communicationStyle);
  return `${template.greeting} ${baseMessage}`;
}

export function getPersonalizationSummary(settings: PersonalizationSettings): string {
  return `Personalization: ${settings.communicationStyle} style, ${settings.learningStyle} learning, ${settings.riskTolerance} risk tolerance`;
}
