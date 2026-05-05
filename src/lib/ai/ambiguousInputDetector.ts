/**
 * TASK 1.3: Detect ambiguous financial inputs that need confirmation before use
 * Examples: ranges ("$3k-$5k"), approximations ("about $4k"), vague amounts ("some")
 */

export type AmbiguityType = 'range' | 'approximation' | 'vague' | 'none';

export interface AmbiguousInput {
  type: AmbiguityType;
  extractedValue?: number; // The value we extracted (midpoint for ranges)
  originalText: string;
  confirmationPrompt: string; // What to ask user to confirm
}

export function detectAmbiguousInput(userText: string, fieldName: string): AmbiguousInput {
  const text = userText.trim();

  // RANGE DETECTION: "$3k-$5k", "$3000 to $5000", "between $3k and $5k"
  const rangeMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand)?\s*(?:to|-|–|through)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand)?/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const max = parseFloat(rangeMatch[2].replace(/,/g, ''));
    const minFinal = text.toLowerCase().includes('k') || text.toLowerCase().includes('thousand') ? min * 1000 : min;
    const maxFinal = text.toLowerCase().includes('k') || text.toLowerCase().includes('thousand') ? max * 1000 : max;
    const midpoint = Math.round((minFinal + maxFinal) / 2);
    
    return {
      type: 'range',
      extractedValue: midpoint,
      originalText: text,
      confirmationPrompt: `I see you said ${text}. Just to confirm, should I use $${midpoint.toLocaleString()} as your ${fieldName}?`,
    };
  }

  // APPROXIMATION DETECTION: "about", "roughly", "around", "approximately", "maybe", "I think"
  const approximationMatch = text.match(/\b(about|roughly|around|approximately|maybe|i think|i'd say|something like|in the ballpark of)\b/i);
  if (approximationMatch) {
    const numberMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand)?/i);
    if (numberMatch) {
      let value = parseFloat(numberMatch[1].replace(/,/g, ''));
      if (text.toLowerCase().includes('k') || text.toLowerCase().includes('thousand')) {
        value *= 1000;
      }
      
      return {
        type: 'approximation',
        extractedValue: value,
        originalText: text,
        confirmationPrompt: `You said "${text}". Should I use $${Math.round(value).toLocaleString()} for your ${fieldName}?`,
      };
    }
  }

  // VAGUE DETECTION: "some", "a bit", "a little", "not much", "a lot"
  const vagueMatch = text.match(/\b(some|a bit|a little|not much|a lot|quite a bit|several|multiple)\b/i);
  if (vagueMatch && !text.match(/\$\d+/)) {
    return {
      type: 'vague',
      originalText: text,
      confirmationPrompt: `I need a specific number for your ${fieldName}. Can you give me a dollar amount?`,
    };
  }

  return {
    type: 'none',
    originalText: text,
    confirmationPrompt: '',
  };
}

export function shouldConfirmBeforeApplying(ambiguity: AmbiguousInput): boolean {
  return ambiguity.type !== 'none';
}

export function buildAmbiguityConfirmationPrompt(ambiguity: AmbiguousInput): string {
  if (ambiguity.type === 'none') return '';
  return ambiguity.confirmationPrompt;
}
