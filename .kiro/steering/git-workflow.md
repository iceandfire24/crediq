---
inclusion: manual
---

# Git Workflow: PR Raising Instructions

When the user asks to "raise a PR" or "create a PR" or "push changes", follow these steps exactly.

## Step 1: Identify Completed Tasks

Read `c:\Projects\crediq\.kiro\specs\card-manager\tasks.md` and find the most recently completed task(s) — these are lines marked with `[x]`. Focus on the task(s) that were just completed (i.e., newly checked off since the last PR).

A PR should cover all subtasks under a parent task together. For example, if task 8 has subtasks 8.1 and 8.2, both should be included in the same PR — not separate ones. Group by the parent task number when naming the branch and writing the commit.

The branch name must always be derived from the **parent task's title**, not the subtask title. For example, if subtask 9.4 belongs to parent task "9. Implement reminder and search controllers", the branch name is `feat/implement-reminder-and-search-controllers`.

## Step 2: Derive Branch Name

Use the parent task's title directly as the branch name, converted to kebab-case:

```
feat/<parent-task-title-in-kebab-case>
```

For example, if the parent task is "8. Implement statistics service", the branch name is `feat/implement-statistics-service`.

For bug fixes use `fix/<parent-task-title-in-kebab-case>`, for chores use `chore/<parent-task-title-in-kebab-case>`.

## Step 3: Create Branch and Stage Changes

Run the following commands in sequence:

```bash
git checkout -b <branch-name>
git add -A
```

## Step 4: Commit

Write a commit message in conventional commit format that covers all subtasks completed under the parent task:

```
feat(<scope>): <short description covering all subtasks>
```

Where `<scope>` is a short noun describing the area (e.g., `validator`, `encryption`, `statistics`, `ui`).

When multiple subtasks are included, list them in the commit body:

```bash
git commit -m "feat(statistics): implement statistics service and property tests

- 8.1: calculateOverallStats, calculateNetworkStats, calculateBankStats, calculateTotalCreditLimit, calculateAverageAge, findExpiringCards
- 8.2: property tests for card count, annual fees, shared limit deduplication, network grouping, average age (Properties 25-29)"
```

## Step 5: Push to Remote

```bash
git push -u origin <branch-name>
```

## Step 6: Determine Base Branch

Determine the correct base branch for the PR description:

1. Run `git log --oneline -20` to see recent history.
2. The base branch is the branch that was active when the feature branch was created — typically the previous feature branch if tasks are sequential, or `dev`/`main` if starting fresh.
3. If the previous task's branch has already been merged into `dev`, the base is `dev`. If not yet merged, the base is the previous task's branch.
4. When in doubt, run `git branch -r` to see remote branches and infer the correct base.

## Step 7: Output PR Description

Do NOT run `gh pr create`. Instead, output the PR description as a markdown code block so the user can paste it directly. Include the base branch and title above the block.

**Output format:**

> Branch: `<current-branch>` → base: `<base-branch>`
> Title: `feat: <short title matching the branch theme>`

```markdown
## Summary

<1-2 sentence overview of what this PR implements>

## Tasks Completed

| Subtask | Description |
|---------|-------------|
| X.1 | <what was implemented> |
| X.2 | <what was implemented> |

## Key Changes

- `<file>` — <what changed>
- `<file>` — <what changed>

## Properties / Tests

| Property | Description | Requirements |
|----------|-------------|--------------|
| N | <property name> | <req IDs> |

## Testing

\`\`\`bash
npx vitest run <test file path>
\`\`\`
```

## Step 8: After PR is Merged

Once the user confirms the PR has been merged, switch back to the base branch and pull the latest changes:

```bash
git checkout <base-branch>
git pull origin <base-branch>
```

The base branch is whatever was used as the PR base in Step 6.

## Full Command Sequence Example

```bash
# Create branch for task 8 "Implement statistics service" (covers subtasks 8.1 and 8.2)
git checkout -b feat/implement-statistics-service
git add -A
git commit -m "feat(statistics): implement statistics service and property tests

- 8.1: calculateOverallStats, calculateNetworkStats, calculateBankStats, calculateTotalCreditLimit, calculateAverageAge, findExpiringCards
- 8.2: property tests for card count, annual fees, shared limit deduplication, network grouping, average age (Properties 25-29)"
git push -u origin feat/implement-statistics-service

# Determine base branch (e.g. previous task branch or dev if already merged)
# Then output the PR description as a markdown block for the user to paste:
#
# Branch: `feat/implement-statistics-service` → base: `feat/checkpoint-ensure-all-tests-pass`
# Title: `feat: statistics service and property tests (task 8)`
#
# (followed by the markdown description block)

# After PR is merged:
git checkout dev
git pull origin dev
```

## Notes

- Always group all subtasks of a parent task into a single PR — never split subtasks across separate PRs.
- The base branch for a PR is the previous task's branch if it hasn't been merged yet, otherwise use `dev`.
- If unsure about the base branch, run `git branch -r` and check what's available on remote.
- Do not force-push unless explicitly asked.
