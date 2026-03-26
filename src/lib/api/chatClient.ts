/**
 * Chat API client with userId and sessionId support
 * Handles all API calls to /api/chat with proper authentication
 */

export interface ChatRequest {
  type: 'extract' | 'chat' | 'answer' | 'answer_stream' | 'answer_explain' | 'answer_explain_stream';
  messages: any[];
  missing?: string[];
  question?: string;
  memorySummary?: string;
  language?: string;
  fin?: Record<string, any>;
  extractedFields?: Record<string, any>;
  sessionState?: Record<string, any>;
  lastQuestion?: string;
  answered?: Record<string, boolean>;
  userId?: string;
  sessionId?: string;
}

export interface ChatResponse {
  text?: string;
  done?: boolean;
  model?: string;
  tier?: string;
  sessionId?: string;
  delta?: string;
  type?: string;
  error?: string;
}

/**
 * Send a chat request with userId and sessionId
 * Handles both streaming and non-streaming responses
 */
export async function sendChatRequest(
  request: ChatRequest,
  onStream?: (chunk: ChatResponse) => void
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Chat request failed');
    }

    // Handle streaming responses
    if (request.type === 'answer_stream' || request.type === 'answer_explain_stream') {
      return handleStreamingResponse(response, onStream);
    }

    // Handle non-streaming responses
    const data = await response.json();
    return data as ChatResponse;
  } catch (error) {
    console.error('Chat request error:', error);
    throw error;
  }
}

/**
 * Handle streaming response from chat API
 */
async function handleStreamingResponse(
  response: Response,
  onStream?: (chunk: ChatResponse) => void
): Promise<ChatResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastResponse: ChatResponse = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(line.slice(6)) as ChatResponse;
            lastResponse = chunk;
            if (onStream) {
              onStream(chunk);
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
          }
        }
      }
    }

    return lastResponse;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Build a chat request with userId and sessionId
 */
export function buildChatRequest(
  type: ChatRequest['type'],
  messages: any[],
  options: Partial<ChatRequest> = {},
  userId?: string,
  sessionId?: string
): ChatRequest {
  return {
    type,
    messages,
    userId,
    sessionId,
    ...options,
  };
}
