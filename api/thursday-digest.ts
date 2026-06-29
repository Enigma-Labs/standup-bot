// api/thursday-digest.ts
// Vercel cron job — fires Thursday at 4:30pm ET (20:30 UTC)
// Reads Linear issues that moved to Ready for Release or Released since Monday
// → summarizes with Claude → posts/drafts to Slack #product

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getReleasedIssues, getMondayMidnight, formatIssuesForPrompt } from "../lib/linear";
import { generateThursdayDigest } from "../lib/summarize";
import { sendOrDraft } from "../lib/slack";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this request is coming from Vercel's cron scheduler
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("[thursday-digest] Starting Thursday digest job...");

    // 1. Get Monday midnight as the "since" cutoff
    const since = getMondayMidnight();
    console.log(`[thursday-digest] Fetching issues updated since ${since.toISOString()}`);

    // 2. Fetch issues from Linear
    const linearData = await getReleasedIssues(since);
    const readyIssues = linearData.team.readyForRelease.nodes;
    const releasedIssues = linearData.team.released.nodes;

    console.log(
      `[thursday-digest] Found ${readyIssues.length} ready for release, ${releasedIssues.length} released`
    );

    // 3. Format issues for Claude prompt
    const readyText = formatIssuesForPrompt(readyIssues);
    const releasedText = formatIssuesForPrompt(releasedIssues);

    // 4. Generate digest with Claude
    console.log("[thursday-digest] Generating digest with Claude...");
    const digest = await generateThursdayDigest(readyText, releasedText);
    console.log("[thursday-digest] Digest generated");

    // 5. Post to Slack (draft or auto-send depending on DRAFT_MODE)
    await sendOrDraft(digest);
    console.log("[thursday-digest] Done ✓");

    return res.status(200).json({
      success: true,
      readyForReleaseCount: readyIssues.length,
      releasedCount: releasedIssues.length,
      draftMode: process.env.DRAFT_MODE !== "false",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[thursday-digest] Error:", message);
    return res.status(500).json({ error: message });
  }
}
