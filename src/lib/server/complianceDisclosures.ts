/**
 * Compliance Disclosures Module
 * Provides regulatory disclaimers and educational framing for all financial guidance
 * Ensures Atlas maintains "educator, not adviser" positioning
 */

export interface DisclaimerContext {
  topic: 'investing' | 'tax' | 'retirement' | 'debt' | 'general';
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  includeFullDisclaimer: boolean;
}

export const FULL_DISCLAIMERS = {
  general: `**Important Disclosure:** Atlas is an educational financial mentor, not a licensed financial adviser, tax professional, or investment adviser. The information provided is for educational purposes only and should not be construed as personalized financial, investment, tax, or legal advice. Always consult with a qualified financial adviser, CPA, or attorney before making significant financial decisions.`,

  investing: `**Investment Disclaimer:** Atlas provides general education about investing principles and strategies. We do not recommend specific securities, manage accounts, or execute trades. Past performance does not guarantee future results. All investments carry risk, including potential loss of principal. Consider your risk tolerance, time horizon, and financial goals before investing. Consult a registered investment adviser for personalized investment advice.`,

  tax: `**Tax Disclaimer:** Atlas provides general tax education and information. Tax laws are complex and vary by individual circumstances, state, and year. This is not tax advice. Consult a qualified CPA or tax professional before making tax-related decisions, especially regarding deductions, credits, retirement accounts, or estimated payments.`,

  retirement: `**Retirement Planning Disclaimer:** Atlas provides general education about retirement planning concepts. Retirement planning is highly individual and depends on many factors including age, income, expenses, health, and life expectancy. This is not personalized retirement advice. Consult a certified financial planner (CFP) or retirement specialist for a comprehensive retirement plan.`,

  debt: `**Debt Management Disclaimer:** Atlas provides educational information about debt management strategies. Specific debt payoff strategies should be evaluated based on your individual situation, interest rates, and financial goals. Consider consulting a credit counselor or financial adviser for personalized debt management guidance.`,
};

export const SHORT_DISCLAIMERS = {
  general: `Atlas is educational, not financial advice. Consult a professional before major decisions.`,
  investing: `Educational only—not investment advice. Consult a registered investment adviser.`,
  tax: `General tax education only—not tax advice. Consult a CPA for your situation.`,
  retirement: `General education—not personalized retirement advice. Consult a CFP.`,
  debt: `Educational information—not personalized debt advice. Consult a credit counselor.`,
};

export const EDUCATOR_FRAMING = {
  investing: `Here's how investing works: [explanation]. This is general education—not a recommendation for you specifically.`,
  tax: `Let me explain how this works for tax purposes: [explanation]. This is educational—you should verify with a CPA for your specific situation.`,
  retirement: `Here's how retirement planning typically works: [explanation]. Your specific plan should be developed with a financial professional.`,
  debt: `Here's a common strategy for managing debt: [explanation]. The best approach for you depends on your specific numbers and situation.`,
};

export class ComplianceDisclosureManager {
  /**
   * Get appropriate disclaimer for context
   */
  getDisclaimer(context: DisclaimerContext): string {
    const disclaimers = context.includeFullDisclaimer ? FULL_DISCLAIMERS : SHORT_DISCLAIMERS;
    return disclaimers[context.topic] || disclaimers.general;
  }

  /**
   * Get educator framing for a topic
   */
  getEducatorFraming(topic: 'investing' | 'tax' | 'retirement' | 'debt'): string {
    return EDUCATOR_FRAMING[topic];
  }

  /**
   * Wrap response with appropriate disclaimer
   */
  wrapWithDisclaimer(response: string, context: DisclaimerContext): string {
    const disclaimer = this.getDisclaimer(context);
    return `${response}\n\n---\n\n${disclaimer}`;
  }

  /**
   * Check if response needs disclaimer
   */
  shouldIncludeDisclaimer(topic: string): boolean {
    const topicsRequiringDisclaimer = ['investing', 'tax', 'retirement', 'debt', 'financial_advice'];
    return topicsRequiringDisclaimer.some((t) => topic.toLowerCase().includes(t));
  }

  /**
   * Generate regulatory disclosures for marketing/website
   */
  getMarketingDisclosure(): string {
    return `
## Important Disclosures

**Atlas is an educational financial mentor, not a financial adviser.**

Atlas provides general financial education and guidance. We do not:
- Provide personalized financial, investment, or tax advice
- Manage accounts or execute trades
- Offer fiduciary advice
- Provide legal advice

**Before making significant financial decisions, consult with:**
- A Certified Financial Planner (CFP) for investment and financial planning
- A CPA or tax professional for tax matters
- An attorney for legal matters
- A credit counselor for debt management

**Risk Disclosure:**
All investments carry risk, including potential loss of principal. Past performance does not guarantee future results. Your financial situation is unique—what works for others may not work for you.

**Data Privacy:**
Atlas does not require bank connections. Your financial information is never shared with third parties. We collect only what you voluntarily share in conversation.

**No Guarantees:**
Atlas cannot guarantee financial outcomes or returns. Financial success depends on many factors including your actions, market conditions, and personal circumstances.
`;
  }

  /**
   * Generate terms of service excerpt
   */
  getTermsOfServiceExcerpt(): string {
    return `
## Terms of Service - Key Points

1. **Educational Use Only:** Atlas is for educational purposes. It is not a substitute for professional financial, tax, or legal advice.

2. **No Fiduciary Relationship:** Atlas does not act as a fiduciary. We do not have a legal duty to act in your best interest.

3. **User Responsibility:** You are responsible for verifying information and consulting professionals before making financial decisions.

4. **No Warranties:** Atlas is provided "as is" without warranties of accuracy or completeness.

5. **Limitation of Liability:** Atlas is not liable for financial losses resulting from use of the service.

6. **Data Privacy:** We collect minimal data and do not share it with third parties. See our Privacy Policy for details.
`;
  }
}

export const complianceDisclosureManager = new ComplianceDisclosureManager();
