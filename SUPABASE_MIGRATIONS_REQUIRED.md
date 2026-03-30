# Supabase Migrations Required

## Critical: Run These SQL Statements in Supabase SQL Editor

These migrations add missing columns to the live database. **schema.sql in the repo is only a source-of-truth file — it does NOT automatically migrate the live database.**

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Select your Atlas Financial project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Run Migration 1 - Add description to user_goals
```sql
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS description TEXT;
```
Click "Run" and wait for success message.

### Step 3: Run Migration 2 - Add email_notifications to user_actions
```sql
ALTER TABLE user_actions ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
```
Click "Run" and wait for success message.

### Verification
After both migrations complete, verify in Supabase:
1. Click "Table Editor" in left sidebar
2. Select "user_goals" table
3. Verify "description" column exists
4. Select "user_actions" table
5. Verify "email_notifications" column exists with DEFAULT true

## Why This Is Critical

- **Fix A (description column)**: Without this, every goal save fails with "null value in column 'description' violates not-null constraint"
- **Fix B (email_notifications column)**: Without this, the cron job query returns zero rows and no emails are sent

## Status
- [ ] Migration 1 completed
- [ ] Migration 2 completed
- [ ] Columns verified in Supabase Table Editor

Once both migrations are complete, goals will persist and emails will send.
