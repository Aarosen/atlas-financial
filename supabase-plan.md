# Supabase / Account Plan (Parked)

This doc captures the SaaS-first auth + sync plan so we can pause it now and resume later without thrash.

## Current decision
- US-only launch first (Supabase region: US East recommended).
- SaaS-first long-term, but **auth gating is paused** to unblock conversation UX iteration.

## Non-negotiables (trust-first SaaS)
- Magic-link auth first (OAuth later).
- Deterministic strategy decisions in code (engine), LLM limited to extraction + tone.
- RLS on all user data tables.
- User controls:
  - Export data
  - Delete data
- Privacy-first analytics (no raw message text in analytics events).

## Data model (minimum)
- `profiles`
  - `user_id` (PK)
  - `created_at`
  - `preferences_json`
  - `consent_json`
- `atlas_sessions`
  - `id` (PK)
  - `user_id`
  - `status` (`active|completed|archived`)
  - `phase`
  - `collected_json`
  - `missing_json`
  - `schema_version`
  - `created_at`, `updated_at`
- `atlas_messages`
  - `id` (PK)
  - `session_id`
  - `role`
  - `content`
  - `turn_index`
  - `created_at`
  - `meta_json`
- `atlas_traces`
  - `id` (PK)
  - `session_id`
  - `decision_json`
  - `engine_version`
  - `created_at`
- `atlas_plans`
  - `id` (PK)
  - `user_id`
  - `session_id` (optional)
  - `lever`
  - `amount`
  - `status`
  - `created_at`, `updated_at`

## RLS policy approach
- Enable RLS on all tables.
- Access rules:
  - `profiles.user_id = auth.uid()`
  - `atlas_sessions.user_id = auth.uid()`
  - Child tables allowed only if `atlas_sessions.user_id = auth.uid()` for the referenced session.

## Implementation status (already in repo)
### Dependencies
- `@supabase/supabase-js`
- `@supabase/ssr`

### Files
- `src/lib/supabase/browserClient.ts`
- `src/lib/supabase/serverClient.ts`
- `src/lib/supabase/adminClient.ts` (server-only; requires service role key)
- `app/login/page.tsx` (magic link UI; supports PKCE `?code=` and hash token flows)
- `app/auth/callback/route.ts` (supports `code` and `token_hash/type`)
- `middleware.ts`
  - **Auth gating is feature-flagged** via `ATLAS_AUTH_ENABLED=1`.
  - Default OFF to unblock `/conversation` iteration.

## Environment variables
Required for auth UI + middleware session handling:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only (needed later for admin tasks / backfills, not required for current milestone):
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase dashboard settings (when we re-enable)
- Auth providers: Email magic link enabled.
- Site URL: production (Vercel)
- Redirect URLs:
  - production domain `/**`
  - localhost dev `http://localhost:3001/**` (and `:3000/**` if needed)

## Reactivation checklist
1. Rotate service role key (treat previously shared key as compromised).
2. Configure Supabase Site URL + Redirect URLs.
3. Set env vars in Vercel and local.
4. Set `ATLAS_AUTH_ENABLED=1`.
5. Verify:
   - /conversation redirects to /login when logged out
   - magic link completes sign-in
   - refresh persists session
6. Implement DB schema + RLS + tests.
7. Add session/message persistence + resume across devices.
