// lib/linear.ts
// Handles all Linear GraphQL queries for the standup bot

const LINEAR_API_URL = "https://api.linear.app/graphql";

interface LinearIssue {
  id: string;
  title: string;
  identifier: string;
  priority: number;
  priorityLabel: string;
  state: {
    name: string;
    type: string;
  };
  assignee?: {
    name: string;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
  updatedAt: string;
}

interface LinearResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

async function linearQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.LINEAR_API_KEY!,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as LinearResponse<T>;

  if (json.errors?.length) {
    throw new Error(`Linear GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  return json.data;
}

// ─── Monday Query ────────────────────────────────────────────────────────────
// Fetches all active issues for the weekly standup summary

const ACTIVE_ISSUES_QUERY = `
  query ActiveIssues($teamId: String!) {
    team(id: $teamId) {
      name
      issues(
        filter: {
          state: {
            type: {
              in: ["started", "inProgress", "inReview", "blocked"]
            }
          }
        }
        orderBy: priority
      ) {
        nodes {
          id
          title
          identifier
          priority
          priorityLabel
          state {
            name
            type
          }
          assignee {
            name
          }
          labels {
            nodes {
              name
            }
          }
          updatedAt
        }
      }
    }
  }
`;

export interface ActiveIssuesData {
  team: {
    name: string;
    issues: { nodes: LinearIssue[] };
  };
}

export async function getActiveIssues(): Promise<ActiveIssuesData> {
  return linearQuery<ActiveIssuesData>(ACTIVE_ISSUES_QUERY, {
    teamId: process.env.LINEAR_TEAM_ID!,
  });
}

// ─── Thursday Query ───────────────────────────────────────────────────────────
// Fetches issues that moved to Ready for Release or Released since Monday

const RELEASED_ISSUES_QUERY = `
  query ReleasedIssues($teamId: String!, $since: DateComparator!) {
    team(id: $teamId) {
      name
      readyForRelease: issues(
        filter: {
          state: { name: { eq: "Ready for Release" } }
          updatedAt: $since
        }
        orderBy: updatedAt
      ) {
        nodes {
          id
          title
          identifier
          priority
          priorityLabel
          assignee {
            name
          }
          labels {
            nodes {
              name
            }
          }
          updatedAt
        }
      }
      released: issues(
        filter: {
          state: { name: { eq: "Released" } }
          updatedAt: $since
        }
        orderBy: updatedAt
      ) {
        nodes {
          id
          title
          identifier
          priority
          priorityLabel
          assignee {
            name
          }
          labels {
            nodes {
              name
            }
          }
          updatedAt
        }
      }
    }
  }
`;

export interface ReleasedIssuesData {
  team: {
    name: string;
    readyForRelease: { nodes: LinearIssue[] };
    released: { nodes: LinearIssue[] };
  };
}

export async function getReleasedIssues(since: Date): Promise<ReleasedIssuesData> {
  return linearQuery<ReleasedIssuesData>(RELEASED_ISSUES_QUERY, {
    teamId: process.env.LINEAR_TEAM_ID!,
    since: { gte: since.toISOString() },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Returns the most recent Monday at midnight ET
export function getMondayMidnight(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysBack);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Formats an issue list into a readable string for the Claude prompt
export function formatIssuesForPrompt(issues: LinearIssue[]): string {
  if (!issues.length) return "None";

  return issues
    .map((issue) => {
      const assignee = issue.assignee?.name ?? "Unassigned";
      const labels = issue.labels.nodes.map((l) => l.name).join(", ") || "No label";
      return `- [${issue.identifier}] ${issue.title} | ${issue.state.name} | Assignee: ${assignee} | Labels: ${labels} | Priority: ${issue.priorityLabel}`;
    })
    .join("\n");
}
