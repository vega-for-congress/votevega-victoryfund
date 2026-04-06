# Telegram Issue Bot - Deployment Guide

This bot lets campaign staffers create website change requests via Telegram.
Messages become GitHub issues, which trigger an AI workflow that generates PRs
with deploy previews.

## Architecture

```
Staffer texts bot -> Cloudflare Worker -> GitHub Issue -> GitHub Action (aider)
    -> PR created -> Worker notifies staffer with deploy preview link
```

**Services used (cost-sensitive at scale):**
- GitHub Actions (~$0.008/min)
- OpenRouter / Claude 3.7 Sonnet (~$0.06/issue)
- Netlify deploy previews (counted toward build minutes)

Per-user daily quotas are enforced by the bot to control costs.

---

## First-Time Setup

### 1. Create the Telegram bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`, follow prompts to name it (e.g. "VoteVega Website Bot")
3. Save the **bot token** (looks like `123456:ABC-DEF...`)

### 2. Get authorized user IDs

Each staffer who will use the bot needs their Telegram user ID:
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It replies with your numeric user ID (e.g. `123456789`)
3. Collect IDs for all authorized staffers

### 3. Generate secrets

```bash
# Generate a random webhook secret (Telegram -> Worker auth)
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "WEBHOOK_SECRET: $WEBHOOK_SECRET"

# Generate a random notify secret (GitHub Actions -> Worker auth)
NOTIFY_SECRET=$(openssl rand -hex 32)
echo "NOTIFY_SECRET: $NOTIFY_SECRET"
```

Save both values - you'll need them in steps 4 and 6.

### 4. Create a GitHub fine-grained PAT

1. Go to https://github.com/settings/tokens?type=beta
2. Create a token scoped to the `vega-for-congress/votevega-website` repo
3. Permissions needed: **Issues: Read & Write**
4. Save the token

### 5. Deploy the Cloudflare Worker

```bash
cd workers/telegram-issue-bot

# Install dependencies
bun install

# Create the KV namespace for rate limiting
wrangler kv namespace create QUOTA_KV
# Copy the output id into wrangler.toml -> [[kv_namespaces]] -> id = "..."
```

Edit `wrangler.toml`:
- Set `ALLOWED_TELEGRAM_USER_IDS` to the comma-separated user IDs from step 2
- Set `DAILY_ISSUE_LIMIT` (default: `"5"`, or `"0"` to pause)
- Paste the KV namespace id

```bash
# Set secrets
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_WEBHOOK_SECRET   # the WEBHOOK_SECRET from step 3
wrangler secret put NOTIFY_SECRET              # the NOTIFY_SECRET from step 3
wrangler secret put GITHUB_TOKEN               # the PAT from step 4

# Deploy
wrangler deploy
```

Note the deployed URL (e.g. `https://votevega-telegram-issue-bot.<subdomain>.workers.dev`).

### 6. Register the Telegram webhook

```bash
# Replace <BOT_TOKEN>, <WORKER_URL>, and <WEBHOOK_SECRET> with your values
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<WORKER_URL>/webhook",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

You should get `{"ok":true,"result":true}`.

### 7. Set GitHub repo secrets

These let the aider GitHub Action notify the Telegram bot when a PR is ready:

```bash
cd /path/to/votevega-website

# The worker URL from step 5
gh secret set TELEGRAM_BOT_WORKER_URL
# Paste: https://votevega-telegram-issue-bot.<subdomain>.workers.dev

# The NOTIFY_SECRET from step 3 (same value as the worker's NOTIFY_SECRET)
gh secret set TELEGRAM_NOTIFY_SECRET
```

The following should already be set from the aider workflow setup:
```bash
gh secret set OPENROUTER_API_KEY   # if not already set
```

### 8. Test

1. Message the bot on Telegram: "Test issue please ignore"
2. Check that a GitHub issue is created
3. Watch the GitHub Action run in the Actions tab
4. Confirm the bot sends back the PR link and deploy preview URL

---

## Redeployment

After making code changes to the worker:

```bash
cd workers/telegram-issue-bot
wrangler deploy
```

That's it. Secrets, KV data, and the Telegram webhook persist across deploys.

---

## Configuration Changes (no redeploy needed)

These can be changed in the Cloudflare dashboard under Workers > votevega-telegram-issue-bot > Settings > Variables:

- **DAILY_ISSUE_LIMIT** - Change per-user daily limit. Set to `"0"` to pause all users.
- **ALLOWED_TELEGRAM_USER_IDS** - Add/remove authorized users

Or redeploy after editing `wrangler.toml`:
```bash
wrangler deploy
```

---

## Common Operations

### Pause all issue creation
Set `DAILY_ISSUE_LIMIT = "0"` in wrangler.toml and redeploy, or change it in the Cloudflare dashboard.

### Reset a user's daily quota
```bash
# Replace <KV_ID> with the id from wrangler.toml and <USER_ID> with the Telegram user ID
wrangler kv key delete --namespace-id=<KV_ID> "quota:<USER_ID>"
```

### Add a new staffer
1. Have them message @userinfobot to get their Telegram user ID
2. Add it to `ALLOWED_TELEGRAM_USER_IDS` in wrangler.toml (comma-separated)
3. Redeploy: `wrangler deploy`

### Remove a staffer
Remove their ID from `ALLOWED_TELEGRAM_USER_IDS` and redeploy.

### Change the LLM model
Edit `.github/workflows/aider-issue-to-pr.yml`, update the `model:` field in the "Run aider" step.

### View worker logs
```bash
cd workers/telegram-issue-bot
wrangler tail
```

### Check webhook status
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---

## Secrets Reference

| Secret | Where | Purpose |
|--------|-------|---------|
| `TELEGRAM_BOT_TOKEN` | Cloudflare Worker | Authenticate with Telegram API |
| `TELEGRAM_WEBHOOK_SECRET` | Cloudflare Worker | Verify incoming requests are from Telegram |
| `NOTIFY_SECRET` | Cloudflare Worker | Verify incoming requests from GitHub Actions |
| `GITHUB_TOKEN` | Cloudflare Worker | Create GitHub issues via API |
| `OPENROUTER_API_KEY` | GitHub repo secret | LLM API access for aider |
| `TELEGRAM_BOT_WORKER_URL` | GitHub repo secret | Worker URL for PR notifications |
| `TELEGRAM_NOTIFY_SECRET` | GitHub repo secret | Must match worker's `NOTIFY_SECRET` |
