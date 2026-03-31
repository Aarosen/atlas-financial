/**
 * Message length validation for chat API
 * Prevents excessively long messages that could exceed context limits
 */

export const MESSAGE_LENGTH_LIMITS = {
  CLIENT_SOFT_LIMIT: 4000, // Show warning at this length
  CLIENT_HARD_LIMIT: 6000, // Prevent send at this length
  SERVER_HARD_LIMIT: 8000, // Server rejects at this length
};

export interface MessageValidationResult {
  isValid: boolean;
  length: number;
  warning?: string;
  error?: string;
}

/**
 * Validate message length on client side
 * Returns validation result with optional warning or error
 */
export function validateMessageLength(message: string): MessageValidationResult {
  const length = message.trim().length;

  // Hard limit: prevent send
  if (length > MESSAGE_LENGTH_LIMITS.CLIENT_HARD_LIMIT) {
    return {
      isValid: false,
      length,
      error: `Message is too long (${length} characters). Maximum is ${MESSAGE_LENGTH_LIMITS.CLIENT_HARD_LIMIT} characters. Please shorten your message.`,
    };
  }

  // Soft limit: show warning
  if (length > MESSAGE_LENGTH_LIMITS.CLIENT_SOFT_LIMIT) {
    return {
      isValid: true,
      length,
      warning: `Your message is quite long (${length} characters). Consider breaking it into shorter messages for better responses.`,
    };
  }

  return {
    isValid: true,
    length,
  };
}

/**
 * Get character count for display
 */
export function getCharacterCount(message: string): number {
  return message.trim().length;
}

/**
 * Get remaining characters before soft limit
 */
export function getRemainingCharacters(message: string): number {
  const length = getCharacterCount(message);
  return Math.max(0, MESSAGE_LENGTH_LIMITS.CLIENT_SOFT_LIMIT - length);
}

/**
 * Check if message is approaching soft limit
 */
export function isApproachingLimit(message: string): boolean {
  return getCharacterCount(message) > MESSAGE_LENGTH_LIMITS.CLIENT_SOFT_LIMIT * 0.8;
}
