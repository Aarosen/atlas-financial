/**
 * TASK 2.2: Detect unauthorized financial estimates in LLM responses.
 * The LLM must never generate financial figures — only use CALCULATION_RESULTS.
 */
function detectUnauthorizedEstimate(text: string): { detected: boolean; examples: string[] } {
  const approximationPatterns = [
    /about \$[\d,]+/gi,
    /roughly \$[\d,]+/gi,
    /approximately \$[\d,]+/gi,
    /around \$[\d,]+/gi,
    /maybe \$[\d,]+/gi,
    /about \d+ months/gi,
    /roughly \d+ months/gi,
    /approximately \d+ months/gi,
    /around \d+ months/gi,
  ];

  const examples: string[] = [];
  for (const pattern of approximationPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      examples.push(...matches.slice(0, 2)); // Capture up to 2 examples per pattern
    }
  }

  return {
    detected: examples.length > 0,
    examples: [...new Set(examples)], // Deduplicate
  };
}

export function cleanAtlasResponse(raw: string): string {
  let cleaned = raw
    // Remove any leading control tags like [EMPATHY], [CALCULATION_RESULTS], etc.
    .replace(/^\[[A-Z_]+\]\n?/g, '')
    // Remove profile block delimiters (all variations)
    .replace(/\[ATLAS_USER_PROFILE\][\s\S]*?\[END_PROFILE\]/g, '')
    .replace(/\[ATLAS_USER_PROFILE\]/g, '')
    .replace(/\[END_PROFILE\]/g, '')
    // Remove calculation result block delimiters (all variations)
    .replace(/\[CALCULATION_RESULTS[^\]]*\]/g, '')
    .replace(/\[CALCULATION_RESULTS\]/g, '')
    .replace(/\[END_CALCULATIONS\]/g, '')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove bullet points
    .replace(/^[-*•]\s+/gm, '')
    // Remove numbered list markers
    .replace(/^\d+\.\s+/gm, '')
    // Remove 'What it is' style headers
    .replace(/^(What it is|Why it matters|How to improve it|One next step)\s*\n/gim, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // TASK 2.2: Detect and log unauthorized financial estimates
  const estimate = detectUnauthorizedEstimate(cleaned);
  if (estimate.detected) {
    console.warn(
      '[atlas] TASK 2.2 VIOLATION: LLM generated unauthorized financial estimates:',
      estimate.examples.join(', ')
    );
  }

  // AUDIT 20 FIX BUG-20-004: Enforce ONE NEXT ACTION rule
  // AUDIT 21 FIX BUG-21-001: Fix Math.min logic with proper null-checks
  // If response asks 2+ questions, truncate to first question only
  const questionCount = (cleaned.match(/\?/g) || []).length;
  if (questionCount > 1) {
    // Find the position of the first question mark
    const firstQuestionPos = cleaned.indexOf('?');
    if (firstQuestionPos !== -1) {
      // Find the end of the sentence containing the first question
      // Look for period, newline, or end of string after the first question mark
      const periodPos = cleaned.indexOf('.', firstQuestionPos);
      const nlPos = cleaned.indexOf('\n', firstQuestionPos);
      
      // Properly handle -1 returns from indexOf
      const endOfFirstQuestion = Math.min(
        periodPos !== -1 ? periodPos + 1 : cleaned.length,
        nlPos !== -1 ? nlPos : cleaned.length,
        cleaned.length
      );
      
      // Truncate to first question and its sentence
      cleaned = cleaned.substring(0, endOfFirstQuestion).trim();
    }
  }

  return cleaned;
}
