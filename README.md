# Enigma Standup Bot

Automated Linear → Slack standup summaries for the Enigma Labs engineering team.

- **Monday 9am ET** — reads active Linear issues, generates a weekly kickoff summary, posts to #product
- **Thursday 4:30pm ET** — reads issues that moved to Ready for Release or Released since Monday, posts a digest to #product

Powered by Linear GraphQL API, Claude (claude-sonnet-4-6), and Slack. Deployed on Vercel.

---

## How it works

```
Vercel Cron
  → api/monday-summary.ts or api/thursday-digest.ts
  → lib/linear.ts       (fetch issues via GraphQL)
  → lib/summarize.ts    (generate summary via Claude API)
  → lib/slack.ts        (post draft or send to #product)
```

**Draft mode (Phase 1):** Uses your Slack user token to schedule the message 23 hours out.
It appears as a scheduled message in #product — you review it and hit Send (or cancel) manually.

**Auto-send mode (Phase 2):** Set `DRAFT_MODE=false` in Vercel env vars.
The bot posts directly to #product as itself.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/enigmalabs/standup-bot.git
cd standup-bot
npm install
```

### 2. Get your API keys

Copy `.env.example` to `.env` and fill in each value:

```bash
cp .env.example .env
```

**LINEAR_API_KEY**
Go to Linear → Settings → API → Personal API Keys → Create key

**LINEAR_TEAM_ID**
Run this curl to find your Engineering team ID:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: YOUR_LINEAR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ teams { nodes { id name } } }"}'
```

**SLACK_BOT_TOKEN + SLACK_USER_TOKEN**
See Slack App Setup below.

**ANTHROPIC_API_KEY**
Go to console.anthropic.com → Settings → API Keys → Create key

**CRON_SECRET**
Any random string — used to secure cron endpoints.
Generate one: `openssl rand -hex 32`

---

### 3. Slack App Setup

1. Go to https://api.slack.com/apps → Create New App → From scratch
2. Name it "Enigma Standup Bot", select your Enigma workspace
3. Under **OAuth & Permissions**, add these scopes:

   **Bot Token Scopes:**
   - `chat:write`
   - `channels:read`

   **User Token Scopes:**
   - `chat:write` (needed for draft/scheduled messages)

4. Install the app to your workspace
5. Copy the **Bot User OAuth Token** (`xoxb-...`) → `SLACK_BOT_TOKEN`
6. Copy the **User OAuth Token** (`xoxp-...`) → `SLACK_USER_TOKEN`
7. Invite the bot to #product: `/invite @enigma-standup-bot`

**Finding channel IDs:**
Right-click any channel in Slack → View channel details → scroll to the bottom to find the ID (starts with `C`).

---

### 4. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Link to Vercel project
vercel link

# Add all env vars to Vercel
vercel env add LINEAR_API_KEY
vercel env add LINEAR_TEAM_ID
vercel env add SLACK_BOT_TOKEN
vercel env add SLACK_USER_TOKEN
vercel env add SLACK_PRODUCT_CHANNEL_ID
vercel env add ANTHROPIC_API_KEY
vercel env add CRON_SECRET
vercel env add DRAFT_MODE   # set to "true" to start

# Deploy
vercel deploy --prod
```

Vercel will automatically pick up the cron schedules from `vercel.json`.

---

### 5. Test manually

Once deployed, you can trigger either job manually via curl:

```bash
# Monday summary
curl -X GET https://your-project.vercel.app/api/monday-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Thursday digest
curl -X GET https://your-project.vercel.app/api/thursday-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Cron schedule

| Job | Schedule | UTC | ET |
|-----|----------|-----|-----|
| monday-summary | `0 14 * * 1` | 14:00 Mon | 9:00am ET Mon |
| thursday-digest | `30 20 * * 4` | 20:30 Thu | 4:30pm ET Thu |

> Note: Vercel free tier supports cron jobs. Hobby plan runs crons once per day max;
> Pro plan supports the full schedule above. Check your plan at vercel.com/dashboard.

---

## Switching from draft to auto-send

When you're happy with the output quality, flip the toggle in Vercel:

```bash
vercel env rm DRAFT_MODE
vercel env add DRAFT_MODE   # enter "false"
vercel deploy --prod
```

---

## File structure

```
standup-bot/
├── api/
│   ├── monday-summary.ts      # Monday 9am cron handler
│   └── thursday-digest.ts     # Thursday 4:30pm cron handler
├── lib/
│   ├── linear.ts              # Linear GraphQL queries + helpers
│   ├── summarize.ts           # Claude API calls + prompts
│   └── slack.ts               # Slack post/draft logic
├── vercel.json                # Cron schedule config
├── .env.example               # Keys you need to fill in
├── package.json
└── tsconfig.json
```

---

## Prompt tuning

The Claude prompts live in `lib/summarize.ts`. Both `generateMondaySummary` and
`generateThursdayDigest` have detailed system prompts you can edit to change tone,
format, word count, or grouping logic. No code changes needed — just update the
prompt strings and redeploy.
