# Atlas — Definition of Done

A task is **not complete** until there is an automated test that exercises it
through the UI the customer actually uses.

- "The module compiles" is not done.
- "Unit tests pass for the module in isolation" is not done.
- "It's behind a feature flag" is not done.
- **Done = a customer can see it and use it, AND a test proves that path works, AND that test is wired into CI as a merge blocker.**

## Corollary: no dark code

Any module under `src/lib/**`, any hook, any component, and any feature flag
that has **zero importers reachable from a customer-facing route** is either:
  (a) wired to a customer-facing surface with a passing UI test this week, or
  (b) deleted.

There is no third option. "Built but dark" code is how the gap between what
Atlas claims and what the customer gets keeps reopening.

## How we avoid the audit loop

We do not respond to fluctuation with another audit. We respond by making the
eval gate (`npm run eval:gate`) and the golden path (`e2e/golden-path.spec.ts`)
the definition of "working." If they are green, we ship. If they are red, we
stop. Audits describe the past; the gate protects the future.

## The three gates

1. **Eval Gate** (`npm run eval:gate`) — Scripted transcripts through the real `/api/chat` handler. Asserts on customer-visible output. Exits non-zero on regression.
2. **Golden Path** (`e2e/golden-path.spec.ts`) — Immutable Playwright test of the one journey every customer takes. Cannot be edited to pass.
3. **Build Gate** (`npm run build`) — Completes in <15 minutes with zero errors. Required status check on main.

All three must be green to merge.

## Feature flag discipline

A feature flag is only useful if:
1. It gates a complete customer-visible feature (not a partial implementation).
2. It has a test that proves the feature works when enabled.
3. It defaults to `false` in production (safe default).
4. It is documented in `src/lib/featureFlags.ts` with a rationale.

Flags that gate "built but dark" code are technical debt, not progress.

## Backward compatibility

All new features must maintain full backward compatibility with existing data structures and API contracts. If a change breaks existing data, it is not done.

## The one rule

**If a customer cannot see it and a test does not prove it works, it does not exist.**
