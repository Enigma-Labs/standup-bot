// api/monday-summary.ts
// Vercel cron job — fires Monday at 9:00am ET (14:00 UTC)
// Reads active Linear issues → summarizes with Claude → posts/drafts to Slack #product

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getActiveIssues, formatIssuesForPrompt } from "../lib/linear";
import { generateMondaySummary } from "../lib/summarize";
import { sendOrDraft } from "../lib/slack";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this request is coming from Vercel's cron scheduler
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("[monday-summary] Starting Monday standup job...");

    // 1. Fetch active issues from Linear
    const linearData = await getActiveIssues();
    const issues = linearData.team.issues.nodes;
    console.log(`[monday-summary] Fetched ${issues.length} active issues from Linear`);

    if (issues.length === 0) {
      console.log("[monday-summary] No active issues found — skipping Slack post");
      return res.status(200).json({ message: "No active issues, nothing posted" });
    }

    // 2. Format issues for the Claude prompt
    const issuesText = formatIssuesForPrompt(issues);

    // 3. Generate summary with Claude
    console.log("[monday-summary] Generating summary with Claude...");
    const summary = await generateMondaySummary(issuesText);
    console.log("[monday-summary] Summary generated");

    // 4. Post to Slack (draft or auto-send depending on DRAFT_MODE)
    await sendOrDraft(summary);
    console.log("[monday-summary] Done ✓");

    return res.status(200).json({
      success: true,
      issueCount: issues.length,
      draftMode: process.env.DRAFT_MODE !== "false",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[monday-summary] Error:", message);
    return res.status(500).json({ error: message });
  }
}
