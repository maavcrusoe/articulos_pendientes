---
name: self-improve
description: "Use when discovering new patterns, gotchas, or conventions in this codebase that should be remembered for future sessions. Invoke after: fixing a subtle bug, discovering an undocumented behavior, learning a new project convention, or completing a complex implementation."
---

# Self-Improvement Skill

This skill updates the repository memory with new patterns, pitfalls, and conventions discovered during development sessions.

## When to Invoke

- After fixing a bug that revealed a non-obvious project behavior
- After discovering a pattern not documented in AGENTS.md or copilot-instructions.md
- After completing a complex feature that established a new convention
- After finding a gotcha in the DB schema, Notion API, or task scheduler
- After resolving a security concern

## Process

### Step 1: Read Current Memory
Read `/memories/repo/deployment.md` and any other existing repo memory files to understand what's already recorded.

### Step 2: Identify What's New
Determine what was learned this session that is:
- Not already in `/memories/repo/`
- Not already in `AGENTS.md` or `.github/copilot-instructions.md`
- Likely to be useful in future sessions

### Step 3: Categorize the Knowledge

| Category | Memory file |
|----------|------------|
| Deployment & infrastructure | `/memories/repo/deployment.md` |
| DB patterns & gotchas | `/memories/repo/database.md` |
| Security patterns | `/memories/repo/security.md` |
| Task/scheduler patterns | `/memories/repo/tasks.md` |
| Frontend/EJS patterns | `/memories/repo/frontend.md` |
| General project gotchas | `/memories/repo/gotchas.md` |

### Step 4: Write the Memory

Use the memory tool to `create` or `str_replace` the relevant file:

- Keep entries **short** — one to three bullet points per discovery
- Include the file/function name where the pattern lives
- Include the "why" not just the "what"
- Tag with `[YYYY-MM-DD]` if the date matters for deprecation tracking

Example entry:
```markdown
## MongoDB Upsert Behavior
- `findOneAndUpdate` with `upsert: false` returns `null` (not an error) when document not found — check return value explicitly
- [2026-05] Discovered when implementing view counter in src/routes/api.js
```

### Step 5: Update AGENTS.md or copilot-instructions.md (if warranted)

If the discovery is a **project-wide convention** that every future session must know:
1. Add it to `.github/copilot-instructions.md` under the relevant section
2. Keep it brief — one bullet point

If it's implementation detail specific to one subsystem:
- Keep it in the repo memory file only

## Output

List which memory files were updated and what was added.
