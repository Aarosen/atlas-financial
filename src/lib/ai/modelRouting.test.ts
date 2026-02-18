import { describe, expect, it } from 'vitest';
import { inferModelTier } from './modelRouting';

describe('model routing', () => {
  it('routes extract to light', () => {
    expect(inferModelTier({ type: 'extract' })).toBe('light');
  });

  it('routes explain answers to premium', () => {
    expect(inferModelTier({ type: 'answer_explain' })).toBe('premium');
    expect(inferModelTier({ type: 'answer_explain_stream' })).toBe('premium');
  });

  it('routes analytical queries to premium', () => {
    const tier = inferModelTier({ type: 'chat', question: 'Explain APR vs APY and ROI' });
    expect(tier).toBe('premium');
  });

  it('routes short basic questions to light', () => {
    const tier = inferModelTier({ type: 'chat', question: 'What is a budget?' });
    expect(tier).toBe('light');
  });
});
