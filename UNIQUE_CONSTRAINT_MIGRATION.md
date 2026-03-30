# Unique Constraint Migration for Goals

## Critical: Run This in Supabase SQL Editor

The `goals/save` endpoint uses an upsert with `onConflict: 'user_id,goal_type,description'`. For this to work, PostgreSQL requires a unique constraint on exactly those columns.

### Step 1: Add Unique Constraint

Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE user_goals
ADD CONSTRAINT user_goals_user_type_desc_unique
UNIQUE (user_id, goal_type, description);
```

### Step 2: Verify Constraint

After running the migration, verify it exists:

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_goals' AND constraint_name LIKE '%unique%';
```

You should see `user_goals_user_type_desc_unique` in the results.

## Why This Is Critical

Without this constraint, every goal save fails with:
```
"there is no unique or exclusion constraint matching the ON CONFLICT specification"
```

This means:
- Goals never persist to the database
- Goal CRUD buttons don't work (nothing to update)
- Milestone celebrations can't fire (no goals exist)
- Dashboard shows zero goals even after detection

## Status
- [ ] Constraint created in Supabase
- [ ] Constraint verified in information_schema
- [ ] Goals now save successfully

Once this constraint is in place, the check-then-insert pattern in the code will work correctly.
