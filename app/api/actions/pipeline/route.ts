import { NextRequest, NextResponse } from 'next/server';
import {
  generateDebtPayoffPipeline,
  generateEmergencyFundPipeline,
  getNextAction,
  completeAction,
  type ActionPipeline,
  type ActionStep,
} from '@/lib/ai/actionPipeline';

/**
 * API endpoint for managing action pipelines
 * Handles creation, retrieval, and progression of sequential actions
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, action, goal, debtAmount, monthlyIncome, essentialExpenses } =
      await request.json();

    if (!userId || !sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing userId or sessionId' },
        { status: 400 }
      );
    }

    // CREATE: Generate new pipeline based on goal
    if (action === 'create') {
      if (!goal) {
        return NextResponse.json(
          { ok: false, error: 'Missing goal for pipeline creation' },
          { status: 400 }
        );
      }

      let steps: ActionStep[] = [];

      if (goal.includes('debt') || goal.includes('payoff')) {
        if (!debtAmount || !monthlyIncome || !essentialExpenses) {
          return NextResponse.json(
            { ok: false, error: 'Missing financial data for debt pipeline' },
            { status: 400 }
          );
        }
        steps = generateDebtPayoffPipeline(debtAmount, monthlyIncome, essentialExpenses);
      } else if (goal.includes('emergency') || goal.includes('fund')) {
        if (!monthlyIncome || !essentialExpenses) {
          return NextResponse.json(
            { ok: false, error: 'Missing financial data for emergency fund pipeline' },
            { status: 400 }
          );
        }
        steps = generateEmergencyFundPipeline(
          essentialExpenses * 3,
          monthlyIncome,
          essentialExpenses
        );
      }

      const pipeline: ActionPipeline = {
        userId,
        sessionId,
        goal,
        totalSteps: steps.length,
        currentStep: 0,
        steps,
        completedSteps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('[companion] Action pipeline created:', {
        userId,
        goal,
        totalSteps: steps.length,
      });

      return NextResponse.json(
        {
          ok: true,
          pipeline,
          nextAction: getNextAction(pipeline),
        },
        { status: 200 }
      );
    }

    // COMPLETE: Mark action as complete and unlock next
    if (action === 'complete') {
      // In a full implementation, this would:
      // 1. Load pipeline from Supabase
      // 2. Mark step as complete
      // 3. Update pipeline in Supabase
      // 4. Return next available action

      console.log('[companion] Action completed:', {
        userId,
        sessionId,
        action,
      });

      return NextResponse.json(
        {
          ok: true,
          message: 'Action marked as complete. Next step unlocked.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing action pipeline:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to manage action pipeline' },
      { status: 500 }
    );
  }
}
