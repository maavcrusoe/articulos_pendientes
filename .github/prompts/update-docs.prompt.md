---
description: "Update project documentation after code changes — routes, env vars, dependencies, tasks"
argument-hint: "What changed, e.g. 'added /api/stats endpoint' or 'added REDIS_URL env var'"
agent: "agent"
tools: [read, search, edit]
---
Update the project documentation to reflect recent changes.

## What changed: $input

## Steps

1. Determine which doc files need updating based on the change type:

   | Change type | Files to update |
   |-------------|----------------|
   | New route / endpoint | `docs/develop.md` |
   | New env variable | `README.md`, `docs/setup.md` |
   | New npm dependency | `docs/install.md` |
   | New scheduled task | `docs/synctasks.md`, `docs/develop.md` |
   | Infrastructure change | `docs/infrastructure.md`, `docs/docker.md`, `docs/start.md` |
   | Docker / deploy change | `docs/docker.md`, `docs/start.md` |
   | MongoDB schema change | `docs/mongo.md` |

2. Read the relevant source file(s) to confirm the exact details (route path, env var name, package name).
3. Read the doc file(s) to understand existing structure and format.
4. Make minimal, targeted edits — add to existing tables/lists rather than rewriting sections.
5. Keep code blocks accurate and consistent with existing style.

## Constraints
- Do NOT modify `CHANGELOG.md` (use `/update-changelog` for that).
- Do NOT document features not yet implemented.
- Do NOT change the README title, badges, or top-level structure.

## Output

List each doc file updated and describe what was added.
