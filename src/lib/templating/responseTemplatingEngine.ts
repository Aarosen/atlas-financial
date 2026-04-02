/**
 * RESPONSE TEMPLATING ENGINE
 * 
 * Orchestrates response templates to standardize output across all LLM providers
 */

import type {
  IResponseTemplate,
  StandardResponse,
  FormattedResponse,
  ResponseType,
  TemplateConfig,
} from './types';

export class ResponseTemplatingEngine {
  private templates: IResponseTemplate[] = [];
  private defaultConfig: TemplateConfig = {
    includeMetadata: true,
    includeNextSteps: true,
    formatAsMarkdown: false,
  };

  /**
   * Register a response template
   */
  registerTemplate(template: IResponseTemplate): void {
    this.templates.push(template);
  }

  /**
   * Format a response using appropriate template
   */
  format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse {
    // Find template that can handle this response type
    const template = this.templates.find(t => t.canHandle(response.type));

    if (!template) {
      return this.formatDefault(response, config);
    }

    // Merge configs
    const mergedConfig = { ...this.defaultConfig, ...config };

    try {
      return template.format(response, mergedConfig);
    } catch (error) {
      // Fall back to default formatting if template fails
      console.error(`Template formatting failed for type ${response.type}:`, error);
      return this.formatDefault(response, config);
    }
  }

  /**
   * Format response with default template
   */
  private formatDefault(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse {
    const mergedConfig = { ...this.defaultConfig, ...config };

    let text = '';

    // Add title
    text += `${response.title}\n`;
    text += '='.repeat(response.title.length) + '\n\n';

    // Add content
    text += `${response.content}\n\n`;

    // Add action items
    if (response.actionItems && response.actionItems.length > 0) {
      text += 'Action Items:\n';
      response.actionItems.forEach((item, index) => {
        text += `${index + 1}. ${item}\n`;
      });
      text += '\n';
    }

    // Add next steps
    if (mergedConfig.includeNextSteps && response.nextSteps && response.nextSteps.length > 0) {
      text += 'Next Steps:\n';
      response.nextSteps.forEach((step, index) => {
        text += `${index + 1}. ${step}\n`;
      });
    }

    return {
      text: text.trim(),
      metadata: {
        type: response.type,
        severity: response.severity,
        timestamp: new Date().toISOString(),
        ...response.metadata,
      },
      type: response.type,
    };
  }

  /**
   * Validate response before formatting
   */
  validateResponse(response: StandardResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!response.type) {
      errors.push('Response type is required');
    }

    if (!response.severity) {
      errors.push('Response severity is required');
    }

    if (!response.title || response.title.trim().length === 0) {
      errors.push('Response title is required');
    }

    if (!response.content || response.content.trim().length === 0) {
      errors.push('Response content is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all registered templates
   */
  getTemplates(): IResponseTemplate[] {
    return this.templates;
  }

  /**
   * Clear all templates
   */
  clearTemplates(): void {
    this.templates = [];
  }

  /**
   * Set default configuration
   */
  setDefaultConfig(config: Partial<TemplateConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): TemplateConfig {
    return this.defaultConfig;
  }
}
