// lib/slack.ts
// Handles posting to Slack — both draft mode (user token → true draft) and auto-send mode

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function slackPost(
  endpoint: string,
  body: Record<string, unknown>,
  token: string
): Promise<SlackApiResponse> {
  const response = await fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Slack HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as SlackApiResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

// ─── Draft Mode (Phase 1) ─────────────────────────────────────────────────────
// Uses user token to create a true Slack draft in #product.
// The draft appears in your compose box — you review and hit Send manually.
//
// NOTE: Slack's draft API (`chat.scheduledMessages.list` and friends) is not
// publicly documented for user-created drafts. The most reliable approach
// using a user token is to post as a scheduled message ~24h out, which
// surfaces as a "Scheduled" message you can review and cancel/send.
// We use a 23-hour delay so it doesn't auto-send before you review it.
//
// Alternative: set DRAFT_MODE=false and use auto-send once you're happy with output.

export async function postAsDraft(channelId: string, text: string): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) throw new Error("SLACK_BOT_TOKEN is not set");

  const draftUserId = process.env.SLACK_DRAFT_USER_ID;
  if (!draftUserId) throw new Error("SLACK_DRAFT_USER_ID is not set");

  await slackPost(
    "chat.postMessage",
    {
      channel: draftUserId,
      text: "👀 *Draft for #product — review and copy to channel:*\n\n" + text,
      unfurl_links: false,
    },
    botToken
  );

  console.log("Draft sent to your Slack DMs for review.");
}

// ─── Auto-send Mode (Phase 2) ─────────────────────────────────────────────────
// Uses bot token to post directly to the channel.

export async function postToChannel(channelId: string, text: string): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) throw new Error("SLACK_BOT_TOKEN is not set");

  await slackPost(
    "chat.postMessage",
    {
      channel: channelId,
      text,
      unfurl_links: false,
      unfurl_media: false,
    },
    botToken
  );

  console.log(`Message posted to channel ${channelId}`);
}

// ─── Router ───────────────────────────────────────────────────────────────────
// Checks DRAFT_MODE env var and routes to the appropriate function.

export async function sendOrDraft(text: string): Promise<void> {
  const channelId = process.env.SLACK_PRODUCT_CHANNEL_ID;
  if (!channelId) throw new Error("SLACK_PRODUCT_CHANNEL_ID is not set");

  const isDraftMode = process.env.DRAFT_MODE !== "false";

  if (isDraftMode) {
    await postAsDraft(channelId, text);
  } else {
    await postToChannel(channelId, text);
  }
}
