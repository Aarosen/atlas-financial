export function culturallyRelevantExample(topic: string): string {
  const t = String(topic || '').toLowerCase();
  if (t.includes('budget')) {
    return 'Example: a gig worker setting aside 10% from each payout for bills.';
  }
  if (t.includes('savings')) {
    return 'Example: a family sending money home still building a $500 starter buffer.';
  }
  return 'Example: a young professional balancing rent, food, and savings goals.';
}
