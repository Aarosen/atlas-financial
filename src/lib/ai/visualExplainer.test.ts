import { describe, expect, it } from 'vitest';

import { buildSparkline } from './visualExplainer';

describe('visualExplainer', () => {
  it('builds sparkline data', () => {
    const points = buildSparkline([1, 2, 3]);
    expect(points.length).toBe(3);
  });
});
