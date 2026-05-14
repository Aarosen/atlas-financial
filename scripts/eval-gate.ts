/**
 * Atlas Eval Gate — runs scripted transcripts through the REAL /api/chat handler
 * and asserts on customer-visible output. Exits non-zero on any regression.
 *
 * Run:  npm run eval:gate
 * CI:   blocks merge (see .github/workflows/atlas-eval-gate.yml)
 *
 * Modes:
 *   - default: calls Anthropic for real (requires ANTHROPIC_API_KEY)
 *   - EVAL_FIXTURE=record  : captures responses to scripts/eval-fixtures/
 *   - EVAL_FIXTURE=replay  : replays from fixtures, no network (fast CI)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { POST } from '../app/api/chat/route';

type Assertions = {
  mustContainAll?: string[];
  mustNotContain?: string[];
  mustAskFollowUp?: boolean;
  mustMentionLever?: string;
  mustNotHallucinateNumbers?: boolean;
};
type Turn = { userMessage: string; assertions: Assertions };
type Transcript = { id: string; description: string; immutable: boolean; turns: Turn[] };

const TRANSCRIPT_DIR = join(__dirname, 'eval-transcripts');
const FIXTURE_DIR = join(__dirname, 'eval-fixtures');
const fixtureMode = process.env.EVAL_FIXTURE; // 'record' | 'replay' | undefined

function loadTranscripts(): Transcript[] {
  if (!existsSync(TRANSCRIPT_DIR)) {
    console.error(`Transcript directory not found: ${TRANSCRIPT_DIR}`);
    return [];
  }
  return readdirSync(TRANSCRIPT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(readFileSync(join(TRANSCRIPT_DIR, f), 'utf8')) as Transcript;
      } catch (e) {
        console.error(`Failed to parse ${f}:`, e);
        return null;
      }
    })
    .filter((t): t is Transcript => t !== null);
}

/**
 * Build a Request the way the real client does.
 * Mirrors app/ui/AtlasApp.tsx payload structure.
 */
function buildRequest(history: { role: string; content: string }[], userMessage: string): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'chat',
      messages: [...history, { role: 'user', content: userMessage }],
      language: 'en',
      userId: 'eval-test',
      sessionId: 'eval-session-' + Date.now(),
    }),
  });
}

/**
 * Call Atlas via the real POST handler.
 * In replay mode, reads from fixtures. In record mode, saves responses.
 * In default mode, calls Anthropic (requires ANTHROPIC_API_KEY).
 */
async function callAtlas(req: Request, transcriptId: string, turnIndex: number): Promise<string> {
  const fixturePath = join(FIXTURE_DIR, `${transcriptId}-${turnIndex}.txt`);
  
  if (fixtureMode === 'replay') {
    if (!existsSync(fixturePath)) {
      throw new Error(`No fixture for ${transcriptId} turn ${turnIndex}. Run with EVAL_FIXTURE=record first.`);
    }
    return readFileSync(fixturePath, 'utf8');
  }

  // Call the real POST handler
  const res = await POST(req);
  
  // The chat route streams SSE. Read the full body and extract text deltas.
  const text = await res.text();
  
  // Parse SSE format: data: {json}\n\n
  const lines = text.split('\n');
  let fullText = '';
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json.delta) fullText += json.delta;
        if (json.type === 'replace' && json.text) fullText = json.text;
      } catch {
        // ignore parse errors
      }
    }
  }

  if (fixtureMode === 'record') {
    if (!existsSync(FIXTURE_DIR)) mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(fixturePath, fullText);
  }

  return fullText;
}

function checkTurn(output: string, a: Assertions): string[] {
  const failures: string[] = [];
  const lower = output.toLowerCase();

  for (const s of a.mustContainAll ?? []) {
    if (!output.includes(s)) {
      failures.push(`missing required substring: "${s}"`);
    }
  }

  for (const s of a.mustNotContain ?? []) {
    if (lower.includes(s.toLowerCase())) {
      failures.push(`contains forbidden substring: "${s}"`);
    }
  }

  if (a.mustAskFollowUp && !output.includes('?')) {
    failures.push('expected a follow-up question (no "?" found)');
  }

  if (a.mustMentionLever && !lower.includes(a.mustMentionLever.toLowerCase())) {
    failures.push(`expected lever mention: "${a.mustMentionLever}"`);
  }

  // mustNotHallucinateNumbers: every $ / % figure in the output must also appear in
  // the calculation block. The harness can't see the block directly here — instead,
  // assert that hedging language ("approximately", "roughly", "about $") is absent,
  // which is the LLM's tell that it improvised instead of using the authoritative block.
  if (a.mustNotHallucinateNumbers) {
    for (const hedge of ['approximately', 'roughly $', 'i estimate', 'about $', 'around $']) {
      if (lower.includes(hedge)) {
        failures.push(`hallucination tell: "${hedge}" — LLM may be improvising numbers`);
      }
    }
  }

  return failures;
}

async function main() {
  const transcripts = loadTranscripts();
  
  if (transcripts.length === 0) {
    console.error('No transcripts found. Create JSON files in scripts/eval-transcripts/');
    process.exit(1);
  }

  let totalTurns = 0;
  let failedTurns = 0;
  const report: any = { startedAt: new Date().toISOString(), transcripts: [], fixtureMode };

  for (const t of transcripts) {
    const tReport: any = { id: t.id, description: t.description, turns: [] };
    const history: { role: string; content: string }[] = [];

    for (let i = 0; i < t.turns.length; i++) {
      totalTurns++;
      const turn = t.turns[i];
      let output = '';
      let failures: string[] = [];

      try {
        output = await callAtlas(buildRequest(history, turn.userMessage), t.id, i);
        failures = checkTurn(output, turn.assertions);
      } catch (e: any) {
        failures = [`harness error: ${e.message}`];
      }

      history.push({ role: 'user', content: turn.userMessage });
      history.push({ role: 'assistant', content: output });

      if (failures.length) failedTurns++;

      tReport.turns.push({ index: i, pass: failures.length === 0, failures });

      const status = failures.length === 0 ? '✅' : '❌';
      console.log(`${status} ${t.id} turn ${i}`);
      if (failures.length) {
        for (const f of failures) {
          console.log(`   ${f}`);
        }
      }
    }

    report.transcripts.push(tReport);
  }

  report.totalTurns = totalTurns;
  report.failedTurns = failedTurns;
  report.gatePass = failedTurns === 0;

  if (!existsSync('src/evals')) mkdirSync('src/evals', { recursive: true });
  writeFileSync(`src/evals/eval-report-${Date.now()}.json`, JSON.stringify(report, null, 2));

  const summary = `${report.gatePass ? '✅ GATE PASS' : '❌ GATE FAIL'} — ${totalTurns - failedTurns}/${totalTurns} turns passed`;
  console.log(`\n${summary}\n`);

  process.exit(report.gatePass ? 0 : 1);
}

main().catch(e => {
  console.error('eval-gate crashed:', e);
  process.exit(1);
});
