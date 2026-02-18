import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { Card } from '@/components/Card';

describe('Card', () => {
  it('renders default card', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(React.createElement(Card, null, React.createElement('div', null, 'Body')));
    });
    expect(tr.root.findByType('div')).toBeTruthy();
  });

  it('accepts className for variants', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(Card, { className: 'cardLg', children: React.createElement('div', null, 'Body') })
      );
    });
    expect(tr.root.findByType('div')).toBeTruthy();
  });
});
