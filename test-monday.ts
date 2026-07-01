// test-monday.ts — run with: npx tsx -r dotenv/config test-monday.ts
import { getActiveIssues, formatIssuesForPrompt } from "./lib/linear";
import { generateMondaySummary } from "./lib/summarize";
import { postAsDraft } from "./lib/slack";

async function main() {
  console.log("Fetching issues from Linear...");
  const data = await getActiveIssues();
  const issues = data.team.issues.nodes;
  console.log(`${issues.length} issues fetched.`);

  console.log("Generating summary with Claude...");
  const issuesText = formatIssuesForPrompt(issues);
  const summary = await generateMondaySummary(issuesText);
  console.log("\n=== Summary ===\n");
  console.log(summary);

  console.log("\nSending to Slack DM...");
  const channelId = process.env.SLACK_PRODUCT_CHANNEL_ID!;
  await postAsDraft(channelId, summary);
}

main().catch(console.error);
