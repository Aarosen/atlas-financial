# Atlas — Deploy to Vercel in 5 Minutes

## What this does
Your API key lives in Vercel's secure environment variables.
The browser calls `/api/chat` (your own server) — never Anthropic directly.
Your key is never in the HTML source code. ✅

---

## Step 1 — Get your Anthropic API key

1. Go to **console.anthropic.com**
2. Click **API Keys** in the left sidebar
3. Click **Create Key**, give it a name like `atlas-production`
4. **Copy the key** — it starts with `sk-ant-api03-...`
   ⚠️ You only see it once. Save it somewhere safe.

---

## Step 2 — Put these files on GitHub

Option A — GitHub Desktop (easiest):
1. Download GitHub Desktop: desktop.github.com
2. File → New Repository → name it `atlas-financial`
3. Drag these files into the folder it creates:
   ```
   atlas-financial/
   ├── api/
   │   └── chat.js
   ├── public/
   │   └── index.html
   ├── vercel.json
   ├── package.json
   └── .gitignore
   ```
4. Click **Commit to main** → **Publish repository**

Option B — Command line:
```bash
cd atlas-vercel
git init
git add .
git commit -m "Initial Atlas deployment"
gh repo create atlas-financial --public --push --source=.
```

---

## Step 3 — Deploy to Vercel

1. Go to **vercel.com** and sign up / log in (free)
2. Click **Add New → Project**
3. Click **Import** next to your `atlas-financial` repo
4. Leave all settings as default — Vercel auto-detects the config
5. Click **Deploy**

It will fail the first time — that's expected because the API key isn't set yet.

---

## Step 4 — Add your API key (the important part)

1. In Vercel, go to your project → **Settings** tab
2. Click **Environment Variables** in the left menu
3. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-...` (your key from Step 1)
   - **Environments:** ✅ Production  ✅ Preview  ✅ Development
4. Click **Save**

---

## Step 5 — Redeploy

1. Go to the **Deployments** tab
2. Click the **⋯** menu next to your latest deployment
3. Click **Redeploy**

That's it. Your Atlas app is live at `your-project.vercel.app` 🎉

---

## Verify it's working

1. Open your Vercel URL
2. Click **Start conversation**
3. You should see a green **"Claude AI active"** badge in the top bar
4. If you see amber **"Offline mode"**, double-check your environment variable name is exactly `ANTHROPIC_API_KEY`

---

## Custom domain (optional)

In Vercel → Settings → Domains → Add your domain.
Vercel handles SSL automatically.

---

## Security notes

- ✅ API key is server-side only — never visible in browser DevTools
- ✅ Rate limiting: 20 requests per IP per minute (edit `api/chat.js` to adjust)
- ✅ Messages capped at last 10 per request to limit token usage
- ✅ No financial data leaves your users' devices (stored in IndexedDB only)
- ⚠️ For high-traffic production, add Vercel KV for persistent rate limiting

---

## Costs

- **Vercel hosting:** Free (Hobby plan handles ~100k requests/month)
- **Anthropic API:** ~$0.003 per conversation (claude-sonnet-4-5 pricing)
  - 1,000 users/month ≈ $3–10 depending on conversation length
  - Set a spend limit at console.anthropic.com → Billing → Limits

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "API not configured" error | Add `ANTHROPIC_API_KEY` env var and redeploy |
| "API key is invalid" | Check you copied the full key including `sk-ant-api03-` prefix |
| Conversations use fallback | Check browser console for `/api/chat` network errors |
| App shows blank page | Check Vercel deployment logs for build errors |
