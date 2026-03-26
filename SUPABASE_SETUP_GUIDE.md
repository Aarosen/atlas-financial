# Supabase Setup Guide for Atlas Financial

## Overview
This guide walks through setting up Supabase for Atlas Financial's companion layer. Three environment variables must be configured in Vercel to activate session persistence, commitment tracking, and cross-session memory.

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - **Project Name**: `atlas-financial` (or your choice)
   - **Database Password**: Generate a strong password (save this)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
5. Click "Create new project"
6. Wait 2-3 minutes for project to initialize

---

## Step 2: Run Database Schema Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `/src/lib/supabase/schema.sql` from your repository
4. Paste into the SQL Editor
5. Click **Run**
6. Verify all 8 tables created:
   - `users`
   - `financial_profiles`
   - `conversation_sessions`
   - `user_actions`
   - `financial_snapshots`
   - `user_goals`
   - `behavior_profiles`
   - `cron_logs`

---

## Step 3: Get Supabase Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon Key** (public, safe to expose)
   - **Service Role Key** (secret, never expose)

3. Copy these three values:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY` = Service Role Key

---

## Step 4: Configure Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your Atlas Financial project
3. Go to **Settings** → **Environment Variables**
4. Add three new variables:

### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Paste your Project URL from Step 3
- **Environments**: Production, Preview, Development
- Click **Add**

### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Paste your Anon Key from Step 3
- **Environments**: Production, Preview, Development
- Click **Add**

### Variable 3: SUPABASE_SERVICE_ROLE_KEY
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Paste your Service Role Key from Step 3
- **Environments**: Production, Preview, Development
- Click **Add**

---

## Step 5: Verify Setup

1. In Vercel, go to **Deployments**
2. Click **Redeploy** on the latest deployment to pick up new env vars
3. Wait for deployment to complete
4. Test the app:
   - Open your Vercel URL
   - Click "Sign in with email"
   - Enter test email address
   - Check email for magic link (should arrive within 30 seconds)
   - Click link and verify redirect works

---

## Step 6: Test Companion Features

### Test 1: Session Persistence
1. Sign in with test email
2. Start a conversation
3. Send a message
4. Close the browser tab
5. In Supabase Dashboard, go to **conversation_sessions** table
6. Verify your session has `ended_at` timestamp

### Test 2: Financial Data Capture
1. Sign in and have a conversation
2. Mention financial details: "I make $5000/month and spend $3000"
3. Send message
4. In Supabase Dashboard, go to **financial_snapshots** table
5. Verify snapshot was created with your data

### Test 3: Multi-Goal Tracking
1. Sign in and mention multiple goals: "I want to pay off debt and build an emergency fund"
2. In Supabase Dashboard, go to **user_goals** table
3. Verify both goals were created

### Test 4: Nudge Injection
1. Sign in and have 10+ message conversation
2. At message 10, 20, 50, etc., verify nudges appear (if applicable)
3. Check browser console for nudge injection logs

---

## Troubleshooting

### Magic Link Email Not Received
- Check spam folder
- Verify email address is correct
- Check Supabase email settings in **Authentication** → **Email Templates**
- Wait 5 minutes and try again

### Session Not Persisting
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Check browser console for errors
- Verify `conversation_sessions` table exists in Supabase
- Check Vercel logs for API errors

### Financial Data Not Captured
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check that conversation includes clear financial numbers
- Verify `financial_snapshots` table exists
- Check browser console for extraction errors

### Goals Not Tracked
- Verify goals are mentioned clearly in conversation
- Check `user_goals` table exists in Supabase
- Verify goal detection keywords are present (debt, emergency fund, savings, invest, retire)
- Check browser console for goal detection logs

---

## Environment Variables Summary

| Variable | Value | Visibility | Source |
|----------|-------|------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL | Public | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Anon Key | Public | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Service Role Key | Secret | Supabase Settings → API |
| `ANTHROPIC_API_KEY` | Your Claude API Key | Secret | Already configured |
| `RESEND_API_KEY` | Your Resend API Key | Secret | Already configured |
| `CRON_SECRET` | Random string | Secret | Already configured |

---

## What Gets Activated

Once these three Supabase env vars are set and Vercel redeploys:

✅ **Magic Link Authentication** - Users can sign in via email
✅ **Session Persistence** - Conversations saved across sessions
✅ **Commitment Tracking** - User actions tracked and persisted
✅ **Multi-Goal Intelligence** - Multiple goals tracked and prioritized
✅ **Financial Profile** - User financial data persisted for next session
✅ **Nudge Injection** - Proactive nudges based on progress
✅ **Cross-Session Memory** - Atlas remembers users across sessions
✅ **Cron Job Notifications** - Overdue commitment emails sent daily

---

## Next Steps

1. Complete this setup guide
2. Test all 4 verification tests above
3. Monitor Supabase logs for errors
4. Check Vercel deployment logs
5. Gather user feedback on companion features
6. Monitor cron job execution in `cron_logs` table

---

## Support

For issues:
- **Supabase**: https://supabase.com/support
- **Vercel**: https://vercel.com/support
- **Anthropic**: https://support.anthropic.com
- **Resend**: https://resend.com/support
