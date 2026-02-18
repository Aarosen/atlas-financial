import { describe, expect, it, vi } from 'vitest';

import { ClaudeClient } from './client';

describe('ClaudeClient.answerStream', () => {
  it('accumulates deltas from SSE frames', async () => {
    const chunks = [
      'data: {"delta":"Hel"}\n\n',
      'data: {"delta":"lo"}\n\n',
      'data: {"done":true}\n\n',
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
        controller.close();
      },
    });

    const fetchMock = vi.fn(async () =>
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );

    (globalThis as any).fetch = fetchMock;

    const c = new ClaudeClient();
    let out = '';
    const r = await c.answerStream({
      msgs: [],
      question: 'q',
      onDelta: (t) => {
        out += t;
      },
    });

    expect(r.ok).toBe(true);
    expect(out).toBe('Hello');
  });
});
