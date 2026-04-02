/**
 * INDIVIDUAL ROUTER TESTS
 * 
 * Tests for specific decision routers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CrisisRouter } from '../routers/crisisRouter';
import { DebtRouter } from '../routers/debtRouter';
import { EmergencyFundRouter } from '../routers/emergencyFundRouter';
import { SavingsRouter } from '../routers/savingsRouter';
import { InvestmentRouter } from '../routers/investmentRouter';
import { RetirementRouter } from '../routers/retirementRouter';
import type { DecisionContext, FinancialSnapshot } from '../types';

describe('Individual Router Tests', () => {
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
    userMessage: 'What should I do?',
    conversationHistory: [],
    ...overrides,
  });

  describe('Crisis Router', () => {
    let router: CrisisRouter;

    beforeEach(() => {
      router = new CrisisRouter();
    });

    it('should have correct name and priority', () => {
      expect(router.getName()).toBe('CrisisRouter');
      expect(router.getPriority()).toBe(100);
    });

    it('should detect zero income', () => {
      const context = createContext({
        snapshot: createSnapshot({ monthlyIncome: 0 }),
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should detect negative cash flow', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 2000,
          essentialExpenses: 1500,
          discretionaryExpenses: 1000,
        }),
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should not handle positive cash flow', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
      });
      expect(router.canHandle(context)).toBe(false);
    });

    it('should route crisis decisions', () => {
      const context = createContext({
        snapshot: createSnapshot({ monthlyIncome: 0 }),
        situation: 'crisis',
      });
      const decision = router.route(context);
      expect(decision.priority).toBe('critical');
      expect(decision.requiresHumanReview).toBe(true);
    });
  });

  describe('Debt Router', () => {
    let router: DebtRouter;

    beforeEach(() => {
      router = new DebtRouter();
    });

    it('should have correct name and priority', () => {
      expect(router.getName()).toBe('DebtRouter');
      expect(router.getPriority()).toBe(90);
    });

    it('should handle high-interest debt', () => {
      const context = createContext({
        snapshot: createSnapshot({
          highInterestDebt: 5000,
          totalDebt: 5000,
        }),
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should handle high debt-to-income ratio', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 3000,
          totalDebt: 15000,
        }),
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should not handle zero debt', () => {
      const context = createContext({
        snapshot: createSnapshot({ totalDebt: 0 }),
      });
      expect(router.canHandle(context)).toBe(false);
    });

    it('should route debt decisions', () => {
      const context = createContext({
        snapshot: createSnapshot({
          highInterestDebt: 5000,
          totalDebt: 5000,
        }),
      });
      const decision = router.route(context);
      expect(decision.action).toContain('high-interest');
      expect(decision.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Emergency Fund Router', () => {
    let router: EmergencyFundRouter;

    beforeEach(() => {
      router = new EmergencyFundRouter();
    });

    it('should have correct name and priority', () => {
      expect(router.getName()).toBe('EmergencyFundRouter');
      expect(router.getPriority()).toBe(85);
    });

    it('should handle inadequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalSavings: 2000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should not handle adequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalSavings: 15000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
      });
      expect(router.canHandle(context)).toBe(false);
    });

    it('should route emergency fund decisions', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalSavings: 2000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
      });
      const decision = router.route(context);
      expect(decision.action).toContain('emergency fund');
      expect(decision.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Savings Router', () => {
    let router: SavingsRouter;

    beforeEach(() => {
      router = new SavingsRouter();
    });

    it('should have correct name and priority', () => {
      expect(router.getName()).toBe('SavingsRouter');
      expect(router.getPriority()).toBe(70);
    });

    it('should handle positive cash flow with adequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 15000,
          highInterestDebt: 0,
        }),
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should not handle inadequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          totalSavings: 2000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
      });
      expect(router.canHandle(context)).toBe(false);
    });

    it('should route savings decisions', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 15000,
          highInterestDebt: 0,
        }),
      });
      const decision = router.route(context);
      expect(decision.action).toContain('savings');
      expect(decision.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Investment Router', () => {
    let router: InvestmentRouter;

    beforeEach(() => {
      router = new InvestmentRouter();
    });

    it('should have correct name and priority', () => {
      expect(router.getName()).toBe('InvestmentRouter');
      expect(router.getPriority()).toBe(60);
    });

    it('should handle thriving situation with adequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 20000,
          highInterestDebt: 0,
        }),
        situation: 'thriving',
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should not handle inadequate emergency fund', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 5000,
        }),
        situation: 'thriving',
      });
      expect(router.canHandle(context)).toBe(false);
    });

    it('should route investment decisions', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
          totalSavings: 20000,
          highInterestDebt: 0,
        }),
        situation: 'thriving',
      });
      const decision = router.route(context);
      expect(decision.action).toContain('investing');
      expect(decision.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Retirement Router', () => {
    let router: RetirementRouter;

    beforeEach(() => {
      router = new RetirementRouter();
    });

    it('should have correct name and priority', () => {
      expect(router.getName()).toBe('RetirementRouter');
      expect(router.getPriority()).toBe(55);
    });

    it('should handle thriving situation', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
        situation: 'thriving',
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should handle retirement keywords', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
        userMessage: 'How should I plan for retirement?',
      });
      expect(router.canHandle(context)).toBe(true);
    });

    it('should route retirement decisions', () => {
      const context = createContext({
        snapshot: createSnapshot({
          monthlyIncome: 10000,
          essentialExpenses: 2000,
          discretionaryExpenses: 500,
        }),
        situation: 'thriving',
      });
      const decision = router.route(context);
      expect(decision.action).toContain('retirement');
      expect(decision.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Router Priority Ordering', () => {
    it('Crisis router should have highest priority', () => {
      const routers = [
        new CrisisRouter(),
        new DebtRouter(),
        new EmergencyFundRouter(),
        new SavingsRouter(),
        new InvestmentRouter(),
        new RetirementRouter(),
      ];

      const priorities = routers.map(r => r.getPriority());
      expect(priorities[0]).toBe(100); // Crisis
      expect(priorities[1]).toBe(90);  // Debt
      expect(priorities[2]).toBe(85);  // Emergency Fund
    });

    it('Retirement router should have lowest priority', () => {
      const routers = [
        new CrisisRouter(),
        new DebtRouter(),
        new EmergencyFundRouter(),
        new SavingsRouter(),
        new InvestmentRouter(),
        new RetirementRouter(),
      ];

      const priorities = routers.map(r => r.getPriority());
      expect(priorities[priorities.length - 1]).toBe(55); // Retirement
    });
  });
});
