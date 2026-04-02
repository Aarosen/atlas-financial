/**
 * PROGRESS UPDATE RESPONSE TEMPLATE
 * 
 * Template for formatting progress update responses
 */

import { BaseTemplate } from '../baseTemplate';
import type {
  ProgressUpdateResponse,
  StandardResponse,
  FormattedResponse,
  TemplateConfig,
} from '../types';

export class ProgressUpdateTemplate extends BaseTemplate {
  constructor() {
    super('ProgressUpdateTemplate', ['progress_update']);
  }

  format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse {
    const progressResponse = response as ProgressUpdateResponse;
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

    // Add metric
    if (progressResponse.metric) {
      text += `Metric: ${progressResponse.metric}\n`;
    }

    // Add progress bar
    const progressBar = this.buildProgressBar(progressResponse.progressPercent);
    text += `Progress: ${progressBar} ${this.formatPercentage(progressResponse.progressPercent)}\n\n`;

    // Add current vs target
    text += `Current: ${progressResponse.currentValue}\n`;
    text += `Target: ${progressResponse.targetValue}\n`;
    text += `Remaining: ${progressResponse.targetValue - progressResponse.currentValue}\n\n`;

    // Add trend
    const trendEmoji = this.getTrendEmoji(progressResponse.trend);
    text += `Trend: ${trendEmoji} ${progressResponse.trend.charAt(0).toUpperCase() + progressResponse.trend.slice(1)}\n\n`;

    // Add insights
    if (progressResponse.insights && progressResponse.insights.length > 0) {
      text += 'Key Insights:\n';
      progressResponse.insights.forEach((insight, index) => {
        text += `${index + 1}. ${insight}\n`;
      });
      text += '\n';
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

  /**
   * Build progress bar visualization
   */
  private buildProgressBar(percent: number): string {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * Get trend emoji
   */
  private getTrendEmoji(trend: string): string {
    const emojis: Record<string, string> = {
      improving: '📈',
      stable: '➡️',
      declining: '📉',
    };
    return emojis[trend] || '➡️';
  }
}
