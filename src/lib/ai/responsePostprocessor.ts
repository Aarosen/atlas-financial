export function cleanAtlasResponse(raw: string): string {
  return raw
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
}
