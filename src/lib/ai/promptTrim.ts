export function trimPromptSections(sections: string[], maxChars: number): string {
  const out: string[] = [];
  let total = 0;
  for (const section of sections) {
    if (!section) continue;
    if (total + section.length > maxChars) break;
    out.push(section);
    total += section.length;
  }
  return out.join('');
}
