import { describe, expect, it } from 'vitest';
import { getPlaybookResponse } from './playbooks';

describe('playbooks', () => {
  it('returns emergency fund playbook', () => {
    const pb = getPlaybookResponse('What is an emergency fund?');
    expect(pb?.title.toLowerCase()).toContain('emergency');
  });

  it('returns APR playbook', () => {
    const pb = getPlaybookResponse('Explain APR');
    expect(pb?.title.toLowerCase()).toContain('apr');
  });

  it('returns DTI playbook', () => {
    const pb = getPlaybookResponse('What is DTI?');
    expect(pb?.title.toLowerCase()).toContain('debt');
  });
});
