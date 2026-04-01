export const runtime = "nodejs";

import { createClient } from "@supabase/supabase-js";

interface FailureSample {
  sessionId: string;
  userMessage: string;
  atlasResponse: string;
  reason: string;
  severity?: "critical" | "high" | "medium" | "low";
  severity_reason?: string;
  root_causes?: RootCause[];
  root_cause_reason?: string;
  tags?: string[];
  emotion?: string;
  topic?: string;
  timestamp: string;
}

type RootCause =
  | "model_capability"
  | "prompt_issue"
  | "missing_data_issue"
  | "tool_calculation_issue"
  | "memory_context_issue";

const MAX_PER_DAY = Number(process.env.ATLAS_FAILURE_SAMPLE_CAP ?? 500);

function getDayKey(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function redact(text: string) {
  return text.replace(/\$?\d[\d,]*(?:\.\d+)?/g, "[REDACTED_NUMBER]");
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(url, key);
}

export async function POST(req: Request) {
  // Verify internal API key
  const internalKey = req.headers.get('x-atlas-eval-key');
  const expectedKey = process.env.ATLAS_EVAL_KEY;
  if (!expectedKey || internalKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  let payload: FailureSample | null = null;
  try {
    payload = (await req.json()) as FailureSample;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  if (!payload) return new Response(JSON.stringify({ error: "missing_payload" }), { status: 400 });
  
  const dayKey = getDayKey(payload.timestamp);
  const safePayload: FailureSample = {
    ...payload,
    userMessage: redact(payload.userMessage || ""),
    atlasResponse: redact(payload.atlasResponse || ""),
  };

  try {
    const supabase = getSupabaseClient();

    // Check daily cap using Supabase count
    const { count, error: countError } = await supabase
      .from('eval_failures')
      .select('id', { count: 'exact', head: true })
      .eq('day_key', dayKey);

    if (countError) {
      console.error('[eval-failures] Count error:', countError);
      return new Response(JSON.stringify({ error: 'count_failed' }), { status: 500 });
    }

    if ((count ?? 0) >= MAX_PER_DAY) {
      return new Response(JSON.stringify({ ok: true, capped: true }), { status: 200 });
    }

    // Insert failure sample into Supabase
    const { error: insertError } = await supabase
      .from('eval_failures')
      .insert({
        session_id: safePayload.sessionId,
        user_message: safePayload.userMessage,
        atlas_response: safePayload.atlasResponse,
        reason: safePayload.reason,
        severity: safePayload.severity || 'medium',
        tags: safePayload.tags || [],
        emotion: safePayload.emotion,
        topic: safePayload.topic,
        timestamp: new Date(safePayload.timestamp).toISOString(),
        day_key: dayKey,
      });

    if (insertError) {
      console.error('[eval-failures] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'insert_failed' }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    console.error('[eval-failures] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
}
