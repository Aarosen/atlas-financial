export interface CustomRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  cat: string;
  kind: 'essential' | 'discretionary' | 'future' | 'other';
  createdAt: number;
}

export interface CategorizeResult {
  cat: string;
  kind: 'essential' | 'discretionary' | 'future' | 'other';
  matched?: string;
}

export class CustomRules {
  static async load(db: any): Promise<CustomRule[]> {
    return (await db.all('rules')) || [];
  }

  static categorize(merchant: string, amountSign: number, customRules: CustomRule[]): CategorizeResult {
    // Try custom rules first
    for (const r of customRules) {
      try {
        const pattern = r.isRegex ? r.pattern : r.pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp(pattern, 'i');
        if (re.test(merchant)) {
          return { cat: r.cat, kind: r.kind, matched: r.id };
        }
      } catch (e) {
        // skip malformed regex
      }
    }

    // Fall back to default categorization (simplified)
    const m = merchant.toLowerCase();
    if (m.includes('rent') || m.includes('mortgage') || m.includes('landlord')) {
      return { cat: 'housing', kind: 'essential' };
    }
    if (m.includes('grocery') || m.includes('whole foods') || m.includes('trader joe')) {
      return { cat: 'groceries', kind: 'essential' };
    }
    if (m.includes('electric') || m.includes('water') || m.includes('gas')) {
      return { cat: 'utilities', kind: 'essential' };
    }
    if (m.includes('uber') || m.includes('lyft') || m.includes('transit')) {
      return { cat: 'transport', kind: 'essential' };
    }
    if (m.includes('restaurant') || m.includes('cafe') || m.includes('pizza') || m.includes('starbucks')) {
      return { cat: 'dining', kind: 'discretionary' };
    }
    if (m.includes('amazon') || m.includes('target') || m.includes('walmart')) {
      return { cat: 'shopping', kind: 'discretionary' };
    }
    if (m.includes('netflix') || m.includes('spotify') || m.includes('hulu')) {
      return { cat: 'subscriptions', kind: 'discretionary' };
    }
    if (m.includes('vanguard') || m.includes('fidelity') || m.includes('401k')) {
      return { cat: 'investing', kind: 'future' };
    }

    return { cat: 'other', kind: 'discretionary' };
  }
}
