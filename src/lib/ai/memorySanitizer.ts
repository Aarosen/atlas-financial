/**
 * Sanitize memory summary before injection into system prompt
 * Prevents prompt injection attacks via memorySummary
 */

const INJECTION_PATTERNS = [
  /\bIGNORE\b/gi,
  /\bOVERRIDE\b/gi,
  /\bYOU ARE NOW\b/gi,
  /\bNEW INSTRUCTIONS\b/gi,
  /\bFORGET\b/gi,
  /\bDISREGARD\b/gi,
  /\bFORGET ALL\b/gi,
  /\bCLEAR ALL\b/gi,
  /\bREPLACE SYSTEM\b/gi,
  /\bSYSTEM PROMPT\b/gi,
  /\bREWRITE YOUR\b/gi,
  /\bYOU MUST NOW\b/gi,
  /\bFROM NOW ON\b/gi,
  /\bIMPORTANT:\s*IGNORE/gi,
  /\bCRITICAL:\s*IGNORE/gi,
  /\bRULE\s*\d+/gi,
  /\b[A-Z]{3,}:\s*[A-Z]/gi, // Uppercase instruction patterns like "RULE: DO THIS"
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
