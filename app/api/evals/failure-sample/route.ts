export const runtime = "nodejs";

import fs from "fs";
import path from "path";

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

function getFilePath(dayKey: string) {
  return path.join(process.cwd(), "src/evals/failure-samples", `failures-${dayKey}.json`);
}

function redact(text: string) {
  return text.replace(/\$?\d[\d,]*(?:\.\d+)?/g, "[REDACTED_NUMBER]");
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
  const filePath = getFilePath(dayKey);

  const safePayload: FailureSample = {
    ...payload,
    userMessage: redact(payload.userMessage || ""),
    atlasResponse: redact(payload.atlasResponse || ""),
  };

  let existing: FailureSample[] = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    existing = JSON.parse(raw) as FailureSample[];
  }

  if (existing.length >= MAX_PER_DAY) {
    return new Response(JSON.stringify({ ok: true, capped: true }), { status: 200 });
  }

  existing.push(safePayload);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
