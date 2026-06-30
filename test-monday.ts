// test-monday.ts — run with: npx tsx --env-file=.env test-monday.ts
import { getActiveIssues, formatIssuesForPrompt } from "./lib/linear";
import { generateMondaySummary } from "./lib/summarize";

async function main() {
  const data = await getActiveIssues();
  const issues = data.team.issues.nodes;

  console.log(`=== ${issues.length} issues pulled from Linear ===\n`);
  const issuesText = formatIssuesForPrompt(issues);
  console.log(issuesText);

  console.log("\n=== Monday Summary ===\n");
  const summary = await generateMondaySummary(issuesText);
  console.log(summary);
}

main().catch(console.error);
