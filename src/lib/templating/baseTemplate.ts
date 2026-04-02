/**
 * BASE RESPONSE TEMPLATE
 * 
 * Abstract base class for all response templates
 * Provides common functionality for formatting and validation
 */

import type {
  IResponseTemplate,
  StandardResponse,
  FormattedResponse,
  ResponseType,
  TemplateConfig,
} from './types';

export abstract class BaseTemplate implements IResponseTemplate {
  protected name: string;
  protected supportedTypes: ResponseType[];

  constructor(name: string, supportedTypes: ResponseType[]) {
    this.name = name;
    this.supportedTypes = supportedTypes;
  }

  getName(): string {
    return this.name;
  }

  canHandle(type: ResponseType): boolean {
    return this.supportedTypes.includes(type);
  }

  abstract format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse;

  /**
   * Validate response structure
   */
  validate(response: StandardResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!response.type) {
      errors.push('Response type is required');
    }

    if (!response.severity) {
      errors.push('Response severity is required');
    }

    if (!response.title || response.title.trim().length === 0) {
      errors.push('Response title is required and cannot be empty');
    }

    if (!response.content || response.content.trim().length === 0) {
      errors.push('Response content is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format text with proper spacing
   */
  protected formatText(text: string): string {
    return text
      .trim()
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\s+$/gm, '');
  }

  /**
   * Format action items as list
   */
  protected formatActionItems(items?: string[]): string {
    if (!items || items.length === 0) {
      return '';
    }

    return items
      .map((item, index) => `${index + 1}. ${item}`)
      .join('\n');
  }

  /**
   * Format next steps as list
   */
  protected formatNextSteps(steps?: string[]): string {
    if (!steps || steps.length === 0) {
      return '';
    }

    return 'Next Steps:\n' + steps
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n');
  }

  /**
   * Get severity badge
   */
  protected getSeverityBadge(severity: string): string {
    const badges: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
      info: 'ℹ️',
    };
    return badges[severity] || 'ℹ️';
  }

  /**
   * Format currency
   */
  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  protected formatPercentage(value: number): string {
    return `${Math.round(value * 100) / 100}%`;
  }

  /**
   * Format duration in months
   */
  protected formatDuration(months: number): string {
    if (months < 1) {
      return 'Less than 1 month';
    }
    if (months === 1) {
      return '1 month';
    }
    if (months < 12) {
      return `${Math.round(months)} months`;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
      return years === 1 ? '1 year' : `${years} years`;
    }

    return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }

  /**
   * Build metadata object
   */
  protected buildMetadata(response: StandardResponse, config?: Partial<TemplateConfig>): Record<string, any> {
    return {
      type: response.type,
      severity: response.severity,
      timestamp: new Date().toISOString(),
      ...response.metadata,
    };
  }
}
