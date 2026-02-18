import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { Button } from '@/components/Buttons';

describe('Button', () => {
  it('renders primary md', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(React.createElement(Button, { variant: 'primary', size: 'md', children: 'Primary' }));
    });
    expect(tr.root.findByType('button')).toBeTruthy();
  });

  it('renders secondary sm', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(React.createElement(Button, { variant: 'secondary', size: 'sm', children: 'Secondary' }));
    });
    expect(tr.root.findByType('button')).toBeTruthy();
  });

  it('renders disabled', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(React.createElement(Button, { disabled: true, children: 'Disabled' }));
    });
    expect(tr.root.findByType('button')).toBeTruthy();
  });
});
