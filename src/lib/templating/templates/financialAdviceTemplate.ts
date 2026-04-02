/**
 * FINANCIAL ADVICE RESPONSE TEMPLATE
 * 
 * Template for formatting financial advice responses
 */

import { BaseTemplate } from '../baseTemplate';
import type {
  FinancialAdviceResponse,
  StandardResponse,
  FormattedResponse,
  TemplateConfig,
} from '../types';

export class FinancialAdviceTemplate extends BaseTemplate {
  constructor() {
    super('FinancialAdviceTemplate', ['financial_advice']);
  }

  format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse {
    const adviceResponse = response as FinancialAdviceResponse;
    const mergedConfig: TemplateConfig = {
      includeMetadata: true,
      includeNextSteps: true,
      formatAsMarkdown: false,
      ...config,
    };

    // Validate response
    const validation = this.validate(response);
    if (!validation.valid) {
      throw new Error(`Invalid response: ${validation.errors.join(', ')}`);
    }

    // Build formatted text
    let text = '';

    // Add severity badge and title
    text += `${this.getSeverityBadge(response.severity)} ${response.title}\n`;
    text += '='.repeat(response.title.length + 2) + '\n\n';

    // Add current situation
    if (adviceResponse.currentSituation) {
      text += `Current Situation:\n${adviceResponse.currentSituation}\n\n`;
    }

    // Add recommendation
    if (adviceResponse.recommendation) {
      text += `Recommendation:\n${adviceResponse.recommendation}\n\n`;
    }

    // Add reasoning
    if (adviceResponse.reasoning) {
      text += `Why This Works:\n${adviceResponse.reasoning}\n\n`;
    }

    // Add expected outcome
    if (adviceResponse.expectedOutcome) {
      text += `Expected Outcome:\n${adviceResponse.expectedOutcome}\n\n`;
    }

    // Add timeframe if provided
    if (adviceResponse.timeframe) {
      text += `Timeline: ${adviceResponse.timeframe}\n\n`;
    }

    // Add action items
    if (response.actionItems && response.actionItems.length > 0) {
      text += 'Action Items:\n';
      text += this.formatActionItems(response.actionItems) + '\n\n';
    }

    // Add next steps
    if (mergedConfig.includeNextSteps && response.nextSteps && response.nextSteps.length > 0) {
      text += this.formatNextSteps(response.nextSteps) + '\n\n';
    }

    // Add main content
    if (response.content) {
      text += `Details:\n${this.formatText(response.content)}\n`;
    }

    return {
      text: this.formatText(text),
      metadata: this.buildMetadata(response, mergedConfig),
      type: response.type,
    };
  }
}
