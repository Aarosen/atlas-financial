import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { IconButton } from '@/components/IconButton';

describe('IconButton', () => {
  it('renders secondary', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(IconButton, { 'aria-label': 'Settings', children: React.createElement('span', null, 'X') })
      );
    });
    expect(tr.root.findByType('button')).toBeTruthy();
  });

  it('renders primary', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(IconButton, { variant: 'primary', 'aria-label': 'Send', children: React.createElement('span', null, 'X') })
      );
    });
    expect(tr.root.findByType('button')).toBeTruthy();
  });
});
