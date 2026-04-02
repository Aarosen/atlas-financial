/**
 * ACTION PLAN RESPONSE TEMPLATE
 * 
 * Template for formatting action plan responses
 */

import { BaseTemplate } from '../baseTemplate';
import type {
  ActionPlanResponse,
  StandardResponse,
  FormattedResponse,
  TemplateConfig,
} from '../types';

export class ActionPlanTemplate extends BaseTemplate {
  constructor() {
    super('ActionPlanTemplate', ['action_plan']);
  }

  format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse {
    const planResponse = response as ActionPlanResponse;
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

    let text = '';

    // Add title
    text += `${this.getSeverityBadge(response.severity)} ${response.title}\n`;
    text += '='.repeat(response.title.length + 2) + '\n\n';

    // Add goal
    if (planResponse.goal) {
      text += `Goal: ${planResponse.goal}\n`;
    }

    // Add timeline
    if (planResponse.timeline) {
      text += `Timeline: ${planResponse.timeline}\n\n`;
    }

    // Add steps
    if (planResponse.steps && planResponse.steps.length > 0) {
      text += 'Action Steps:\n';
      planResponse.steps.forEach(step => {
        text += `\n${step.order}. ${step.action}\n`;
        text += `   Duration: ${step.duration}\n`;
        text += `   Success Criteria: ${step.success_criteria}\n`;
      });
      text += '\n';
    }

    // Add checkpoints
    if (planResponse.checkpoints && planResponse.checkpoints.length > 0) {
      text += 'Checkpoints:\n';
      planResponse.checkpoints.forEach((checkpoint, index) => {
        text += `${index + 1}. ${checkpoint}\n`;
      });
      text += '\n';
    }

    // Add action items
    if (response.actionItems && response.actionItems.length > 0) {
      text += 'Immediate Actions:\n';
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
