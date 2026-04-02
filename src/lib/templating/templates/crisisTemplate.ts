/**
 * CRISIS RESPONSE TEMPLATE
 * 
 * Template for formatting crisis response messages
 */

import { BaseTemplate } from '../baseTemplate';
import type {
  CrisisResponse,
  StandardResponse,
  FormattedResponse,
  TemplateConfig,
} from '../types';

export class CrisisTemplate extends BaseTemplate {
  constructor() {
    super('CrisisTemplate', ['crisis_response']);
  }

  format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse {
    const crisisResponse = response as CrisisResponse;
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

    // Add severity badge and title with emphasis
    text += `${this.getSeverityBadge(response.severity)} ${response.title}\n`;
    text += '!'.repeat(response.title.length + 2) + '\n\n';

    // Add crisis type
    if (crisisResponse.crisisType) {
      text += `Crisis Type: ${crisisResponse.crisisType}\n\n`;
    }

    // Add immediate actions with emphasis
    if (crisisResponse.immediateActions && crisisResponse.immediateActions.length > 0) {
      text += 'IMMEDIATE ACTIONS REQUIRED:\n';
      crisisResponse.immediateActions.forEach((action, index) => {
        text += `${index + 1}. ${action}\n`;
      });
      text += '\n';
    }

    // Add resources
    if (crisisResponse.resources && crisisResponse.resources.length > 0) {
      text += 'Available Resources:\n';
      crisisResponse.resources.forEach(resource => {
        text += `\n${resource.name}\n`;
        text += `Contact: ${resource.contact}\n`;
        text += `${resource.description}\n`;
      });
      text += '\n';
    }

    // Add escalation notice if required
    if (crisisResponse.escalationRequired) {
      text += 'ESCALATION REQUIRED: This situation requires immediate professional assistance.\n\n';
    }

    // Add main content
    if (response.content) {
      text += `Details:\n${this.formatText(response.content)}\n\n`;
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

    return {
      text: this.formatText(text),
      metadata: this.buildMetadata(response, mergedConfig),
      type: response.type,
    };
  }
}
