---
inclusion: manual
---

# Git Workflow: PR Raising Instructions

When the user asks to "raise a PR" or "create a PR" or "push changes", follow these steps exactly.

## Step 1: Identify Completed Tasks

Read `c:\Projects\crediq\.kiro\specs\card-manager\tasks.md` and find the most recently completed task(s) — these are lines marked with `[x]`. Focus on the task(s) that were just completed (i.e., newly checked off since the last PR).

## Step 2: Derive Branch Name

Create a branch name based on the nature of the completed task using this format:

```
feat/<short-kebab-description>
```

Examples based on task types:
- Data models → `feat/data-models`
- Validator service → `feat/validator-service`
- Encryption service → `feat/encryption-service`
- Card store / config store → `feat/storage-services`
- Statistics service → `feat/statistics-service`
- Routing and CSS → `feat/routing-and-styles`
- Card list view → `feat/card-list-view`
- Card form view → `feat/card-form-view`
- Card detail view → `feat/card-detail-view`
- Settings / about views → `feat/settings-about-views`
- Calendar / stats views → `feat/calendar-stats-views`
- Master password / security → `feat/security-and-auth`
- Tag management → `feat/tag-management`
- Shared limits → `feat/shared-limits`
- Performance / compatibility → `feat/performance-optimizations`
- Final wiring / integration → `feat/app-integration`

For bug fixes use `fix/<short-description>`, for chores use `chore/<short-description>`.

## Step 3: Create Branch and Stage Changes

Run the following commands in sequence:

```bash
git checkout -b <branch-name>
git add -A
```

## Step 4: Commit

Write a commit message in conventional commit format:

```
feat(<scope>): <short description of what was implemented>
```

Where `<scope>` is a short noun describing the area (e.g., `validator`, `encryption`, `card-store`, `ui`).

Example:
```bash
git commit -m "feat(validator): implement luhn check and form validation service"
```

## Step 5: Push to Remote

```bash
git push -u origin <branch-name>
```

## Full Command Sequence Example

```bash
git checkout -b feat/validator-service
git add -A
git commit -m "feat(validator): implement luhn check and form validation service"
git push -u origin feat/validator-service
```

## Notes

- Always base new branches off the current `main` (or `master`) branch unless the user specifies otherwise.
- If there are multiple tasks completed since the last PR, group them under a single branch that reflects the overall theme.
- If unsure about the branch name, ask the user before proceeding.
- Do not force-push unless explicitly asked.
