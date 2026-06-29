// lib/summarize.ts
// Calls Claude API to generate Slack-ready summaries

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Monday Summary ───────────────────────────────────────────────────────────

export async function generateMondaySummary(issuesText: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are writing a Monday morning standup summary for the #product Slack channel at Enigma Labs, a UAP/UFO sighting platform. The audience is the product and engineering team.

Your summary should:
- Be conversational and energetic, not robotic
- Open with a one-sentence framing of the week ahead
- Group issues by theme or area (e.g. iOS, Android, Backend, BB8, Counter-UAS) — infer groupings from labels and issue titles
- For each group, briefly describe what the team is working on in plain English — no issue IDs in the final message
- Highlight any blockers or high-priority items
- Close with a brief rallying note
- Use Slack formatting: *bold* for section headers, bullet points with hyphens
- Keep it under 300 words total

Here are the current active issues from Linear:

${issuesText}

Write the Slack message now. Do not include any preamble or explanation — just the message itself.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text;
}

// ─── Thursday Digest ──────────────────────────────────────────────────────────

export async function generateThursdayDigest(
  readyForReleaseText: string,
  releasedText: string
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are writing a Thursday end-of-day digest for the #product Slack channel at Enigma Labs, a UAP/UFO sighting platform. The audience is the product and engineering team.

Your digest should:
- Open with a brief "end of week" framing
- Have two clear sections:
  1. *Ready for Release* — issues staged and waiting to ship
  2. *Released This Week* — issues already shipped since Monday
- For each issue, write a brief one-line description in plain English (no issue IDs, no jargon)
- If either section is empty, note it gracefully (e.g. "Nothing new staged for release yet")
- Close with a short forward-looking note about what's coming next week if there are items in Ready for Release
- Use Slack formatting: *bold* for section headers, bullet points with hyphens
- Keep it under 250 words total

Issues that moved to Ready for Release since Monday:
${readyForReleaseText}

Issues that moved to Released since Monday:
${releasedText}

Write the Slack message now. Do not include any preamble or explanation — just the message itself.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text;
}
