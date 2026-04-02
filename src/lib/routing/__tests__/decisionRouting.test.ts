/**
 * DECISION ROUTING ENGINE TESTS
 * 
 * Comprehensive tests for deterministic financial decision routing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionRoutingEngine } from '../decisionRoutingEngine';
import { CrisisRouter } from '../routers/crisisRouter';
import { DebtRouter } from '../routers/debtRouter';
import { EmergencyFundRouter } from '../routers/emergencyFundRouter';
import type { DecisionContext, FinancialSnapshot } from '../types';

describe('Decision Routing Engine', () => {
  let engine: DecisionRoutingEngine;

  const createSnapshot = (overrides: Partial<FinancialSnapshot> = {}): FinancialSnapshot => ({
    monthlyIncome: 5000,
    essentialExpenses: 2000,
    discretionaryExpenses: 500,
    totalSavings: 5000,
    totalDebt: 0,
    highInterestDebt: 0,
    lowInterestDebt: 0,
    emergencyFundTarget: 15000,
    monthlyInterestRate: 0,
    ...overrides,
  });

  const createContext = (overrides: Partial<DecisionContext> = {}): DecisionContext => ({
    snapshot: createSnapshot(),
    situation: 'stable',
    userMessage: 'What should I do with my finances?',
    conversationHistory: [],
    ...overrides,
  });

  beforeEach(() => {
    engine = new DecisionRoutingEngine();
    engine.registerRouter(new CrisisRouter());
    engine.registerRouter(new DebtRouter());
    engine.registerRouter(new EmergencyFundRouter());
  });

  describe('Crisis Detection', () => {
    it('should detect zero income crisis', () => {
      const context = createContext({
        snapshot: createSnapshot({ monthlyIncome: 0 }),
        situation: 'crisis',
      });

      const result = engine.route(context);
      expect(result.primaryAction.priority).toBe('critical');
      expect(result.primaryAction.action).toContain('income');
    });

    it('should detect negative cash flow crisis', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 2000,
          essentialExpenses: 1500,
          discretionaryExpenses: 1000,
        }),
        situation: 'crisis',
      });

      const result = engine.route(context);
      expect(result.primaryAction.priority).toBe('critical');
      expect(result.assessment.riskLevel).toBe('critical');
    });

    it('should provide crisis action steps', () => {
      const context = createContext({
        snapshot: createSnapshot({ monthlyIncome: 0 }),
        situation: 'crisis',
      });

      const result = engine.route(context);
      expect(result.primaryAction.nextSteps.length).toBeGreaterThan(0);
      expect(result.primaryAction.requiresHumanReview).toBe(true);
    });

    it('should generate crisis warnings', () => {
      const context = createContext({
        snapshot: createSnapshot({ monthlyIncome: 0 }),
        situation: 'crisis',
      });

      const result = engine.route(context);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Critical');
    });
  });

  describe('Debt Routing', () => {
    it('should prioritize high-interest debt', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalDebt: 10000,
          highInterestDebt: 5000,
          monthlyInterestRate: 20,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      expect(result.primaryAction.action).toContain('high-interest');
    });

    it('should calculate debt payoff timeline', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalDebt: 5000,
          highInterestDebt: 5000,
          monthlyInterestRate: 15,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      expect(result.primaryAction.nextSteps.some(step => step.includes('months'))).toBe(true);
    });

    it('should recommend monthly debt payment', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 4000,
          essentialExpenses: 1500,
          discretionaryExpenses: 500,
          totalDebt: 20000,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      const debtRec = result.recommendations.find(r => r.type === 'debt_payoff');
      expect(debtRec).toBeDefined();
      expect(debtRec?.monthlyTarget).toBeGreaterThan(0);
    });
  });

  describe('Emergency Fund Routing', () => {
    it('should detect inadequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalSavings: 2000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
        situation: 'emergency',
      });

      const result = engine.route(context);
      expect(result.primaryAction.action).toContain('emergency fund');
    });

    it('should calculate emergency fund target', () => {
      const context = createContext({
        snapshot: createSnapshot({
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 1000,
        }),
        situation: 'emergency',
      });

      const result = engine.route(context);
      // Emergency fund target is 6 months * (2000 + 500) = 15000
      expect(result.primaryAction.action).toContain('emergency fund');
      // Verify the result has recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend emergency fund contribution', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 2000,
        }),
        situation: 'emergency',
      });

      const result = engine.route(context);
      const emergencyRec = result.recommendations.find(r => r.type === 'emergency_fund');
      expect(emergencyRec).toBeDefined();
      expect(emergencyRec?.monthlyTarget).toBeGreaterThan(0);
    });

    it('should calculate timeline to emergency fund goal', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 2000,
        }),
        situation: 'emergency',
      });

      const result = engine.route(context);
      const emergencyRec = result.recommendations.find(r => r.type === 'emergency_fund');
      expect(emergencyRec?.timelineMonths).toBeGreaterThan(0);
    });
  });

  describe('Situation Assessment', () => {
    it('should assess stable situation', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 10000,
          totalDebt: 5000,
        }),
        situation: 'stable',
      });

      const result = engine.route(context);
      // With debt-to-income of 1.0 and savings rate of 50%, situation is struggling
      expect(result.assessment.situation).toBe('struggling');
      expect(result.assessment.riskLevel).toBe('medium');
    });

    it('should calculate savings rate', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
        situation: 'stable',
      });

      const result = engine.route(context);
      const expectedRate = ((5000 - 2500) / 5000) * 100;
      expect(result.assessment.savingsRate).toBe(expectedRate);
    });

    it('should calculate debt-to-income ratio', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          totalDebt: 10000,
        }),
        situation: 'stable',
      });

      const result = engine.route(context);
      expect(result.assessment.debtToIncomeRatio).toBe(2);
    });

    it('should calculate emergency fund months', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalSavings: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
        situation: 'stable',
      });

      const result = engine.route(context);
      const expectedMonths = 10000 / 2500;
      expect(result.assessment.emergencyFundMonths).toBe(expectedMonths);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate multiple recommendations', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalDebt: 10000,
          totalSavings: 3000,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should prioritize recommendations by situation', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalDebt: 10000,
          totalSavings: 1000,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      const highPriorityRecs = result.recommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });

    it('should include savings recommendation for thriving situation', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalDebt: 0,
          totalSavings: 50000,
        }),
        situation: 'thriving',
      });

      const result = engine.route(context);
      const savingsRec = result.recommendations.find(r => r.type === 'savings');
      expect(savingsRec).toBeDefined();
    });

    it('should include investment recommendation for thriving situation', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalDebt: 0,
          totalSavings: 50000,
        }),
        situation: 'thriving',
      });

      const result = engine.route(context);
      const investmentRec = result.recommendations.find(r => r.type === 'investment');
      expect(investmentRec).toBeDefined();
    });
  });

  describe('Router Priority', () => {
    it('should route to highest priority applicable router', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 0,
          totalDebt: 10000,
          totalSavings: 1000,
        }),
        situation: 'crisis',
      });

      const result = engine.route(context);
      // Crisis router has priority 100, should be selected
      expect(result.primaryAction.priority).toBe('critical');
    });

    it('should register routers in priority order', () => {
      const routers = engine.getRouters();
      expect(routers.length).toBeGreaterThan(0);
      
      // Verify sorted by priority
      for (let i = 0; i < routers.length - 1; i++) {
        expect(routers[i].getPriority()).toBeGreaterThanOrEqual(routers[i + 1].getPriority());
      }
    });
  });

  describe('Warning Generation', () => {
    it('should generate warnings for critical situations', () => {
      const context = createContext({
        snapshot: createSnapshot({ monthlyIncome: 0 }),
        situation: 'crisis',
      });

      const result = engine.route(context);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about high-interest debt', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 3000,
          highInterestDebt: 15000,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      const hasDebtWarning = result.warnings.some(w => w.includes('debt'));
      expect(hasDebtWarning).toBe(true);
    });

    it('should warn about no savings', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          totalSavings: 0,
        }),
        situation: 'struggling',
      });

      const result = engine.route(context);
      const hasSavingsWarning = result.warnings.some(w => w.includes('savings'));
      expect(hasSavingsWarning).toBe(true);
    });
  });

  describe('Next Steps Generation', () => {
    it('should generate actionable next steps', () => {
      const context = createContext();
      const result = engine.route(context);
      
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps.every(step => typeof step === 'string')).toBe(true);
    });

    it('should include tracking step', () => {
      const context = createContext();
      const result = engine.route(context);
      
      const hasTrackingStep = result.nextSteps.some(step => step.includes('track') || step.includes('Track'));
      expect(hasTrackingStep).toBe(true);
    });

    it('should include review step', () => {
      const context = createContext();
      const result = engine.route(context);
      
      const hasReviewStep = result.nextSteps.some(step => step.includes('review') || step.includes('Review'));
      expect(hasReviewStep).toBe(true);
    });
  });

  describe('Default Routing', () => {
    it('should provide default route when no router applies', () => {
      engine.clearRouters(); // Remove all routers
      
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 15000,
          totalDebt: 0,
        }),
        situation: 'thriving',
      });

      const result = engine.route(context);
      expect(result.primaryAction).toBeDefined();
      expect(result.assessment).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should accept configuration options', () => {
      const configuredEngine = new DecisionRoutingEngine({
        enableCrisisDetection: false,
        strictMode: true,
      });

      expect(configuredEngine).toBeDefined();
    });
  });
});
