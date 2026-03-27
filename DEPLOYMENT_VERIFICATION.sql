-- Atlas Financial Deployment Verification Script
-- Run this in Supabase SQL Editor to verify all required tables and columns exist

-- 1. Verify users table has email_notifications column
SELECT 'Step 1: Check email_notifications column' as step;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_notifications';

-- If the above returns no rows, run this to add the column:
-- ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT true;

-- 2. Verify user_actions table exists and has required columns
SELECT 'Step 2: Check user_actions table structure' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_actions'
ORDER BY ordinal_position;

-- 3. Verify conversations table exists
SELECT 'Step 3: Check conversations table' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- 4. Verify financial_snapshots table exists
SELECT 'Step 4: Check financial_snapshots table' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'financial_snapshots'
ORDER BY ordinal_position;

-- 5. Count users with email_notifications = true (should be most users)
SELECT 'Step 5: Email notification opt-in status' as step;
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_notifications = true THEN 1 END) as opted_in,
  COUNT(CASE WHEN email_notifications = false THEN 1 END) as opted_out,
  COUNT(CASE WHEN email_notifications IS NULL THEN 1 END) as unknown
FROM users;

-- 6. Check for overdue commitments (test data)
SELECT 'Step 6: Overdue commitments check' as step;
SELECT 
  COUNT(*) as overdue_count,
  COUNT(DISTINCT user_id) as affected_users
FROM user_actions
WHERE status IN ('committed', 'recommended')
  AND check_in_due_at < NOW()
  AND completed_at IS NULL;

-- 7. Verify cron_logs table exists (for monitoring)
SELECT 'Step 7: Check cron_logs table' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cron_logs'
ORDER BY ordinal_position;

-- 8. Check recent CRON executions
SELECT 'Step 8: Recent CRON job executions' as step;
SELECT 
  job_name,
  status,
  details,
  executed_at
FROM cron_logs
WHERE job_name = 'check-overdue-commitments'
ORDER BY executed_at DESC
LIMIT 5;

-- 9. Verify indexes exist for performance
SELECT 'Step 9: Check indexes for performance' as step;
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('user_actions', 'users', 'conversations')
ORDER BY tablename, indexname;

-- 10. Summary report
SELECT 'Step 10: Deployment readiness summary' as step;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_notifications') 
    THEN '✓ email_notifications column exists'
    ELSE '✗ email_notifications column MISSING'
  END as check_1,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_actions')
    THEN '✓ user_actions table exists'
    ELSE '✗ user_actions table MISSING'
  END as check_2,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
    THEN '✓ conversations table exists'
    ELSE '✗ conversations table MISSING'
  END as check_3,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_snapshots')
    THEN '✓ financial_snapshots table exists'
    ELSE '✗ financial_snapshots table MISSING'
  END as check_4,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cron_logs')
    THEN '✓ cron_logs table exists'
    ELSE '✗ cron_logs table MISSING'
  END as check_5;
