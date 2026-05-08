export interface Lesson {
  id: string;
  title: string;
  trigger: (state: any, history: HistoryHelper) => boolean;
  body: string;
}

export interface LessonRecord {
  k: string; // lesson id
  ts: number;
  state: 'read' | 'dismissed';
}

export interface HistoryHelper {
  has: (id: string) => boolean;
}

export const LESSONS: Lesson[] = [
  {
    id: 'L01_first_thousand',
    title: 'The first $1,000 buffer is the hardest',
    trigger: (state: any) => (state.metrics?.bufferMonths || 0) >= 0.5,
    body: "Most 'build my emergency fund' attempts die between $200 and $800. The brain hasn't built the habit yet. Atlas's job: keep it boring and small enough to never break.",
  },
  {
    id: 'L02_debt_before_invest',
    title: 'Why Atlas sequences debt before invest',
    trigger: (state: any) => state.derived?.lever === 'eliminate_high_interest_debt',
    body: 'Your credit card APR is almost certainly higher than the after-tax expected return on a typical retail portfolio. Investing alongside high-interest debt usually loses money on net.',
  },
  {
    id: 'L03_pay_yourself_first',
    title: 'What "pay yourself first" actually means',
    trigger: (state: any) => state.derived?.lever === 'increase_future_allocation',
    body: "It's not a savings tactic. It's a sequencing rule: the Future-You envelope is funded the day income hits, not from leftovers at month-end. Leftovers are a fairy tale.",
  },
  {
    id: 'L04_zero_based_explained',
    title: 'Why every dollar gets a job',
    trigger: (state: any) => (state.metrics?.envelopeUnallocated || 0) === 0,
    body: "Unallocated dollars get spent. The zero-based principle is not an accounting trick; it's a forcing function on intention. Atlas asks for the work because it works.",
  },
  {
    id: 'L05_debt_snowball_psychology',
    title: 'Why the debt snowball wins (even if avalanche is mathematically better)',
    trigger: (state: any) => (state.metrics?.debts || []).length > 1,
    body: 'The avalanche (highest APR first) saves the most interest. The snowball (smallest balance first) delivers wins faster. Psychology beats math. Pick snowball if you need momentum.',
  },
  {
    id: 'L06_buffer_is_not_savings',
    title: 'Your buffer is not an investment',
    trigger: (state: any) => (state.metrics?.bufferMonths || 0) >= 1,
    body: 'A buffer (emergency fund) is insurance, not an asset. It earns a pittance in a HYSA because its job is to be boring and available, not to beat inflation. Once you have 6 months, stop adding to it.',
  },
  {
    id: 'L07_tax_advantaged_first',
    title: 'Why tax-advantaged accounts come before taxable',
    trigger: (state: any) => state.derived?.investmentPriority === 'fill_pretax_first',
    body: 'Every dollar in a 401(k) or IRA saves you taxes *today* (pre-tax) or *never* (Roth). A dollar in a taxable brokerage gets taxed on gains every year. Fill retirement accounts first.',
  },
  {
    id: 'L08_lifestyle_creep_is_real',
    title: 'Lifestyle creep is the #1 reason people stay broke',
    trigger: (state: any) => (state.metrics?.discretionarySpend || 0) > state.metrics?.essentialSpend * 0.5,
    body: 'When your income goes up, your spending goes up faster. A $5k raise becomes a $6k lifestyle in 6 months. The only defense: automate the raise into savings *before* you see it.',
  },
  {
    id: 'L09_interest_is_a_tax',
    title: 'Interest on debt is a tax on your future self',
    trigger: (state: any) => (state.metrics?.highInterestDebt || 0) > 0,
    body: 'A $5,000 credit card balance at 20% APR costs you $1,000 a year in interest alone. That $1,000 is gone forever — it never builds wealth. High-interest debt is the enemy.',
  },
  {
    id: 'L10_compound_interest_magic',
    title: 'Compound interest is the eighth wonder of the world',
    trigger: (state: any) => (state.metrics?.investmentBalance || 0) > 10000,
    body: '$10,000 invested at 7% annual return becomes $76,000 in 30 years. $20,000 becomes $152,000. The difference is not the extra $10k — it is time. Start early.',
  },
  {
    id: 'L11_emergency_fund_psychology',
    title: 'An emergency fund is permission to take risks',
    trigger: (state: any) => (state.metrics?.bufferMonths || 0) >= 3,
    body: 'With 3 months of expenses saved, you can negotiate a raise, switch jobs, or take a sabbatical without panic. A buffer is not just insurance — it is freedom.',
  },
  {
    id: 'L12_goals_are_not_optional',
    title: 'Goals without a plan are just wishes',
    trigger: (state: any) => (state.goals || []).length > 0,
    body: 'A goal is real only when it has a number, a deadline, and a monthly contribution. "Save for a house" is a wish. "$500k down payment in 5 years = $8,333/month" is a goal.',
  },
];

export class Curriculum {
  static async pendingLessons(db: any, state: any): Promise<Lesson[]> {
    const seen = (await db.all('lessons')) || [];
    const seenSet = new Set(seen.map((l: LessonRecord) => l.k));
    const history: HistoryHelper = { has: (id: string) => seenSet.has(id) };

    return LESSONS.filter((l) => {
      try {
        return l.trigger(state, history) && !seenSet.has(l.id);
      } catch (e) {
        return false;
      }
    });
  }

  static async markRead(db: any, id: string): Promise<void> {
    await db.set('lessons', {
      k: id,
      ts: Date.now(),
      state: 'read',
    });
  }

  static async markDismissed(db: any, id: string): Promise<void> {
    await db.set('lessons', {
      k: id,
      ts: Date.now(),
      state: 'dismissed',
    });
  }

  static async getReadCount(db: any): Promise<number> {
    const all = (await db.all('lessons')) || [];
    return all.filter((l: LessonRecord) => l.state === 'read').length;
  }
}
