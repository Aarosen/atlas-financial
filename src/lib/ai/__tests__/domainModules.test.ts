import { describe, it, expect } from 'vitest';
import { analyzeTaxSituation, calculateFederalTaxBracket, calculateEstimatedTaxLiability } from '../domainModules/taxModule';
import { analyzeRetirementSituation, projectRetirementSavings } from '../domainModules/retirementModule';
import { analyzeInvestmentSituation, getRecommendedAllocation } from '../domainModules/investmentModule';

describe('Tax Module', () => {
  it('calculates correct federal tax bracket for single filer', () => {
    const bracket = calculateFederalTaxBracket(75000, 'single');
    expect(bracket.rate).toBe(0.22);
    expect(bracket.range[0]).toBe(47150);
    expect(bracket.range[1]).toBe(100525);
  });

  it('calculates correct federal tax bracket for married filing jointly', () => {
    const bracket = calculateFederalTaxBracket(150000, 'married_filing_jointly');
    expect(bracket.rate).toBe(0.22);
  });

  it('calculates estimated tax liability with standard deduction', () => {
    const liability = calculateEstimatedTaxLiability({
      income: 75000,
      filingStatus: 'single',
      state: 'CA',
    });
    // $75k - $14.6k standard deduction = $60.4k taxable
    // Tax: $1160 (10% on first $11.6k) + $5568 (12% on $46.55k) + $2728.4 (22% on $12.4k) = $9456.4
    expect(liability).toBeGreaterThan(8000);
    expect(liability).toBeLessThan(10000);
  });

  it('generates tax recommendations for high income', () => {
    const analysis = analyzeTaxSituation({
      income: 200000,
      filingStatus: 'single',
    });
    expect(analysis.educationalMoments.length).toBeGreaterThan(0);
    expect(analysis.marginalTaxRate).toBeGreaterThan(0);
  });

  it('detects self-employment tax scenarios', () => {
    const analysis = analyzeTaxSituation({
      income: 100000,
      filingStatus: 'single',
      hasSelfEmploymentIncome: true,
      selfEmploymentIncome: 50000,
    });
    expect(analysis.warnings.length).toBeGreaterThan(0);
    expect(analysis.warnings.some((w) => w.includes('quarterly'))).toBe(true);
  });
});

describe('Retirement Module', () => {
  it('projects retirement savings correctly', () => {
    const savings = projectRetirementSavings({
      currentAge: 35,
      retirementAge: 65,
      currentSavings: 100000,
      annualContribution: 20000,
      annualExpenses: 50000,
      expectedReturn: 0.07,
      inflationRate: 0.03,
      lifeExpectancy: 95,
      hasSocialSecurity: true,
    });
    // Over 30 years with 7% return and $20k annual contributions
    expect(savings).toBeGreaterThan(2000000);
    expect(savings).toBeLessThan(4000000);
  });

  it('calculates FIRE number correctly', () => {
    const analysis = analyzeRetirementSituation({
      currentAge: 30,
      retirementAge: 45,
      currentSavings: 50000,
      annualContribution: 30000,
      annualExpenses: 50000,
      expectedReturn: 0.08,
      inflationRate: 0.03,
      lifeExpectancy: 95,
      hasSocialSecurity: true,
    });
    // FIRE number = $50k * 25 = $1.25M
    expect(analysis.fireNumber).toBe(1250000);
  });

  it('generates retirement recommendations', () => {
    const analysis = analyzeRetirementSituation({
      currentAge: 50,
      retirementAge: 67,
      currentSavings: 300000,
      annualContribution: 25000,
      annualExpenses: 60000,
      expectedReturn: 0.07,
      inflationRate: 0.03,
      lifeExpectancy: 95,
      hasSocialSecurity: true,
    });
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    expect(analysis.educationalMoments.length).toBeGreaterThan(0);
  });
});

describe('Investment Module', () => {
  it('recommends conservative allocation for cautious investors', () => {
    const allocation = getRecommendedAllocation({
      investmentAmount: 10000,
      timeHorizon: 5,
      riskTolerance: 'cautious',
      hasEmergencyFund: true,
      hasHighInterestDebt: false,
    });
    expect(allocation.stocks).toBeLessThan(40);
    expect(allocation.bonds).toBeGreaterThan(50);
  });

  it('recommends growth allocation for long-term investors', () => {
    const allocation = getRecommendedAllocation({
      investmentAmount: 50000,
      timeHorizon: 30,
      riskTolerance: 'growth',
      hasEmergencyFund: true,
      hasHighInterestDebt: false,
    });
    expect(allocation.stocks).toBeGreaterThan(70);
    expect(allocation.bonds).toBeLessThan(30);
  });

  it('generates investment recommendations', () => {
    const analysis = analyzeInvestmentSituation({
      investmentAmount: 25000,
      timeHorizon: 20,
      riskTolerance: 'balanced',
      hasEmergencyFund: false,
      hasHighInterestDebt: true,
    });
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    expect(analysis.recommendations.some((r) => r.includes('emergency'))).toBe(true);
  });

  it('calculates expected return correctly', () => {
    const analysis = analyzeInvestmentSituation({
      investmentAmount: 10000,
      timeHorizon: 10,
      riskTolerance: 'balanced',
      hasEmergencyFund: true,
      hasHighInterestDebt: false,
    });
    expect(analysis.expectedAnnualReturn).toBeGreaterThan(0.05);
    expect(analysis.expectedAnnualReturn).toBeLessThan(0.10);
  });
});
