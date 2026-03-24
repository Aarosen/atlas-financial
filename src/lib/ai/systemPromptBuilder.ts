import { ATLAS_SYSTEM_PROMPT } from './atlasSystemPrompt';
import { trimPromptSections } from './promptTrim';
import { buildAdvancedTopicContext } from './advancedTopics';
import { detectComprehensionSignal } from './comprehension';
import { culturallyRelevantExample } from './culturalExamples';
import { detectLanguage, type SupportedLanguage } from './multiLanguage';
import { buildToolkitContext } from './financialToolkit';
import { generatePersonalityPrompt, detectAppropriateTone } from './tonePersonalityEngine';
import type { FinancialState } from '@/lib/state/types';

export interface SystemPromptContext {
  type: 'extract' | 'chat' | 'answer' | 'answer_explain';
  lastUserText?: string;
  memorySummary?: string;
  preferredLanguage?: SupportedLanguage;
  messages?: Array<{ role: string; content: string }>;
  fin?: Partial<FinancialState>;
  calculationBlock?: string;
  sessionStateBlock?: string;
}

const EXTRACT_PROMPT = `You are a financial data extraction specialist for Atlas.
Your job: extract financial numbers and goals from user messages.

OUTPUT: Return pure JSON only. No markdown, no commentary, no explanation.
Return {} if nothing can be confidently extracted.

EXAMPLE:
Input: "I take home about $5,500/month. My rent is $1,800, groceries and bills maybe $800 more. I've got around $6k saved and $4,200 on a credit card. No other debt."
Output: {"monthlyIncome":5500,"essentialExpenses":2600,"totalSavings":6000,"highInterestDebt":4200,"lowInterestDebt":0}`;

export function buildSystemPrompt(context: SystemPromptContext): string {
  if (context.type === 'extract') {
    return EXTRACT_PROMPT;
  }

  // Build context sections
  const memoryContext = context.memorySummary
    ? `\n\nUSER MEMORY SUMMARY:\n${String(context.memorySummary).trim()}`
    : '';

  const lastUserText = context.lastUserText || '';
  const languageForPrompt = context.preferredLanguage || detectLanguage(lastUserText);
  const languageContext = `\n\nLANGUAGE: ${languageForPrompt}. Use the simplest possible wording.`;

  const exampleContext = `\n\nCULTURAL EXAMPLE: ${culturallyRelevantExample(lastUserText)}`;

  // Build advanced and toolkit contexts safely
  let advancedContext = '';
  let toolkitContext = '';
  
  if (context.fin) {
    const advancedValue = buildAdvancedTopicContext(context.fin as any);
    if (advancedValue) {
      advancedContext = `\n\nADVANCED TOPIC CONTEXT: ${advancedValue}`;
    }
    
    const toolkitValue = buildToolkitContext(context.fin as any);
    if (toolkitValue) {
      toolkitContext = `\n\nFINANCIAL TOOLKIT:\n${toolkitValue}`;
    }
  }

  const compSignal = detectComprehensionSignal(lastUserText);
  const comprehensionContext = compSignal
    ? `\n\nCOMPREHENSION SIGNAL: ${compSignal}. If low, simplify. If high, you may go deeper.`
    : '';

  const emotionTag = detectEmotion(context.messages || []);
  const emotionContext = `\n\nUSER EMOTION TAG: ${emotionTag}.`;

  const disclaimerContext = `\n\nDISCLAIMER_NEEDED: ${hasDisclaimer(context.messages || []) ? 'no' : 'yes'}. Only include the disclaimer if needed.`;

  // Detect appropriate tone
  const hasProgress = (context.messages || []).length > 5;
  const isFirstMessage = (context.messages || []).length <= 1;
  const emotionalState =
    emotionTag === 'anxious' || emotionTag === 'ashamed'
      ? 'stressed'
      : emotionTag === 'motivated'
        ? 'positive'
        : 'neutral';

  const appropriateTone = detectAppropriateTone(lastUserText, {
    isCrisis: false,
    hasProgress,
    isFirstMessage,
    emotionalState,
  });

  const personalityPrompt = generatePersonalityPrompt(appropriateTone);

  // Build session state block if provided
  const sessionStateSection = context.sessionStateBlock ? `\n\n${context.sessionStateBlock}` : '';

  // Build calculation block if provided
  const calculationSection = context.calculationBlock
    ? `\n\n━━━ AUTHORITATIVE CALCULATION DATA ━━━\nYOU MUST USE ONLY THE NUMBERS BELOW. DO NOT ESTIMATE OR CALCULATE INDEPENDENTLY.\n${context.calculationBlock}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    : '';

  // Assemble all prompt sections
  const promptSections = [
    ATLAS_SYSTEM_PROMPT,
    personalityPrompt,
    memoryContext,
    emotionContext,
    disclaimerContext,
    languageContext,
    exampleContext,
    advancedContext,
    toolkitContext,
    comprehensionContext,
    sessionStateSection,
    calculationSection,
  ];

  // Trim to token budget
  return trimPromptSections(promptSections, 4200);
}

function detectEmotion(messages: Array<{ role: string; content: string }>): string {
  const recentText = messages
    .slice(-3)
    .filter((m) => m.role === 'user')
    .map((m) => String(m.content || ''))
    .join(' ')
    .toLowerCase();

  if (/\b(anxious|worried|stressed|scared|panic|overwhelmed)\b/i.test(recentText)) return 'anxious';
  if (/\b(embarrassed|ashamed|guilty|failure|stupid)\b/i.test(recentText)) return 'ashamed';
  if (/\b(excited|motivated|ready|determined|finally)\b/i.test(recentText)) return 'motivated';
  if (/\b(confused|don't know|no idea|lost)\b/i.test(recentText)) return 'confused';
  if (/\b(urgent|immediately|right now|asap)\b/i.test(recentText)) return 'urgent';
  return 'neutral';
}

function hasDisclaimer(messages: Array<{ role: string; content: string }>): boolean {
  const allText = messages.map((m) => String(m.content || '')).join(' ').toLowerCase();
  return /\b(not financial advice|educational|disclaimer|not a financial advisor)\b/i.test(allText);
}
