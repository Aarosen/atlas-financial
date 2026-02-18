import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { TextInput, Textarea } from '@/components/TextInput';

describe('TextInput primitives', () => {
  it('renders TextInput', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(React.createElement(TextInput, { value: 'x', onChange: () => {} }));
    });
    expect(tr.root.findByType('input')).toBeTruthy();
  });

  it('renders Textarea', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(React.createElement(Textarea, { value: 'x', onChange: () => {} }));
    });
    expect(tr.root.findByType('textarea')).toBeTruthy();
  });
});
