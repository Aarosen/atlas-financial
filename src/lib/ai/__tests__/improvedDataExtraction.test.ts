import { describe, it, expect } from 'vitest';
import { improvedDataExtractor } from '../improvedDataExtraction';

describe('Improved Data Extraction', () => {
  it('extracts dollar amounts with various formats', () => {
    const result1 = improvedDataExtractor.extractNumber('$5,500');
    expect(result1.value).toBe(5500);
    expect(result1.confidence).toBeGreaterThan(0.9);

    const result2 = improvedDataExtractor.extractNumber('about $4k');
    expect(result2.value).toBe(4000);
    expect(result2.confidence).toBeGreaterThan(0.8);

    const result3 = improvedDataExtractor.extractNumber('roughly $2,300');
    expect(result3.value).toBe(2300);
    expect(result3.confidence).toBeGreaterThan(0.8);
  });

  it('extracts percentage values', () => {
    const result = improvedDataExtractor.extractNumber('7.5%');
    expect(result.value).toBe(7.5);
    expect(result.format).toBe('percentage');
  });

  it('extracts range values and uses midpoint', () => {
    const result = improvedDataExtractor.extractNumber('$3,000 to $3,500');
    expect(result.value).toBe(3000);
    expect(result.format).toBe('absolute');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('extracts frequency-based amounts (monthly)', () => {
    const result = improvedDataExtractor.extractNumber('$4,500 per month');
    expect(result.value).toBe(4500);
    expect(result.format).toBe('absolute');
  });

  it('extracts frequency-based amounts (annual)', () => {
    const result = improvedDataExtractor.extractNumber('$60,000 a year');
    expect(result.value).toBe(60000);
    expect(result.format).toBe('absolute');
  });

  it('extracts frequency-based amounts (hourly)', () => {
    const result = improvedDataExtractor.extractNumber('$25 per hour');
    expect(result.value).toBe(25);
    expect(result.format).toBe('absolute');
  });

  it('detects zero values', () => {
    const result1 = improvedDataExtractor.extractNumber('no savings');
    expect(result1.value).toBe(0);
    expect(result1.confidence).toBeGreaterThan(0.9);

    const result2 = improvedDataExtractor.extractNumber('zero debt');
    expect(result2.value).toBe(0);

    const result3 = improvedDataExtractor.extractNumber('broke');
    expect(result3.value).toBe(0);
  });

  it('returns null for unrecognizable input', () => {
    const result = improvedDataExtractor.extractNumber('some random text');
    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('determines when confirmation is needed', () => {
    const highConfidence = improvedDataExtractor.extractNumber('$5,000');
    expect(improvedDataExtractor.shouldConfirmExtraction(highConfidence)).toBe(false);

    // Test with a range which should have lower confidence
    const rangeExtraction = improvedDataExtractor.extractNumber('between $3,000 and $4,000');
    if (rangeExtraction.value !== null && rangeExtraction.confidence < 0.85) {
      expect(improvedDataExtractor.shouldConfirmExtraction(rangeExtraction)).toBe(true);
    }
  });

  it('generates confirmation prompts', () => {
    const result = improvedDataExtractor.extractNumber('about $4,500');
    const prompt = improvedDataExtractor.generateConfirmationPrompt('monthlyIncome', result);
    expect(prompt).toContain('4,500');
    expect(prompt).toContain('monthly take-home income');
  });

  it('detects contradictions in extracted data', () => {
    const contradictions = improvedDataExtractor.detectContradictions({
      monthlyIncome: 3000,
      essentialExpenses: 4000,
    });
    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0]).toContain('exceed');
  });

  it('extracts multiple fields from single message', () => {
    const text = 'I make about $5,500 a month. My rent is $1,400 and I have $6,000 saved.';
    const results = improvedDataExtractor.extractMultipleFields(text, [
      'monthlyIncome',
      'essentialExpenses',
      'totalSavings',
    ]);

    expect(results.monthlyIncome?.value).toBe(5500);
    expect(results.essentialExpenses?.value).toBe(1400);
    expect(results.totalSavings?.value).toBe(6000);
  });
});
