/**
 * RESPONSE TEMPLATING ENGINE TESTS
 * 
 * Comprehensive tests for response templating system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseTemplatingEngine } from '../responseTemplatingEngine';
import { FinancialAdviceTemplate } from '../templates/financialAdviceTemplate';
import { ActionPlanTemplate } from '../templates/actionPlanTemplate';
import type {
  StandardResponse,
  FinancialAdviceResponse,
  ActionPlanResponse,
} from '../types';

describe('Response Templating Engine', () => {
  let engine: ResponseTemplatingEngine;

  beforeEach(() => {
    engine = new ResponseTemplatingEngine();
    engine.registerTemplate(new FinancialAdviceTemplate());
    engine.registerTemplate(new ActionPlanTemplate());
  });

  describe('Template Registration', () => {
    it('should register templates', () => {
      expect(engine.getTemplates().length).toBe(2);
    });

    it('should clear templates', () => {
      engine.clearTemplates();
      expect(engine.getTemplates().length).toBe(0);
    });

    it('should retrieve registered templates', () => {
      const templates = engine.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].getName()).toBeDefined();
    });
  });

  describe('Financial Advice Response Formatting', () => {
    it('should format financial advice response', () => {
      const response: FinancialAdviceResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Emergency Fund Strategy',
        content: 'Build a 6-month emergency fund',
        currentSituation: 'You have $2,000 in savings',
        recommendation: 'Save $500 monthly for 18 months',
        reasoning: 'This provides financial security',
        expectedOutcome: '$9,000 emergency fund',
        timeframe: '18 months',
        actionItems: ['Open savings account', 'Set up automatic transfer'],
        nextSteps: ['Review progress monthly'],
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Emergency Fund Strategy');
      expect(formatted.text).toContain('Current Situation');
      expect(formatted.text).toContain('Recommendation');
      expect(formatted.type).toBe('financial_advice');
    });

    it('should include action items in formatted response', () => {
      const response: FinancialAdviceResponse = {
        type: 'financial_advice',
        severity: 'medium',
        title: 'Debt Payoff Plan',
        content: 'Create a debt payoff strategy',
        currentSituation: 'You have $10,000 in debt',
        recommendation: 'Pay $300 monthly',
        reasoning: 'Eliminates debt in 33 months',
        expectedOutcome: 'Debt-free status',
        actionItems: ['List all debts', 'Calculate payoff timeline'],
        nextSteps: ['Start payments'],
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Action Items');
      expect(formatted.text).toContain('List all debts');
      expect(formatted.text).toContain('Calculate payoff timeline');
    });

    it('should include next steps in formatted response', () => {
      const response: FinancialAdviceResponse = {
        type: 'financial_advice',
        severity: 'low',
        title: 'Investment Strategy',
        content: 'Start investing for retirement',
        currentSituation: 'You have $50,000 saved',
        recommendation: 'Invest in diversified portfolio',
        reasoning: 'Long-term wealth building',
        expectedOutcome: 'Retirement security',
        nextSteps: ['Open investment account', 'Choose funds', 'Set up auto-invest'],
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Next Steps');
      expect(formatted.text).toContain('Open investment account');
    });

    it('should include metadata in formatted response', () => {
      const response: FinancialAdviceResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Crisis Response',
        content: 'Immediate action required',
        currentSituation: 'Zero income',
        recommendation: 'Seek emergency assistance',
        reasoning: 'Critical situation',
        expectedOutcome: 'Stabilized income',
        metadata: { customField: 'customValue' },
      };

      const formatted = engine.format(response);

      expect(formatted.metadata).toBeDefined();
      expect(formatted.metadata.type).toBe('financial_advice');
      expect(formatted.metadata.severity).toBe('high');
      expect(formatted.metadata.customField).toBe('customValue');
    });
  });

  describe('Action Plan Response Formatting', () => {
    it('should format action plan response', () => {
      const response: ActionPlanResponse = {
        type: 'action_plan',
        severity: 'high',
        title: 'Emergency Fund Building Plan',
        content: 'Step-by-step plan to build emergency fund',
        goal: 'Build $15,000 emergency fund',
        timeline: '18 months',
        steps: [
          {
            order: 1,
            action: 'Open high-yield savings account',
            duration: '1 week',
            success_criteria: 'Account opened with 4%+ APY',
          },
          {
            order: 2,
            action: 'Set up automatic transfers',
            duration: '1 week',
            success_criteria: '$500 transfers scheduled',
          },
        ],
        checkpoints: ['3 months: $1,500 saved', '6 months: $3,000 saved'],
        actionItems: ['Research banks', 'Compare rates'],
        nextSteps: ['Open account today'],
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Emergency Fund Building Plan');
      expect(formatted.text).toContain('Goal:');
      expect(formatted.text).toContain('Action Steps');
      expect(formatted.text).toContain('Checkpoints');
      expect(formatted.type).toBe('action_plan');
    });

    it('should include steps with details', () => {
      const response: ActionPlanResponse = {
        type: 'action_plan',
        severity: 'medium',
        title: 'Debt Payoff Action Plan',
        content: 'Detailed steps to pay off debt',
        goal: 'Pay off $10,000 debt',
        timeline: '33 months',
        steps: [
          {
            order: 1,
            action: 'List all debts',
            duration: '1 day',
            success_criteria: 'Complete list with interest rates',
          },
        ],
        checkpoints: [],
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('List all debts');
      expect(formatted.text).toContain('Duration:');
      expect(formatted.text).toContain('Success Criteria:');
    });
  });

  describe('Response Validation', () => {
    it('should validate response structure', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Valid Response',
        content: 'This is valid content',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing type', () => {
      const response: any = {
        severity: 'high',
        title: 'Missing Type',
        content: 'Content here',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Response type is required');
    });

    it('should detect missing severity', () => {
      const response: any = {
        type: 'financial_advice',
        title: 'Missing Severity',
        content: 'Content here',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Response severity is required');
    });

    it('should detect missing title', () => {
      const response: any = {
        type: 'financial_advice',
        severity: 'high',
        content: 'Content here',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Response title is required');
    });

    it('should detect missing content', () => {
      const response: any = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Valid Title',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Response content is required');
    });

    it('should detect empty title', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: '   ',
        content: 'Content here',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Response title is required');
    });

    it('should detect empty content', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Valid Title',
        content: '   ',
      };

      const validation = engine.validateResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Response content is required');
    });
  });

  describe('Default Response Formatting', () => {
    it('should format unknown response type with default template', () => {
      const response: StandardResponse = {
        type: 'question_answer' as any,
        severity: 'info',
        title: 'Question Answer',
        content: 'This is the answer',
        actionItems: ['Action 1', 'Action 2'],
        nextSteps: ['Step 1'],
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Question Answer');
      expect(formatted.text).toContain('This is the answer');
      expect(formatted.text).toContain('Action Items');
      expect(formatted.text).toContain('Next Steps');
    });

    it('should handle missing optional fields gracefully', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'low',
        title: 'Simple Response',
        content: 'Simple content',
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Simple Response');
      expect(formatted.text).toContain('Simple content');
      expect(formatted.metadata).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should get default configuration', () => {
      const config = engine.getDefaultConfig();

      expect(config.includeMetadata).toBe(true);
      expect(config.includeNextSteps).toBe(true);
      expect(config.formatAsMarkdown).toBe(false);
    });

    it('should set default configuration', () => {
      engine.setDefaultConfig({
        includeNextSteps: false,
        formatAsMarkdown: true,
      });

      const config = engine.getDefaultConfig();

      expect(config.includeNextSteps).toBe(false);
      expect(config.formatAsMarkdown).toBe(true);
      expect(config.includeMetadata).toBe(true); // Should preserve other settings
    });

    it('should use custom configuration for formatting', () => {
      const response: FinancialAdviceResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Test Response',
        content: 'Test content',
        currentSituation: 'Situation',
        recommendation: 'Recommendation',
        reasoning: 'Reasoning',
        expectedOutcome: 'Outcome',
        nextSteps: ['Step 1', 'Step 2'],
      };

      const formatted = engine.format(response, {
        includeNextSteps: false,
      });

      // Should not include next steps
      expect(formatted.text).not.toContain('Next Steps');
    });
  });

  describe('Severity Levels', () => {
    it('should handle critical severity', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'critical',
        title: 'Critical Issue',
        content: 'Immediate action required',
      };

      const formatted = engine.format(response);

      expect(formatted.metadata.severity).toBe('critical');
      expect(formatted.text).toContain('Critical Issue');
    });

    it('should handle all severity levels', () => {
      const severities = ['critical', 'high', 'medium', 'low', 'info'];

      severities.forEach(severity => {
        const response: StandardResponse = {
          type: 'financial_advice',
          severity: severity as any,
          title: `${severity} Response`,
          content: 'Content',
        };

        const formatted = engine.format(response);

        expect(formatted.metadata.severity).toBe(severity);
      });
    });
  });

  describe('Response Types', () => {
    it('should handle financial_advice type', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'high',
        title: 'Advice',
        content: 'Content',
      };

      const formatted = engine.format(response);

      expect(formatted.type).toBe('financial_advice');
    });

    it('should handle action_plan type', () => {
      const response: StandardResponse = {
        type: 'action_plan',
        severity: 'high',
        title: 'Plan',
        content: 'Content',
      };

      const formatted = engine.format(response);

      expect(formatted.type).toBe('action_plan');
    });

    it('should handle all response types', () => {
      const types = [
        'financial_advice',
        'goal_recommendation',
        'crisis_response',
        'action_plan',
        'progress_update',
        'question_answer',
        'error_response',
      ];

      types.forEach(type => {
        const response: StandardResponse = {
          type: type as any,
          severity: 'info',
          title: `${type} Response`,
          content: 'Content',
        };

        const formatted = engine.format(response);

        expect(formatted.type).toBe(type);
      });
    });
  });

  describe('Metadata Handling', () => {
    it('should include timestamp in metadata', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'low',
        title: 'Response',
        content: 'Content',
      };

      const formatted = engine.format(response);

      expect(formatted.metadata.timestamp).toBeDefined();
      expect(new Date(formatted.metadata.timestamp)).toBeInstanceOf(Date);
    });

    it('should preserve custom metadata', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'low',
        title: 'Response',
        content: 'Content',
        metadata: {
          userId: '123',
          sessionId: 'abc',
          customField: 'value',
        },
      };

      const formatted = engine.format(response);

      expect(formatted.metadata.userId).toBe('123');
      expect(formatted.metadata.sessionId).toBe('abc');
      expect(formatted.metadata.customField).toBe('value');
    });
  });

  describe('Text Formatting', () => {
    it('should format text with proper structure', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'low',
        title: 'Response',
        content: 'Content with details',
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Response');
      expect(formatted.text).toContain('Content with details');
    });

    it('should handle multiline content', () => {
      const response: StandardResponse = {
        type: 'financial_advice',
        severity: 'low',
        title: 'Response',
        content: 'Line 1\nLine 2\nLine 3',
      };

      const formatted = engine.format(response);

      expect(formatted.text).toContain('Line 1');
      expect(formatted.text).toContain('Line 2');
      expect(formatted.text).toContain('Line 3');
    });
  });
});
