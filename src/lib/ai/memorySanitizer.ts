/**
 * Sanitize memory summary before injection into system prompt
 * Prevents prompt injection attacks via memorySummary
 */

// REMEDIATION 3: Fix sanitization false positives
// Block only specific injection phrases, not individual common words
// "FORGET" in "FORGET ALL PREVIOUS INSTRUCTIONS" is injection
// "FORGET" in "I want to forget about my debt" is legitimate financial language
const INJECTION_PATTERNS = [
  /\bIGNORE\s+(?:ALL\s+)?(?:PREVIOUS\s+|PRIOR\s+)?(?:INSTRUCTIONS?|CONTEXT|RULES?)\b/gi,
  /\bOVERRIDE\s+(?:ALL\s+)?(?:PREVIOUS\s+)?(?:INSTRUCTIONS?|RULES?|SYSTEM)\b/gi,
  /\bYOU\s+ARE\s+NOW\b/gi,
  /\bNEW\s+INSTRUCTIONS?\b/gi,
  /\bFORGET\s+(?:ALL|EVERYTHING|PREVIOUS|YOUR\s+(?:INSTRUCTIONS?|RULES?|SYSTEM))\b/gi,
  /\bDISREGARD\s+(?:ALL\s+)?(?:PREVIOUS\s+)?(?:INSTRUCTIONS?|CONTEXT|RULES?)\b/gi,
  /\bCLEAR\s+(?:ALL\s+)?(?:PREVIOUS\s+)?(?:INSTRUCTIONS?|CONTEXT|RULES?)\b/gi,
  /\bREPLACE\s+(?:YOUR\s+)?(?:SYSTEM|INSTRUCTIONS?|RULES?)\b/gi,
  /\bSYSTEM\s+PROMPT\b/gi,
  /\bREWRITE\s+YOUR\s+(?:INSTRUCTIONS?|RULES?|SYSTEM)\b/gi,
  /\bYOU\s+MUST\s+NOW\b/gi,
  /\bIMPORTANT:\s*IGNORE\s+(?:ALL\s+)?(?:PREVIOUS\s+)?(?:INSTRUCTIONS?|CONTEXT|RULES?)\b/gi,
  /\bCRITICAL:\s*IGNORE\s+(?:ALL\s+)?(?:PREVIOUS\s+)?(?:INSTRUCTIONS?|CONTEXT|RULES?)\b/gi,
];

const MAX_MEMORY_LENGTH = 500;

/**
 * Sanitize memory summary to prevent prompt injection
 * Removes instruction-like patterns and limits length
 */
export function sanitizeMemorySummary(memorySummary: string | undefined): string {
  if (!memorySummary) {
    return '';
  }

  let sanitized = String(memorySummary).trim();

  // Remove injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Limit length to prevent context window abuse
  if (sanitized.length > MAX_MEMORY_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MEMORY_LENGTH).trim();
    // Remove incomplete sentence at end
    const lastPeriod = sanitized.lastIndexOf('.');
    if (lastPeriod > 0) {
      sanitized = sanitized.substring(0, lastPeriod + 1);
    }
  }

  // Remove multiple consecutive newlines
  sanitized = sanitized.replace(/\n\n+/g, '\n');

  return sanitized;
}
