import type { FinancialState } from '@/lib/state/types';
import type { InterruptionType } from '@/lib/state/atlasConversationController';
import { nextQuestionForMissing } from '@/lib/state/atlasConversationController';

export type OrchestrationAction =
  | { type: 'ask'; questionKey: keyof FinancialState; text: string }
  | { type: 'complete' }
  | { type: 'hold' };

type OrchestratorInput = {
  kind: InterruptionType;
  missing: Array<keyof FinancialState>;
  turnIndex: number;
};

export function decideNextAction(input: OrchestratorInput): OrchestrationAction {
  if (input.kind === 'meta' || input.kind === 'followup_question') {
    return { type: 'hold' };
  }

  const missing0 = input.missing[0];
  if (!missing0) return { type: 'complete' };

  const q = nextQuestionForMissing(missing0, input.turnIndex);
  return { type: 'ask', questionKey: q.key, text: q.text };
}
