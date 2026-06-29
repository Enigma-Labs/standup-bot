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
- Open with a warm greeting along the lines of "Good morning! Hope everyone had a great weekend."
- Follow immediately with one sentence explaining that this is a summary of what Engineering is currently working on
- Group issues by their Project field exactly as it appears in the data — do not invent, rename, or infer project names. If an issue has no project, group it under *General*
- For each issue, describe its status factually using phrases like "in progress", "in code review", "in QA", or "blocked" — do not editorialize or imply proximity to completion
- Do not comment on any individual engineer's workload
- Do not use motivational language such as "let's close out strong", "nearly there", "close to landing", or similar
- Close with: "Looking forward to a great week. Let me know if you have any questions." or a close equivalent
- Use Slack formatting: *bold* for section headers (project names), bullet points with hyphens
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
